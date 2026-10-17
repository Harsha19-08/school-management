import { body, route } from "@/lib/api/route";
import { notFound } from "@/lib/api/errors";
import { scoped } from "@/lib/authorization/context";
import { Section, Student } from "@/models";
import { transferSchema } from "@/features/students/schemas";
import { nextRollNo } from "@/features/students/queries";
import { audit } from "@/lib/audit";

/** Moves a student to another section (and its class). History keeps the previous placement. */
export const POST = route<{ id: string }>({ perm: "student.write" }, async ({ req, ctx, params }) => {
  const { sectionId, note } = await body(req, transferSchema);
  const [s, target] = await Promise.all([Student.findOne({ _id: params.id, ...scoped(ctx) }), Section.findOne({ _id: sectionId, ...scoped(ctx) }).lean()]);
  if (!s || !target) throw notFound("Student or section");
  const from = s.sectionId;
  s.classId = target.classId; s.sectionId = target._id; s.rollNo = await nextRollNo(ctx.schoolId, sectionId);
  s.history.push({ by: ctx.userId, action: "transferred", fromSectionId: from, toSectionId: target._id, note } as never);
  await s.save();
  await audit(ctx, "student.transfer", "Student", s._id, { to: sectionId });
  return { id: String(s._id) };
});
