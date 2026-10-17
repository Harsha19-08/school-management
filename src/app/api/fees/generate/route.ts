import { body, route } from "@/lib/api/route";
import { badRequest, notFound } from "@/lib/api/errors";
import { scoped } from "@/lib/authorization/context";
import { FeeCategory, FeeStructure, Student, StudentFee } from "@/models";
import { generateSchema } from "@/features/fees/schemas";
import { audit } from "@/lib/audit";

/** Idempotent: each (structure, student, installment) has a unique genKey, so re-running never double-charges. */
export const POST = route({ perm: "fee.write" }, async ({ req, ctx }) => {
  const d = await body(req, generateSchema);
  const st = await FeeStructure.findOne({ _id: d.structureId, ...scoped(ctx) }).lean();
  if (!st) throw notFound("Fee structure");
  const cat = await FeeCategory.findOne({ _id: st.categoryId, ...scoped(ctx) }).lean();
  const students = await Student.find({ ...scoped(ctx), classId: { $in: st.classIds }, status: "active" }).select("_id").lean();
  if (!students.length) throw badRequest("No active students in the selected classes.");
  const parts: { label: string; dueDate: Date; amountPaise: number }[] = st.installments.length
    ? st.installments.map((i: { label: string; dueDate: Date; amountPaise: number }) => ({ label: `${cat?.name} – ${i.label}`, dueDate: i.dueDate, amountPaise: i.amountPaise }))
    : [{ label: cat?.name ?? "Fee", dueDate: d.defaultDueDate ?? (() => { throw badRequest("Pick a due date for this fee."); })(), amountPaise: st.amountPaise }];
  const docs = students.flatMap((s) => parts.map((p, idx) => ({ ...scoped(ctx), studentId: s._id, academicYearId: st.academicYearId, categoryId: st.categoryId, structureId: st._id, label: p.label, amountPaise: p.amountPaise, dueDate: p.dueDate, status: p.amountPaise === 0 ? "waived" : "pending", genKey: `${st._id}:${s._id}:${idx}` })));
  let created = 0;
  try { const r = await StudentFee.insertMany(docs, { ordered: false }); created = r.length; }
  catch (e) { const be = e as { code?: number; insertedDocs?: unknown[]; result?: { insertedCount?: number } }; if (be.code !== 11000 && !be.insertedDocs) throw e; created = be.insertedDocs?.length ?? be.result?.insertedCount ?? 0; }
  await audit(ctx, "fee.generate", "FeeStructure", st._id, { created, skippedExisting: docs.length - created });
  return { created, skippedExisting: docs.length - created };
});
