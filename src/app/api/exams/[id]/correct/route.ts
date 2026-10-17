import { body, route } from "@/lib/api/route";
import { badRequest, conflict, notFound } from "@/lib/api/errors";
import { scoped } from "@/lib/authorization/context";
import { Exam, Result } from "@/models";
import { correctSchema } from "@/features/examinations/schemas";
import type { ExamSub } from "@/features/examinations/queries";
import { audit } from "@/lib/audit";

/** The only way to change a published mark: a reasoned, audited correction that keeps the old value. */
export const POST = route<{ id: string }>({ perm: "results.publish" }, async ({ req, ctx, params }) => {
  const d = await body(req, correctSchema);
  const exam = await Exam.findOne({ _id: params.id, ...scoped(ctx) }).lean();
  if (!exam) throw notFound("Exam");
  if (exam.status !== "published") throw conflict("Only published results need corrections; edit marks directly instead.");
  const sub = (exam.subjects as ExamSub[]).find((s: ExamSub) => String(s.subjectId) === d.subjectId);
  if (!sub) throw notFound("Subject");
  if (d.marks > sub.maxMarks) throw badRequest(`Marks cannot exceed ${sub.maxMarks}.`);
  const r = await Result.findOne({ ...scoped(ctx), examId: exam._id, studentId: d.studentId, subjectId: d.subjectId });
  if (!r) throw notFound("Result");
  r.corrections.push({ at: new Date(), by: ctx.userId, from: r.marks ?? undefined, to: d.marks, reason: d.reason } as never);
  r.marks = d.marks; r.absent = false;
  await r.save();
  await audit(ctx, "result.correct", "Result", r._id, { reason: d.reason });
  return { id: String(r._id) };
});
