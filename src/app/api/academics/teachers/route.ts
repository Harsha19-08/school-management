import { z } from "zod";
import { body, escapeRegex, pageQuery, paged, query, route } from "@/lib/api/route";
import { badRequest } from "@/lib/api/errors";
import { scoped } from "@/lib/authorization/context";
import { Teacher } from "@/models";
import { teacherSchema } from "@/features/academics/teachers";
import { assertSection, assertSubject } from "@/features/academics/refs";
import { createAccount } from "@/services/accounts";
import { audit } from "@/lib/audit";

export const GET = route({ perm: "teacher.read" }, async ({ req, ctx }) => {
  const { page, pageSize, q, sort, dir } = query(req, pageQuery.extend({ all: z.string().optional() }));
  const filter: Record<string, unknown> = { ...scoped(ctx) };
  if (q) filter.$or = [{ name: new RegExp(escapeRegex(q), "i") }, { employeeNo: new RegExp(escapeRegex(q), "i") }];
  const key = ["name", "employeeNo", "status"].includes(sort ?? "") ? sort! : "name";
  const [items, total] = await Promise.all([Teacher.find(filter).sort({ [key]: dir === "desc" ? -1 : 1 }).skip((page - 1) * pageSize).limit(pageSize).lean(), Teacher.countDocuments(filter)]);
  return paged(items.map((t) => ({ id: String(t._id), name: t.name, employeeNo: t.employeeNo, email: t.email, phone: t.phone, status: t.status, hasAccount: !!t.userId, assignments: t.assignments.map((a: { subjectId: unknown; sectionId: unknown }) => ({ subjectId: String(a.subjectId), sectionId: String(a.sectionId) })) })), total, page, pageSize);
});

export const POST = route({ perm: "teacher.write" }, async ({ req, ctx }) => {
  const d = await body(req, teacherSchema);
  for (const a of d.assignments) { await assertSubject(ctx, a.subjectId); await assertSection(ctx, a.sectionId); }
  if (d.createAccount && !d.email) throw badRequest("An email is required to create a login.");
  const t = await Teacher.create({ ...scoped(ctx), name: d.name, employeeNo: d.employeeNo, email: d.email, phone: d.phone, qualification: d.qualification, assignments: d.assignments });
  let activationPath: string | null = null;
  if (d.createAccount && d.email) {
    try {
      const acc = await createAccount({ schoolId: ctx.schoolId, role: "teacher", name: d.name, email: d.email, link: { teacherId: String(t._id) } });
      await Teacher.updateOne({ _id: t._id }, { userId: acc.userId });
      activationPath = acc.activationPath;
    } catch (e) { await Teacher.deleteOne({ _id: t._id }); throw e; }
  }
  await audit(ctx, "teacher.create", "Teacher", t._id);
  return { id: String(t._id), activationPath };
});
