import { z } from "zod";
import { body, escapeRegex, pageQuery, paged, query, route } from "@/lib/api/route";
import { conflict } from "@/lib/api/errors";
import { scoped } from "@/lib/authorization/context";
import { Admission } from "@/models";
import { admissionSchema } from "@/features/admissions/schemas";
import { dedupeKey } from "@/features/admissions/logic";
import { assertClass } from "@/features/academics/refs";
import { audit } from "@/lib/audit";

const dto = (a: { _id: unknown; applicationNo: string; status: string; student: { firstName: string; lastName: string; gender: string; dob: Date }; guardian: { name: string; phone: string; email?: string | null }; classId: unknown; createdAt?: Date }) => ({
  id: String(a._id), applicationNo: a.applicationNo, status: a.status, studentName: `${a.student.firstName} ${a.student.lastName}`, student: a.student, guardian: a.guardian, classId: String(a.classId), createdAt: a.createdAt,
});

export const GET = route({ perm: "admission.read" }, async ({ req, ctx }) => {
  const q = query(req, pageQuery.extend({ status: z.string().optional(), classId: z.string().optional() }));
  const f: Record<string, unknown> = { ...scoped(ctx) };
  if (q.status) f.status = q.status; if (q.classId) f.classId = q.classId;
  if (q.q) { const rx = new RegExp(escapeRegex(q.q), "i"); f.$or = [{ "student.firstName": rx }, { "student.lastName": rx }, { applicationNo: rx }, { "guardian.name": rx }]; }
  const [items, total] = await Promise.all([Admission.find(f).sort({ createdAt: -1 }).skip((q.page - 1) * q.pageSize).limit(q.pageSize).lean(), Admission.countDocuments(f)]);
  return paged(items.map(dto), total, q.page, q.pageSize);
});

export const POST = route({ perm: "admission.write" }, async ({ req, ctx }) => {
  const d = await body(req, admissionSchema);
  await assertClass(ctx, d.classId);
  const key = dedupeKey({ firstName: d.student.firstName, lastName: d.student.lastName, dob: d.student.dob, guardianName: d.guardian.name });
  const dup = await Admission.findOne({ ...scoped(ctx), dedupeKey: key, status: { $ne: "rejected" } }).select("applicationNo").lean();
  if (dup) throw conflict(`A matching application already exists (${dup.applicationNo}).`);
  const count = await Admission.countDocuments(scoped(ctx));
  const applicationNo = `APP-${new Date().getFullYear()}-${String(count + 1).padStart(4, "0")}-${Math.random().toString(36).slice(2, 5).toUpperCase()}`;
  const status = d.submit ? "submitted" : "draft";
  const a = await Admission.create({ ...scoped(ctx), applicationNo, status, student: d.student, guardian: d.guardian, classId: d.classId, previousSchool: d.previousSchool, dedupeKey: key, history: [{ by: ctx.userId, to: status }] });
  await audit(ctx, "admission.create", "Admission", a._id);
  return { id: String(a._id), applicationNo };
});
