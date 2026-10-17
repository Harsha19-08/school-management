import { z } from "zod";
import { body, pageQuery, paged, query, route } from "@/lib/api/route";
import { scoped } from "@/lib/authorization/context";
import { Exam } from "@/models";
import { examSchema } from "@/features/examinations/schemas";
import { assertClass, assertSubject, assertYear } from "@/features/academics/refs";
import { audit } from "@/lib/audit";
import { examDto } from "@/features/examinations/queries";

export const GET = route({ perm: "exam.read", roles: ["super_admin", "school_admin", "teacher"] }, async ({ req, ctx }) => {
  const q = query(req, pageQuery.extend({ classId: z.string().optional(), status: z.string().optional() }));
  const f: Record<string, unknown> = { ...scoped(ctx) };
  if (q.classId) f.classId = q.classId; if (q.status) f.status = q.status;
  const [items, total] = await Promise.all([Exam.find(f).sort({ createdAt: -1 }).skip((q.page - 1) * q.pageSize).limit(q.pageSize).lean(), Exam.countDocuments(f)]);
  return paged(items.map(examDto), total, q.page, q.pageSize);
});

export const POST = route({ perm: "exam.write" }, async ({ req, ctx }) => {
  const d = await body(req, examSchema);
  await assertClass(ctx, d.classId); await assertYear(ctx, d.academicYearId);
  for (const s of d.subjects) await assertSubject(ctx, s.subjectId);
  const e = await Exam.create({ ...d, ...scoped(ctx), status: "draft" });
  await audit(ctx, "exam.create", "Exam", e._id);
  return { id: String(e._id) };
});
