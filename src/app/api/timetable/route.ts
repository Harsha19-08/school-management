import { z } from "zod";
import { body, query, route } from "@/lib/api/route";
import { conflict, notFound } from "@/lib/api/errors";
import { scoped, resolveStudentScope } from "@/lib/authorization/context";
import { Timetable } from "@/models";
import { sectionTimetable, slotSchema, studentTimetable, teacherTimetable } from "@/features/academics/timetable";
import { assertSection, assertSubject, assertTeacher } from "@/features/academics/refs";
import { audit } from "@/lib/audit";

/** Staff: ?sectionId=…  Teacher: own timetable.  Student/parent: own section (never trusts a raw id). */
export const GET = route({}, async ({ req, ctx }) => {
  const q = query(req, z.object({ sectionId: z.string().optional(), studentId: z.string().optional(), mine: z.string().optional() }));
  if (ctx.role === "student" || ctx.role === "parent") return studentTimetable(ctx, await resolveStudentScope(ctx, q.studentId));
  if (ctx.role === "teacher" && (q.mine || !q.sectionId)) { if (!ctx.teacherId) throw notFound("Teacher"); return teacherTimetable(ctx, ctx.teacherId); }
  if (!q.sectionId) throw notFound("Section");
  return sectionTimetable(ctx, q.sectionId);
});

export const PUT = route({ perm: "academics.write" }, async ({ req, ctx }) => {
  const d = await body(req, slotSchema);
  await assertSection(ctx, d.sectionId); await assertSubject(ctx, d.subjectId); await assertTeacher(ctx, d.teacherId);
  if (d.teacherId) {
    const clash = await Timetable.findOne({ ...scoped(ctx), teacherId: d.teacherId, day: d.day, period: d.period, sectionId: { $ne: d.sectionId } }).lean();
    if (clash) throw conflict("That teacher already has a class in this period.");
  }
  await Timetable.updateOne({ ...scoped(ctx), sectionId: d.sectionId, day: d.day, period: d.period }, { $set: { start: d.start, end: d.end, subjectId: d.subjectId, teacherId: d.teacherId ?? null, room: d.room } }, { upsert: true });
  await audit(ctx, "timetable.set", "Section", d.sectionId, { day: d.day, period: d.period });
  return { ok: true };
});

export const DELETE = route({ perm: "academics.write" }, async ({ req, ctx }) => {
  const q = query(req, z.object({ sectionId: z.string(), day: z.coerce.number(), period: z.coerce.number() }));
  await assertSection(ctx, q.sectionId);
  await Timetable.deleteOne({ ...scoped(ctx), sectionId: q.sectionId, day: q.day, period: q.period });
  await audit(ctx, "timetable.clear", "Section", q.sectionId, { day: q.day, period: q.period });
  return { ok: true };
});
