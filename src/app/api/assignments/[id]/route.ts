import { route } from "@/lib/api/route";
import { notFound } from "@/lib/api/errors";
import { assertTeacherSection, scoped } from "@/lib/authorization/context";
import { Assignment, Student, Submission } from "@/models";

/** Teacher/admin: roster with submission state. */
export const GET = route<{ id: string }>({ perm: "assignment.write" }, async ({ ctx, params }) => {
  const a = await Assignment.findOne({ _id: params.id, ...scoped(ctx) }).lean();
  if (!a) throw notFound("Assignment");
  await assertTeacherSection(ctx, String(a.sectionId));
  const [students, subs] = await Promise.all([Student.find({ ...scoped(ctx), sectionId: a.sectionId, status: "active" }).sort({ rollNo: 1 }).select("firstName lastName rollNo").lean(), Submission.find({ ...scoped(ctx), assignmentId: a._id }).lean()]);
  const m = new Map(subs.map((s) => [String(s.studentId), s]));
  return { id: String(a._id), title: a.title, maxMarks: a.maxMarks, dueAt: a.dueAt, students: students.map((s) => { const x = m.get(String(s._id)); return { id: String(s._id), name: `${s.firstName} ${s.lastName}`, rollNo: s.rollNo, submitted: !!x, text: x?.text, late: x?.late, submittedAt: x?.submittedAt, marks: x?.marks, feedback: x?.feedback }; }) };
});

export const DELETE = route<{ id: string }>({ perm: "assignment.write" }, async ({ ctx, params }) => {
  const a = await Assignment.findOne({ _id: params.id, ...scoped(ctx) }).lean();
  if (!a) throw notFound("Assignment");
  await assertTeacherSection(ctx, String(a.sectionId));
  await Submission.deleteMany({ ...scoped(ctx), assignmentId: a._id });
  await Assignment.deleteOne({ _id: a._id });
  return { id: params.id };
});
