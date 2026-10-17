import { z } from "zod";
import { query, route } from "@/lib/api/route";
import { badRequest, notFound } from "@/lib/api/errors";
import { scoped } from "@/lib/authorization/context";
import { Payment, Student, StudentFee } from "@/models";
import { isValidDateKey } from "@/lib/dates";
import { rangeSummary } from "@/features/attendance/queries";
import { csvResponse, toCsv } from "@/features/reporting/csv";
import { formatINR } from "@/lib/money";
import { audit } from "@/lib/audit";

const key = z.string().refine(isValidDateKey);
export const GET = route<{ type: string }>({ perm: "report.read" }, async ({ req, ctx, params }) => {
  const q = query(req, z.object({ from: key.optional(), to: key.optional(), classId: z.string().optional() }));
  await audit(ctx, "report.export", "Report", params.type);
  if (params.type === "attendance") {
    if (!q.from || !q.to) throw badRequest("Choose a date range.");
    const sf: Record<string, unknown> = { ...scoped(ctx), status: "active" }; if (q.classId) sf.classId = q.classId;
    const students = await Student.find(sf).sort({ classId: 1, rollNo: 1 }).select("firstName lastName admissionNo").lean();
    const sums = new Map((await rangeSummary(ctx.schoolId, {}, q.from, q.to)).map((r) => [r.studentId, r]));
    return csvResponse("attendance.csv", toCsv(["Admission No", "Student", "Present", "Late", "Absent", "Leave", "Attendance %"], students.map((s) => { const r = sums.get(String(s._id)); return [s.admissionNo, `${s.firstName} ${s.lastName}`, r?.present ?? 0, r?.late ?? 0, r?.absent ?? 0, r?.leave ?? 0, r?.percent ?? "n/a"]; })));
  }
  if (params.type === "fees-outstanding") {
    const fees = await StudentFee.find({ ...scoped(ctx), status: { $in: ["pending", "partial"] } }).sort({ dueDate: 1 }).populate("studentId", "firstName lastName admissionNo").lean();
    return csvResponse("fees-outstanding.csv", toCsv(["Admission No", "Student", "Fee", "Due date", "Net", "Paid", "Outstanding"], fees.map((f) => { const s = f.studentId as unknown as { firstName: string; lastName: string; admissionNo: string } | null; const net = f.amountPaise - (f.concessionPaise ?? 0); return [s?.admissionNo, s ? `${s.firstName} ${s.lastName}` : "", f.label, f.dueDate, formatINR(net), formatINR(f.paidPaise ?? 0), formatINR(net - (f.paidPaise ?? 0))]; })));
  }
  if (params.type === "collections") {
    const f: Record<string, unknown> = { ...scoped(ctx), status: "success" };
    if (q.from && q.to) f.paidOn = { $gte: new Date(q.from + "T00:00:00Z"), $lte: new Date(q.to + "T23:59:59Z") };
    const ps = await Payment.find(f).sort({ paidOn: -1 }).limit(5000).populate("studentId", "firstName lastName admissionNo").lean();
    return csvResponse("collections.csv", toCsv(["Date", "Receipt", "Type", "Student", "Mode", "Amount", "Reference", "Reason"], ps.map((p) => { const s = p.studentId as unknown as { firstName: string; lastName: string } | null; return [p.paidOn, p.receiptNo, p.kind, s ? `${s.firstName} ${s.lastName}` : "", p.mode, (p.kind === "reversal" ? "-" : "") + formatINR(p.amountPaise), p.reference, p.reason]; })));
  }
  throw notFound("Report");
});
