import { z } from "zod";
import { pageQuery, paged, query, route } from "@/lib/api/route";
import { scoped } from "@/lib/authorization/context";
import { Student, StudentFee } from "@/models";
import { netOf } from "@/services/fees";

export const GET = route({ perm: "fee.read" }, async ({ req, ctx }) => {
  const q = query(req, pageQuery.extend({ classId: z.string().optional(), status: z.string().optional(), overdue: z.string().optional(), studentId: z.string().optional() }));
  const f: Record<string, unknown> = { ...scoped(ctx) };
  if (q.status) f.status = q.status;
  if (q.studentId) f.studentId = q.studentId;
  if (q.overdue === "1") { f.dueDate = { $lt: new Date() }; f.status = { $in: ["pending", "partial"] }; }
  if (q.classId || q.q) {
    const sf: Record<string, unknown> = { ...scoped(ctx) };
    if (q.classId) sf.classId = q.classId;
    if (q.q) { const rx = new RegExp(q.q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"); sf.$or = [{ firstName: rx }, { lastName: rx }, { admissionNo: rx }]; }
    f.studentId = { $in: (await Student.find(sf).select("_id").limit(2000).lean()).map((s) => s._id) };
  }
  const [items, total] = await Promise.all([StudentFee.find(f).sort({ dueDate: 1 }).skip((q.page - 1) * q.pageSize).limit(q.pageSize).populate("studentId", "firstName lastName admissionNo").lean(), StudentFee.countDocuments(f)]);
  return paged(items.map((x) => { const s = x.studentId as unknown as { _id: unknown; firstName: string; lastName: string; admissionNo: string } | null; const net = netOf(x); return { id: String(x._id), studentId: s ? String(s._id) : "", student: s ? `${s.firstName} ${s.lastName}` : "—", admissionNo: s?.admissionNo, label: x.label, netPaise: net, paidPaise: x.paidPaise ?? 0, outstandingPaise: Math.max(0, net - (x.paidPaise ?? 0)), concessionPaise: x.concessionPaise ?? 0, dueDate: x.dueDate, status: x.status, overdue: x.dueDate < new Date() && net > (x.paidPaise ?? 0) }; }), total, q.page, q.pageSize);
});
