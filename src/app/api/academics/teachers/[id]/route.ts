import { body, route } from "@/lib/api/route";
import { notFound } from "@/lib/api/errors";
import { scoped } from "@/lib/authorization/context";
import { Membership, Teacher, User } from "@/models";
import { teacherUpdateSchema } from "@/features/academics/teachers";
import { assertSection, assertSubject } from "@/features/academics/refs";
import { audit } from "@/lib/audit";

export const PATCH = route<{ id: string }>({ perm: "teacher.write" }, async ({ req, ctx, params }) => {
  const d = await body(req, teacherUpdateSchema);
  for (const a of d.assignments ?? []) { await assertSubject(ctx, a.subjectId); await assertSection(ctx, a.sectionId); }
  const t = await Teacher.findOneAndUpdate({ _id: params.id, ...scoped(ctx) }, { $set: d }, { returnDocument: "after" });
  if (!t) throw notFound("Teacher");
  if (d.status && t.userId) {
    await Membership.updateOne({ userId: t.userId, schoolId: ctx.schoolId, role: "teacher" }, { active: d.status === "active" });
    if (d.status === "inactive") await User.updateOne({ _id: t.userId }, { $inc: { tokenVersion: 1 } }); // sign them out everywhere
  }
  await audit(ctx, "teacher.update", "Teacher", t._id);
  return { id: String(t._id) };
});
