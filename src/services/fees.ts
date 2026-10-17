import { Types } from "mongoose";
import { conflict, notFound, badRequest } from "@/lib/api/errors";
import { Payment, School, StudentFee } from "@/models";
import { computeLateFee } from "@/lib/money";

export type FeeStatus = "pending" | "partial" | "paid" | "waived";
export const netOf = (f: { amountPaise: number; concessionPaise?: number }) => Math.max(0, f.amountPaise - (f.concessionPaise ?? 0));
export function statusOf(f: { amountPaise: number; concessionPaise?: number; paidPaise?: number }): FeeStatus {
  const net = netOf(f); const paid = f.paidPaise ?? 0;
  if (net === 0) return "waived";
  if (paid >= net) return "paid";
  return paid > 0 ? "partial" : "pending";
}

/** Receipt numbers come from an atomic per-school counter, so they are unique and gap-free under concurrency. */
export async function nextReceiptNo(schoolId: string, at = new Date()): Promise<string> {
  const s = await School.findOneAndUpdate({ _id: schoolId }, { $inc: { "counters.receipt": 1 } }, { returnDocument: "after" }).select("counters settings.fees.receiptPrefix").lean();
  if (!s) throw notFound("School");
  const fy = at.getUTCMonth() >= 3 ? at.getUTCFullYear() : at.getUTCFullYear() - 1;
  return `${s.settings?.fees?.receiptPrefix ?? "RCT"}-${fy}-${String(s.counters?.receipt ?? 0).padStart(6, "0")}`;
}

export interface RecordPaymentInput {
  schoolId: string; feeId: string; amountPaise: number; mode: "cash" | "bank_transfer" | "cheque" | "online"; reference?: string;
  recordedBy?: string; idempotencyKey?: string; provider?: { name: string; orderId?: string; paymentId?: string }; paidOn?: Date;
}

/** Appends a payment to the ledger. The conditional $inc prevents overpayment even with concurrent requests. */
export async function recordPayment(i: RecordPaymentInput) {
  if (!Number.isInteger(i.amountPaise) || i.amountPaise <= 0) throw badRequest("Amount must be a positive amount in rupees.");
  if (i.idempotencyKey) {
    const dup = await Payment.findOne({ schoolId: i.schoolId, idempotencyKey: i.idempotencyKey }).lean();
    if (dup) return { payment: dup, duplicate: true };
  }
  const gate = { _id: new Types.ObjectId(i.feeId), schoolId: new Types.ObjectId(i.schoolId) };
  const fee = await StudentFee.findOneAndUpdate(
    { ...gate, $expr: { $lte: [{ $add: ["$paidPaise", i.amountPaise] }, { $subtract: ["$amountPaise", "$concessionPaise"] }] } },
    { $inc: { paidPaise: i.amountPaise } }, { returnDocument: "after" },
  );
  if (!fee) {
    const exists = await StudentFee.exists(gate);
    if (!exists) throw notFound("Fee");
    throw conflict("Amount exceeds the outstanding balance for this fee.");
  }
  try {
    const receiptNo = await nextReceiptNo(i.schoolId, i.paidOn);
    const payment = await Payment.create({ schoolId: i.schoolId, studentId: fee.studentId, feeId: fee._id, kind: "payment", amountPaise: i.amountPaise, mode: i.mode, reference: i.reference, status: "success", receiptNo, paidOn: i.paidOn ?? new Date(), recordedBy: i.recordedBy, provider: i.provider, idempotencyKey: i.idempotencyKey });
    await StudentFee.updateOne(gate, { status: statusOf(fee) });
    return { payment: payment.toObject(), duplicate: false };
  } catch (e) {
    await StudentFee.updateOne(gate, { $inc: { paidPaise: -i.amountPaise } }); // roll the gate back
    throw e;
  }
}

/** Mistakes are corrected by a reversal entry, never by editing or deleting a payment. */
export async function reversePayment(i: { schoolId: string; paymentId: string; reason: string; by: string }) {
  if (!i.reason.trim()) throw badRequest("A reason is required.");
  const orig = await Payment.findOne({ _id: i.paymentId, schoolId: i.schoolId, kind: "payment", status: "success" }).lean();
  if (!orig) throw notFound("Payment");
  let reversal;
  try {
    reversal = await Payment.create({ schoolId: i.schoolId, studentId: orig.studentId, feeId: orig.feeId, kind: "reversal", reversesId: orig._id, amountPaise: orig.amountPaise, mode: orig.mode, status: "success", reason: i.reason.trim(), recordedBy: i.by, paidOn: new Date() });
  } catch (e) {
    if ((e as { code?: number }).code === 11000) throw conflict("This payment has already been reversed.");
    throw e;
  }
  const fee = await StudentFee.findOneAndUpdate({ _id: orig.feeId, schoolId: i.schoolId }, { $inc: { paidPaise: -orig.amountPaise } }, { returnDocument: "after" });
  if (fee) await StudentFee.updateOne({ _id: fee._id }, { status: statusOf(fee) });
  return reversal.toObject();
}

export interface FeeSummary {
  studentId: string; totalPaise: number; paidPaise: number; outstandingPaise: number; overduePaise: number; lateFeeAccruedPaise: number;
  fees: { id: string; label: string; amountPaise: number; concessionPaise: number; netPaise: number; paidPaise: number; outstandingPaise: number; dueDate: Date; status: FeeStatus; overdue: boolean; lateFeePaise: number }[];
}

/** Single contract used by admin, student and parent views so numbers always agree. */
export async function feeSummary(schoolId: string, studentId: string, asOf = new Date()): Promise<FeeSummary> {
  const [fees, school] = await Promise.all([
    StudentFee.find({ schoolId, studentId }).sort({ dueDate: 1 }).lean(),
    School.findById(schoolId).select("settings.fees").lean(),
  ]);
  const cfg = school?.settings?.fees;
  const rows = fees.map((f) => {
    const net = netOf(f); const paid = f.paidPaise ?? 0; const out = Math.max(0, net - paid);
    const overdue = out > 0 && f.dueDate < asOf;
    const lateFeePaise = overdue ? computeLateFee({ dueDate: f.dueDate, asOf, flatPerPeriod: cfg?.lateFeeFlatPaise ?? 0, graceDays: cfg?.lateFeeGraceDays ?? 0, periodDays: cfg?.lateFeePeriodDays ?? 30, cap: cfg?.lateFeeCapPaise ?? undefined }) : 0;
    return { id: String(f._id), label: f.label, amountPaise: f.amountPaise, concessionPaise: f.concessionPaise ?? 0, netPaise: net, paidPaise: paid, outstandingPaise: out, dueDate: f.dueDate, status: statusOf(f), overdue, lateFeePaise };
  });
  const sum = (k: "netPaise" | "paidPaise" | "outstandingPaise") => rows.reduce((a, r) => a + r[k], 0);
  return { studentId, totalPaise: sum("netPaise"), paidPaise: sum("paidPaise"), outstandingPaise: sum("outstandingPaise"), overduePaise: rows.filter((r) => r.overdue).reduce((a, r) => a + r.outstandingPaise, 0), lateFeeAccruedPaise: rows.reduce((a, r) => a + r.lateFeePaise, 0), fees: rows };
}
