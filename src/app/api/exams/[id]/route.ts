import { body, route } from "@/lib/api/route";
import { conflict, notFound } from "@/lib/api/errors";
import { scoped } from "@/lib/authorization/context";
import { Exam, Result } from "@/models";
import { examUpdateSchema } from "@/features/examinations/schemas";
import { assertSubject } from "@/features/academics/refs";
import { audit } from "@/lib/audit";
import { examDto } from "@/features/examinations/queries";

export const GET = route<{ id: string }>({ perm: "exam.read", roles: ["super_admin", "school_admin", "teacher"] }, async ({ ctx, params }) => {
  const e = await Exam.findOne({ _id: params.id, ...scoped(ctx) }).lean();
  if (!e) throw notFound("Exam");
  return examDto(e);
});

export const PATCH = route<{ id: string }>({ perm: "exam.write" }, async ({ req, ctx, params }) => {
  const d = await body(req, examUpdateSchema);
  const e = await Exam.findOne({ _id: params.id, ...scoped(ctx) });
  if (!e) throw notFound("Exam");
  if (e.status === "published") throw conflict("Published exams are locked. Use a correction instead.");
  if (d.subjects) {
    for (const s of d.subjects) await assertSubject(ctx, s.subjectId);
    if (await Result.exists({ ...scoped(ctx), examId: e._id })) throw conflict("Marks have been entered, so subjects can no longer change.");
    e.subjects = d.subjects as never;
  }
  if (d.name) e.name = d.name; if (d.term) e.term = d.term; if (d.status) e.status = d.status;
  await e.save();
  await audit(ctx, "exam.update", "Exam", e._id, { status: d.status });
  return { id: String(e._id) };
});

export const DELETE = route<{ id: string }>({ perm: "exam.write" }, async ({ ctx, params }) => {
  const e = await Exam.findOne({ _id: params.id, ...scoped(ctx) }).lean();
  if (!e) throw notFound("Exam");
  if (e.status === "published" || (await Result.exists({ ...scoped(ctx), examId: e._id }))) throw conflict("This exam has results and cannot be deleted.");
  await Exam.deleteOne({ _id: e._id });
  await audit(ctx, "exam.delete", "Exam", e._id);
  return { id: params.id };
});
