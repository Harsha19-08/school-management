import { z } from "zod";
import { scoped, type Ctx } from "@/lib/authorization/context";
import { notFound } from "@/lib/api/errors";
import { Section, Student, Subject, Teacher, Timetable } from "@/models";

const oid = z.string().regex(/^[a-f\d]{24}$/i);
const hhmm = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use HH:MM");
export const slotSchema = z.object({ sectionId: oid, day: z.coerce.number().int().min(1).max(6), period: z.coerce.number().int().min(1).max(12), start: hhmm, end: hhmm, subjectId: oid, teacherId: oid.optional().or(z.literal("").transform(() => undefined)), room: z.string().trim().max(20).optional() })
  .refine((s) => s.end > s.start, { message: "End must be after start", path: ["end"] });

export interface TimetableSlot { id: string; sectionId: string; day: number; period: number; start: string; end: string; subjectId: string; subjectName: string; teacherId?: string; teacherName?: string; room?: string; sectionLabel?: string }

async function hydrate(ctx: Pick<Ctx, "schoolId">, rows: Awaited<ReturnType<typeof Timetable.find>>): Promise<TimetableSlot[]> {
  const subs = await Subject.find(scoped(ctx)).lean();
  const tch = await Teacher.find(scoped(ctx)).select("name").lean();
  const sm = new Map(subs.map((s) => [String(s._id), s.name])); const tm = new Map(tch.map((t) => [String(t._id), t.name]));
  return (rows as unknown as { _id: unknown; sectionId: unknown; day: number; period: number; start: string; end: string; subjectId: unknown; teacherId?: unknown; room?: string }[]).map((r) => ({
    id: String(r._id), sectionId: String(r.sectionId), day: r.day, period: r.period, start: r.start, end: r.end, subjectId: String(r.subjectId), subjectName: sm.get(String(r.subjectId)) ?? "—",
    teacherId: r.teacherId ? String(r.teacherId) : undefined, teacherName: r.teacherId ? tm.get(String(r.teacherId)) : undefined, room: r.room,
  }));
}

export async function sectionTimetable(ctx: Pick<Ctx, "schoolId">, sectionId: string) {
  if (!(await Section.exists({ _id: sectionId, ...scoped(ctx) }))) throw notFound("Section");
  return hydrate(ctx, await Timetable.find({ ...scoped(ctx), sectionId }).sort({ day: 1, period: 1 }));
}
export async function teacherTimetable(ctx: Pick<Ctx, "schoolId">, teacherId: string) {
  const [rows, sections] = await Promise.all([Timetable.find({ ...scoped(ctx), teacherId }).sort({ day: 1, period: 1 }), Section.find(scoped(ctx)).populate("classId", "name").lean()]);
  const label = new Map(sections.map((s) => [String(s._id), `${(s.classId as unknown as { name?: string })?.name ?? ""}-${s.name}`]));
  return (await hydrate(ctx, rows)).map((s) => ({ ...s, sectionLabel: label.get(s.sectionId) }));
}
export async function studentTimetable(ctx: Pick<Ctx, "schoolId">, studentId: string) {
  const st = await Student.findOne({ _id: studentId, ...scoped(ctx) }).select("sectionId").lean();
  if (!st) throw notFound("Student");
  return sectionTimetable(ctx, String(st.sectionId));
}
