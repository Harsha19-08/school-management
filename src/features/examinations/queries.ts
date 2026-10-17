import { notFound } from "@/lib/api/errors";
import { Exam, Result, School, Student, Subject } from "@/models";
export type ExamSub = { subjectId: unknown; maxMarks: number; passMarks: number };
import { rankStudents, summarise, type GradeBand } from "@/services/grading";

export interface ReportCard {
  exam: { id: string; name: string; term: string; status: string; publishedAt?: Date };
  student: { id: string; name: string; admissionNo: string; rollNo?: number };
  rows: { subjectId: string; subject: string; maxMarks: number; passMarks: number; marks: number | null; absent: boolean; passed: boolean | null }[];
  summary: ReturnType<typeof summarise>; rank: number | null; showRank: boolean; schoolName: string;
}

/**
 * Builds one report card. When `publishedOnly` is set (student/parent callers) an unpublished exam is
 * indistinguishable from a missing one, so unreleased results can never leak.
 */
export async function buildReportCard(schoolId: string, examId: string, studentId: string, opts: { publishedOnly: boolean }): Promise<ReportCard> {
  const exam = await Exam.findOne({ _id: examId, schoolId, ...(opts.publishedOnly ? { status: "published" } : {}) }).lean();
  const student = await Student.findOne({ _id: studentId, schoolId, classId: exam?.classId }).lean();
  if (!exam || !student) throw notFound("Result");
  const [school, results, subjects] = await Promise.all([School.findById(schoolId).select("name settings.exams").lean(), Result.find({ schoolId, examId, studentId }).lean(), Subject.find({ schoolId }).lean()]);
  const sn = new Map(subjects.map((s) => [String(s._id), s.name]));
  const rm = new Map(results.map((r) => [String(r.subjectId), r]));
  const rows = (exam.subjects as ExamSub[]).map((s) => {
    const r = rm.get(String(s.subjectId));
    const marks = r && !r.absent && r.marks !== undefined && r.marks !== null ? r.marks : null;
    return { subjectId: String(s.subjectId), subject: sn.get(String(s.subjectId)) ?? "—", maxMarks: s.maxMarks, passMarks: s.passMarks, marks, absent: !!r?.absent, passed: r ? (r.absent ? false : marks === null ? null : marks >= s.passMarks) : null };
  });
  const cfg = school?.settings?.exams; const scale = (cfg?.gradeScale ?? []) as GradeBand[];
  const summary = summarise(rows.map((r) => ({ subjectId: r.subjectId, marks: r.marks, absent: r.absent, maxMarks: r.maxMarks, passMarks: r.passMarks })), scale, cfg?.passingPercent ?? 35);
  let rank: number | null = null;
  if (cfg?.showRank && summary.percent !== null) {
    const all = await Result.find({ schoolId, examId }).lean();
    const byStudent = new Map<string, typeof rows>();
    for (const r of all) { const arr = byStudent.get(String(r.studentId)) ?? []; arr.push({ subjectId: String(r.subjectId), subject: "", maxMarks: (exam.subjects as ExamSub[]).find((x) => String(x.subjectId) === String(r.subjectId))?.maxMarks ?? 0, passMarks: 0, marks: r.absent ? null : r.marks ?? null, absent: !!r.absent, passed: null }); byStudent.set(String(r.studentId), arr); }
    const items = [...byStudent.entries()].map(([sid, rs]) => ({ studentId: sid, percent: rs.length === exam.subjects.length ? (rs.reduce((a, r) => a + (r.marks ?? 0), 0) / rs.reduce((a, r) => a + r.maxMarks, 0)) * 100 : null }));
    rank = rankStudents(items).get(studentId) ?? null;
  }
  return { exam: { id: String(exam._id), name: exam.name, term: exam.term, status: exam.status, publishedAt: exam.publishedAt ?? undefined }, student: { id: String(student._id), name: `${student.firstName} ${student.lastName}`, admissionNo: student.admissionNo, rollNo: student.rollNo ?? undefined }, rows, summary, rank, showRank: !!cfg?.showRank, schoolName: school?.name ?? "" };
}

export const examDto = (e: { _id: unknown; name: string; type: string; term: string; classId: unknown; academicYearId: unknown; status: string; subjects: { subjectId: unknown; maxMarks: number; passMarks: number; date?: Date | null; start?: string | null; end?: string | null; room?: string | null }[]; publishedAt?: Date | null }) => ({
  id: String(e._id), name: e.name, type: e.type, term: e.term, classId: String(e.classId), academicYearId: String(e.academicYearId), status: e.status, publishedAt: e.publishedAt ?? undefined,
  subjects: e.subjects.map((s) => ({ subjectId: String(s.subjectId), maxMarks: s.maxMarks, passMarks: s.passMarks, date: s.date ?? undefined, start: s.start ?? undefined, end: s.end ?? undefined, room: s.room ?? undefined })),
});

