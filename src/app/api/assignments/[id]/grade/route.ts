import { z } from "zod";
import { body, route } from "@/lib/api/route";
import { badRequest, notFound } from "@/lib/api/errors";
import { assertTeacherSection, scoped } from "@/lib/authorization/context";
import { Assignment, Submission } from "@/models";
import { audit } from "@/lib/audit";

export const POST = route<{ id: string }>({ perm: "assignment.write" }, async ({ req, ctx, params }) => {
  const d = await body(req, z.object({ studentId: z.string().regex(/^[a-f\d]{24}$/i), marks: z.number().min(0).optional(), feedback: z.string().trim().max(1000).optional() }));
  const a = await Assignment.findOne({ _id: params.id, ...scoped(ctx) }).lean();
  if (!a) throw notFound("Assignment");
  await assertTeacherSection(ctx, String(a.sectionId));
  if (d.marks !== undefined && a.maxMarks != null && d.marks > a.maxMarks) throw badRequest(`Marks cannot exceed ${a.maxMarks}.`);
  const r = await Submission.updateOne({ ...scoped(ctx), assignmentId: a._id, studentId: d.studentId }, { $set: { marks: d.marks, feedback: d.feedback, gradedBy: ctx.userId } });
  if (!r.matchedCount) throw notFound("Submission");
  await audit(ctx, "assignment.grade", "Assignment", a._id, { studentId: d.studentId });
  return { ok: true };
});
