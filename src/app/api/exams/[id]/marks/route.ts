import { z } from "zod";
import { body, query, route } from "@/lib/api/route";
import { badRequest, conflict, forbidden, notFound } from "@/lib/api/errors";
import { assertTeacherSection, scoped } from "@/lib/authorization/context";
import { Exam, Result, Student, Teacher } from "@/models";
import { marksSchema } from "@/features/examinations/schemas";
import { assertSection } from "@/features/academics/refs";
import type { ExamSub } from "@/features/examinations/queries";
import { audit } from "@/lib/audit";

async function load(ctx: Parameters<typeof assertTeacherSection>[0] & { role: string; teacherId?: string; schoolId: string }, examId: string, sectionId: string, subjectId: string) {
  const exam = await Exam.findOne({ _id: examId, schoolId: ctx.schoolId }).lean();
  if (!exam) throw notFound("Exam");
  const sub = (exam.subjects as ExamSub[]).find((s: ExamSub) => String(s.subjectId) === subjectId);
  if (!sub) throw notFound("Subject");
  await assertSection(ctx, sectionId);
  if (ctx.role === "teacher") {
    const t = await Teacher.findOne({ _id: ctx.teacherId, schoolId: ctx.schoolId }).lean();
    if (!t?.assignments.some((a: { subjectId: unknown; sectionId: unknown }) => String(a.subjectId) === subjectId && String(a.sectionId) === sectionId)) throw forbidden("You are not assigned to teach this subject in this section.");
  }
  return { exam, sub };
}

export const GET = route<{ id: string }>({ perm: "marks.enter" }, async ({ req, ctx, params }) => {
  const q = query(req, z.object({ sectionId: z.string(), subjectId: z.string() }));
  const { exam, sub } = await load(ctx, params.id, q.sectionId, q.subjectId);
  const [students, results] = await Promise.all([
    Student.find({ ...scoped(ctx), sectionId: q.sectionId, classId: exam.classId, status: "active" }).sort({ rollNo: 1, firstName: 1 }).select("firstName lastName rollNo").lean(),
    Result.find({ ...scoped(ctx), examId: exam._id, subjectId: q.subjectId }).lean(),
  ]);
  const m = new Map(results.map((r) => [String(r.studentId), r]));
  return { status: exam.status, maxMarks: sub.maxMarks, passMarks: sub.passMarks, students: students.map((s) => ({ id: String(s._id), name: `${s.firstName} ${s.lastName}`, rollNo: s.rollNo, marks: m.get(String(s._id))?.marks ?? null, absent: !!m.get(String(s._id))?.absent })) };
});

/** Bulk upsert of marks. Only while marks are open; range-checked against the subject's max; teachers limited to their own subject+section. */
export const POST = route<{ id: string }>({ perm: "marks.enter" }, async ({ req, ctx, params }) => {
  const d = await body(req, marksSchema);
  const { exam, sub } = await load(ctx, params.id, d.sectionId, d.subjectId);
  if (exam.status === "published") throw conflict("Results are published. Ask an administrator to make a correction.");
  if (exam.status !== "marks_open") throw conflict("Marks entry is not open for this exam.");
  for (const e of d.entries) if (!e.absent && e.marks != null && e.marks > sub.maxMarks) throw badRequest(`Marks cannot exceed ${sub.maxMarks}.`);
  const ids = d.entries.map((e) => e.studentId);
  const ok = await Student.countDocuments({ ...scoped(ctx), sectionId: d.sectionId, classId: exam.classId, _id: { $in: ids } });
  if (ok !== new Set(ids).size) throw badRequest("Some students do not belong to this section.");
  await Result.bulkWrite(d.entries.map((e) => e.absent || e.marks == null && !e.absent
    ? (e.absent ? { updateOne: { filter: { ...scoped(ctx), examId: exam._id, studentId: e.studentId, subjectId: d.subjectId }, update: { $set: { absent: true, enteredBy: ctx.userId }, $unset: { marks: 1 } }, upsert: true } } : { deleteOne: { filter: { ...scoped(ctx), examId: exam._id, studentId: e.studentId, subjectId: d.subjectId } } })
    : { updateOne: { filter: { ...scoped(ctx), examId: exam._id, studentId: e.studentId, subjectId: d.subjectId }, update: { $set: { marks: e.marks, absent: false, enteredBy: ctx.userId } }, upsert: true } }));
  await audit(ctx, "marks.enter", "Exam", exam._id, { subjectId: d.subjectId, sectionId: d.sectionId, count: d.entries.length });
  return { saved: d.entries.length };
});
