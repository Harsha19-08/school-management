import { z } from "zod";
import { body, escapeRegex, pageQuery, paged, query, route } from "@/lib/api/route";
import { conflict } from "@/lib/api/errors";
import { scoped } from "@/lib/authorization/context";
import { Guardian, Student } from "@/models";
import { studentSchema } from "@/features/students/schemas";
import { nextAdmissionNo, nextRollNo, studentDto, studentScope } from "@/features/students/queries";
import { assertSectionInClass } from "@/features/academics/refs";
import { audit } from "@/lib/audit";

export const GET = route({ perm: "student.read" }, async ({ req, ctx }) => {
  const q = query(req, pageQuery.extend({ classId: z.string().optional(), sectionId: z.string().optional(), status: z.string().optional() }));
  const filter: Record<string, unknown> = await studentScope(ctx);
  if (q.classId) filter.classId = q.classId;
  if (q.sectionId) filter.sectionId = q.sectionId;
  if (q.status) filter.status = q.status;
  if (q.q) { const rx = new RegExp(escapeRegex(q.q), "i"); filter.$or = [{ firstName: rx }, { lastName: rx }, { admissionNo: rx }]; }
  const sortKey = ({ name: "firstName", admissionNo: "admissionNo", rollNo: "rollNo", status: "status" } as Record<string, string>)[q.sort ?? ""] ?? "firstName";
  const [items, total] = await Promise.all([Student.find(filter).sort({ [sortKey]: q.dir === "desc" ? -1 : 1, _id: 1 }).skip((q.page - 1) * q.pageSize).limit(q.pageSize).lean(), Student.countDocuments(filter)]);
  return paged(items.map(studentDto), total, q.page, q.pageSize);
});

export const POST = route({ perm: "student.write" }, async ({ req, ctx }) => {
  const d = await body(req, studentSchema);
  await assertSectionInClass(ctx, d.classId, d.sectionId);
  const admissionNo = d.admissionNo ?? (await nextAdmissionNo(ctx.schoolId, ctx.schoolSlug));
  if (await Student.exists({ ...scoped(ctx), admissionNo })) throw conflict("That admission number is already in use.");
  const { guardian, ...rest } = d;
  const s = await Student.create({ ...rest, ...scoped(ctx), admissionNo, admissionDate: d.admissionDate ?? new Date(), rollNo: d.rollNo ?? (await nextRollNo(ctx.schoolId, d.sectionId)), history: [{ by: ctx.userId, action: "created" }] });
  if (guardian) {
    try { const g = await Guardian.create({ ...scoped(ctx), ...guardian, studentIds: [s._id] }); void g; } catch (e) { await Student.deleteOne({ _id: s._id }); throw e; }
  }
  await audit(ctx, "student.create", "Student", s._id);
  return { id: String(s._id), admissionNo };
});
