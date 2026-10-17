import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { route } from "@/lib/api/route";
import { notFound } from "@/lib/api/errors";
import { can, scoped } from "@/lib/authorization/context";
import { Payment, School, Student, StudentFee } from "@/models";
import { formatINR } from "@/lib/money";

/** PDF receipt for a successful payment. Staff: any in school. Student/parent: only their own/child's. */
export const GET = route<{ id: string }>({}, async ({ ctx, params }) => {
  const p = await Payment.findOne({ _id: params.id, ...scoped(ctx), kind: "payment", status: "success" }).lean();
  if (!p) throw notFound("Receipt");
  const staff = can(ctx, "fee.read");
  const own = ctx.role === "student" ? ctx.studentId === String(p.studentId) : ctx.role === "parent" ? ctx.childIds.includes(String(p.studentId)) : false;
  if (!staff && !own) throw notFound("Receipt");
  const [student, fee, school] = await Promise.all([Student.findOne({ _id: p.studentId, ...scoped(ctx) }).lean(), StudentFee.findOne({ _id: p.feeId, ...scoped(ctx) }).lean(), School.findById(ctx.schoolId).lean()]);
  const pdf = await PDFDocument.create(); const page = pdf.addPage([420, 520]);
  const f = await pdf.embedFont(StandardFonts.Helvetica); const b = await pdf.embedFont(StandardFonts.HelveticaBold);
  const line = (t: string, y: number, o: { bold?: boolean; size?: number } = {}) => page.drawText(t, { x: 36, y, size: o.size ?? 11, font: o.bold ? b : f, color: rgb(0.12, 0.14, 0.17) });
  line(school?.name ?? "School", 470, { bold: true, size: 16 }); line("FEE RECEIPT", 448, { size: 10 });
  const rows: [string, string][] = [["Receipt no.", p.receiptNo ?? "-"], ["Date", new Date(p.paidOn).toISOString().slice(0, 10)], ["Student", student ? `${student.firstName} ${student.lastName}` : "-"], ["Admission no.", student?.admissionNo ?? "-"], ["Fee", fee?.label ?? "-"], ["Mode", p.mode.replace("_", " ")], ["Reference", p.reference ?? "-"]];
  rows.forEach(([k, v], i) => { line(k, 410 - i * 24, { bold: true }); page.drawText(v, { x: 150, y: 410 - i * 24, size: 11, font: f }); });
  line("Amount paid", 210, { bold: true, size: 13 }); page.drawText(formatINR(p.amountPaise).replace("₹", "Rs. "), { x: 150, y: 210, size: 14, font: b });
  line("This is a computer-generated receipt.", 60, { size: 9 });
  const bytes = await pdf.save();
  return new Response(Buffer.from(bytes), { headers: { "Content-Type": "application/pdf", "Content-Disposition": `inline; filename="${(p.receiptNo ?? "receipt").replace(/[^\w.-]/g, "_")}.pdf"`, "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" } });
});
