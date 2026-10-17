import { z } from "zod";
import { body, route } from "@/lib/api/route";
import { conflict, notFound } from "@/lib/api/errors";
import { scoped } from "@/lib/authorization/context";
import { Assignment, Student, Submission } from "@/models";
import { submissionDecision } from "@/features/assignments/logic";
import { audit } from "@/lib/audit";

/** Students submit only for themselves, only to assignments of their own section. Deadline/resubmission policy is enforced here. */
export const POST = route<{ id: string }>({ perm: "assignment.submit", roles: ["student"] }, async ({ req, ctx, params }) => {
  const { text } = await body(req, z.object({ text: z.string().trim().min(1, "Write your answer").max(8000) }));
  const [a, st] = await Promise.all([Assignment.findOne({ _id: params.id, ...scoped(ctx), published: true, kind: "assignment" }).lean(), Student.findOne({ _id: ctx.studentId, ...scoped(ctx) }).select("sectionId").lean()]);
  if (!a || !st || String(a.sectionId) !== String(st.sectionId)) throw notFound("Assignment");
  const existing = await Submission.findOne({ ...scoped(ctx), assignmentId: a._id, studentId: ctx.studentId }).lean();
  const dec = submissionDecision({ dueAt: a.dueAt, allowLate: a.allowLate ?? false, allowResubmission: a.allowResubmission ?? false, hasExisting: !!existing, graded: existing?.marks != null });
  if (!dec.ok) throw conflict(dec.reason);
  await Submission.updateOne({ ...scoped(ctx), assignmentId: a._id, studentId: ctx.studentId }, { $set: { text, late: dec.late, submittedAt: new Date() }, $inc: { attempt: 1 } }, { upsert: true });
  await audit(ctx, "assignment.submit", "Assignment", a._id, { late: dec.late });
  return { late: dec.late };
});
