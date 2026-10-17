import { z } from "zod";
import { body, pageQuery, paged, query, route } from "@/lib/api/route";
import { can, resolveStudentScope, scoped } from "@/lib/authorization/context";
import { Assignment, Student, Submission, Teacher } from "@/models";
import { assertSection, assertSubject } from "@/features/academics/refs";
import { forbidden } from "@/lib/api/errors";
import { notify } from "@/services/notify";
import { audit } from "@/lib/audit";

const oid = z.string().regex(/^[a-f\d]{24}$/i);
const schema = z.object({ sectionId: oid, subjectId: oid, title: z.string().trim().min(2).max(120), instructions: z.string().trim().max(4000).optional(), kind: z.enum(["assignment", "resource"]).default("assignment"), dueAt: z.coerce.date().optional().or(z.literal("").transform(() => undefined)), maxMarks: z.coerce.number().min(0).max(1000).optional(), allowLate: z.boolean().default(false), allowResubmission: z.boolean().default(false) });

export const GET = route({ perm: "assignment.read" }, async ({ req, ctx }) => {
  const q = query(req, pageQuery.extend({ studentId: z.string().optional(), sectionId: z.string().optional() }));
  const f: Record<string, unknown> = { ...scoped(ctx) };
  let mySubs = new Map<string, { marks?: number | null; feedback?: string | null; late?: boolean | null }>();
  if (ctx.role === "student" || ctx.role === "parent") {
    const sid = await resolveStudentScope(ctx, q.studentId);
    const st = await Student.findOne({ _id: sid, ...scoped(ctx) }).select("sectionId").lean();
    f.sectionId = st?.sectionId; f.published = true;
    const subs = await Submission.find({ ...scoped(ctx), studentId: sid }).lean();
    mySubs = new Map(subs.map((s) => [String(s.assignmentId), s]));
  } else if (ctx.role === "teacher") f.teacherId = ctx.teacherId;
  else if (q.sectionId) f.sectionId = q.sectionId;
  const [items, total] = await Promise.all([Assignment.find(f).sort({ dueAt: -1, createdAt: -1 }).skip((q.page - 1) * q.pageSize).limit(q.pageSize).populate("subjectId", "name").lean(), Assignment.countDocuments(f)]);
  const counts = ctx.role === "student" || ctx.role === "parent" ? new Map() : new Map((await Submission.aggregate([{ $match: { assignmentId: { $in: items.map((i) => i._id) } } }, { $group: { _id: "$assignmentId", n: { $sum: 1 } } }])).map((r: { _id: unknown; n: number }) => [String(r._id), r.n]));
  return paged(items.map((a) => { const sub = mySubs.get(String(a._id)); return { id: String(a._id), title: a.title, kind: a.kind, instructions: a.instructions, subject: (a.subjectId as unknown as { name?: string })?.name, sectionId: String(a.sectionId), dueAt: a.dueAt, maxMarks: a.maxMarks, allowLate: a.allowLate, allowResubmission: a.allowResubmission, submissionCount: counts.get(String(a._id)), mine: sub ? { submitted: true, marks: sub.marks, feedback: sub.feedback, late: sub.late } : { submitted: false } }; }), total, q.page, q.pageSize);
});

export const POST = route({ perm: "assignment.write" }, async ({ req, ctx }) => {
  const d = await body(req, schema);
  await assertSection(ctx, d.sectionId); await assertSubject(ctx, d.subjectId);
  const teacherId = ctx.teacherId;
  if (ctx.role === "teacher") {
    const t = await Teacher.findOne({ _id: ctx.teacherId, ...scoped(ctx) }).lean();
    if (!t?.assignments.some((a: { subjectId: unknown; sectionId: unknown }) => String(a.subjectId) === d.subjectId && String(a.sectionId) === d.sectionId)) throw forbidden("You are not assigned to teach this subject in this section.");
  } else if (!can(ctx, "assignment.write")) throw forbidden();
  const a = await Assignment.create({ ...d, ...scoped(ctx), teacherId });
  const students = await Student.find({ ...scoped(ctx), sectionId: d.sectionId, status: "active" }).select("userId").lean();
  await notify({ schoolId: ctx.schoolId, userIds: students.map((s) => s.userId).filter(Boolean).map(String), title: `New ${d.kind}: ${d.title}`, link: "/student/assignments", kind: "assignment" });
  await audit(ctx, "assignment.create", "Assignment", a._id);
  return { id: String(a._id) };
});
