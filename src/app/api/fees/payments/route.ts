import { z } from "zod";
import { body, query, route } from "@/lib/api/route";
import { resolveStudentScope, scoped } from "@/lib/authorization/context";
import { Payment } from "@/models";
import { paymentSchema } from "@/features/fees/schemas";
import { recordPayment } from "@/services/fees";
import { audit } from "@/lib/audit";

/** Staff-recorded payment (cash/bank/cheque). Online payments are never accepted from the client. */
export const POST = route({ perm: "fee.collect" }, async ({ req, ctx }) => {
  const d = await body(req, paymentSchema);
  const r = await recordPayment({ schoolId: ctx.schoolId, feeId: d.feeId, amountPaise: d.amount, mode: d.mode, reference: d.reference, recordedBy: ctx.userId, idempotencyKey: d.idempotencyKey });
  if (!r.duplicate) await audit(ctx, "fee.payment", "Payment", r.payment._id, { amountPaise: d.amount, mode: d.mode });
  return { id: String(r.payment._id), receiptNo: r.payment.receiptNo, duplicate: r.duplicate };
});

/** Ledger for one student (staff) or the caller's own/child's (student/parent). */
export const GET = route({}, async ({ req, ctx }) => {
  const q = query(req, z.object({ studentId: z.string().optional() }));
  const studentId = ctx.role === "student" || ctx.role === "parent" ? await resolveStudentScope(ctx, q.studentId) : await resolveStudentScope(ctx, q.studentId);
  const rows = await Payment.find({ ...scoped(ctx), studentId, status: "success" }).sort({ createdAt: -1 }).limit(200).lean();
  const reversed = new Set(rows.filter((r) => r.kind === "reversal").map((r) => String(r.reversesId)));
  return rows.map((p) => ({ id: String(p._id), kind: p.kind, amountPaise: p.amountPaise, mode: p.mode, receiptNo: p.receiptNo, paidOn: p.paidOn, reference: p.reference, reason: p.reason, reversed: reversed.has(String(p._id)) }));
});
