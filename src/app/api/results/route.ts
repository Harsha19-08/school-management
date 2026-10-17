import { z } from "zod";
import { query, route } from "@/lib/api/route";
import { can, resolveStudentScope, scoped } from "@/lib/authorization/context";
import { Exam, Student } from "@/models";
import { buildReportCard } from "@/features/examinations/queries";
import { forbidden } from "@/lib/api/errors";

/**
 * Student/parent: only PUBLISHED exams for their own (or their child's) student.
 * Staff: any exam, flagged with its status.
 */
export const GET = route({}, async ({ req, ctx }) => {
  const q = query(req, z.object({ studentId: z.string().optional(), examId: z.string().optional() }));
  const learner = ctx.role === "student" || ctx.role === "parent";
  if (learner && !can(ctx, "results.read_published")) throw forbidden();
  if (!learner && !can(ctx, "exam.read")) throw forbidden();
  const studentId = await resolveStudentScope(ctx, q.studentId);
  const st = await Student.findOne({ _id: studentId, ...scoped(ctx) }).select("classId").lean();
  const exams = await Exam.find({ ...scoped(ctx), classId: st?.classId, ...(learner ? { status: "published" } : {}) }).sort({ createdAt: -1 }).lean();
  if (!q.examId) return exams.map((e) => ({ id: String(e._id), name: e.name, term: e.term, status: e.status, publishedAt: e.publishedAt }));
  return buildReportCard(ctx.schoolId, q.examId, studentId, { publishedOnly: learner });
});
