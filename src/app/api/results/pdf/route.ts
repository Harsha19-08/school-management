import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { z } from "zod";
import { query, route } from "@/lib/api/route";
import { can, resolveStudentScope } from "@/lib/authorization/context";
import { buildReportCard } from "@/features/examinations/queries";
import { forbidden } from "@/lib/api/errors";

/** Report-card PDF. Learners only get published exams; the same builder as the on-screen card. */
export const GET = route({}, async ({ req, ctx }) => {
  const q = query(req, z.object({ examId: z.string(), studentId: z.string().optional() }));
  const learner = ctx.role === "student" || ctx.role === "parent";
  if (learner ? !can(ctx, "results.read_published") : !can(ctx, "exam.read")) throw forbidden();
  const sid = await resolveStudentScope(ctx, q.studentId);
  const rc = await buildReportCard(ctx.schoolId, q.examId, sid, { publishedOnly: learner });
  const pdf = await PDFDocument.create(); const page = pdf.addPage([595, 842]);
  const f = await pdf.embedFont(StandardFonts.Helvetica); const b = await pdf.embedFont(StandardFonts.HelveticaBold);
  const t = (s: string, x: number, y: number, o: { bold?: boolean; size?: number } = {}) => page.drawText(s, { x, y, size: o.size ?? 11, font: o.bold ? b : f, color: rgb(0.12, 0.14, 0.17) });
  t(rc.schoolName, 50, 780, { bold: true, size: 20 }); t(`Report card — ${rc.exam.name} (${rc.exam.term})`, 50, 755);
  t(`Student: ${rc.student.name}`, 50, 720, { bold: true }); t(`Admission no.: ${rc.student.admissionNo}${rc.student.rollNo ? `   Roll: ${rc.student.rollNo}` : ""}`, 50, 702);
  let y = 660; ["Subject", "Max", "Pass", "Marks", "Result"].forEach((h, i) => t(h, [50, 280, 340, 400, 470][i], y, { bold: true }));
  y -= 8; page.drawLine({ start: { x: 50, y }, end: { x: 545, y }, thickness: 0.5, color: rgb(0.7, 0.7, 0.7) }); y -= 20;
  for (const r of rc.rows) { t(r.subject, 50, y); t(String(r.maxMarks), 280, y); t(String(r.passMarks), 340, y); t(r.absent ? "Absent" : r.marks === null ? "-" : String(r.marks), 400, y); t(r.passed === null ? "-" : r.passed ? "Pass" : "Fail", 470, y); y -= 22; }
  y -= 10; t(`Total: ${rc.summary.total} / ${rc.summary.max}`, 50, y, { bold: true });
  if (rc.summary.percent !== null) { t(`Percentage: ${rc.summary.percent}%   Grade: ${rc.summary.grade}   Result: ${rc.summary.passed ? "Pass" : "Fail"}`, 50, y - 20, { bold: true }); if (rc.showRank && rc.rank) t(`Class rank: ${rc.rank}`, 50, y - 40); } else t("Result incomplete — some marks are not yet recorded.", 50, y - 20);
  const bytes = await pdf.save();
  return new Response(Buffer.from(bytes), { headers: { "Content-Type": "application/pdf", "Content-Disposition": `inline; filename="report-card.pdf"`, "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" } });
});
