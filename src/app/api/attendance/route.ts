import { z } from "zod";
import { body, query, route } from "@/lib/api/route";
import { badRequest, forbidden } from "@/lib/api/errors";
import { assertTeacherSection, scoped } from "@/lib/authorization/context";
import { Attendance, School, Student } from "@/models";
import { isValidDateKey, schoolDate } from "@/lib/dates";
import { dateEditable } from "@/features/attendance/logic";
import { assertSection } from "@/features/academics/refs";
import { audit } from "@/lib/audit";

const dateKey = z.string().refine(isValidDateKey, "Invalid date");

/** Roster for a section/date with any recorded status. */
export const GET = route({ perm: "attendance.read", roles: ["super_admin", "school_admin", "teacher"] }, async ({ req, ctx }) => {
  const { sectionId, date } = query(req, z.object({ sectionId: z.string(), date: dateKey }));
  await assertSection(ctx, sectionId); await assertTeacherSection(ctx, sectionId);
  const [students, recs] = await Promise.all([
    Student.find({ ...scoped(ctx), sectionId, status: "active" }).sort({ rollNo: 1, firstName: 1 }).select("firstName lastName rollNo admissionNo").lean(),
    Attendance.find({ ...scoped(ctx), sectionId, date }).lean(),
  ]);
  const m = new Map(recs.map((r) => [String(r.studentId), r]));
  return { date, marked: recs.length > 0, students: students.map((s) => ({ id: String(s._id), name: `${s.firstName} ${s.lastName}`, rollNo: s.rollNo, admissionNo: s.admissionNo, status: m.get(String(s._id))?.status ?? null, remarks: m.get(String(s._id))?.remarks ?? "" })) };
});

const markSchema = z.object({
  sectionId: z.string(), date: dateKey,
  records: z.array(z.object({ studentId: z.string(), status: z.enum(["present", "absent", "late", "leave"]), remarks: z.string().trim().max(120).optional() })).min(1).max(300),
});

/** Idempotent bulk upsert keyed on (school, student, date): re-submitting edits, never duplicates. */
export const POST = route({ perm: "attendance.mark" }, async ({ req, ctx }) => {
  const d = await body(req, markSchema);
  await assertSection(ctx, d.sectionId); await assertTeacherSection(ctx, d.sectionId);
  const school = await School.findById(ctx.schoolId).select("settings.attendance timeZone").lean();
  const chk = dateEditable({ date: d.date, today: schoolDate(new Date(), school?.timeZone ?? "Asia/Kolkata"), isTeacher: ctx.role === "teacher", windowDays: school?.settings?.attendance?.allowTeacherEditDays ?? 2 });
  if (!chk.ok) throw ctx.role === "teacher" && d.date <= schoolDate(new Date(), school?.timeZone ?? "Asia/Kolkata") ? forbidden(chk.reason) : badRequest(chk.reason!);
  const ids = [...new Set(d.records.map((r) => r.studentId))];
  const valid = await Student.find({ ...scoped(ctx), sectionId: d.sectionId, _id: { $in: ids } }).select("_id").lean();
  if (valid.length !== ids.length) throw badRequest("Some students do not belong to this section.");
  await Attendance.bulkWrite(d.records.map((r) => ({ updateOne: {
    filter: { ...scoped(ctx), studentId: r.studentId, date: d.date },
    update: { $set: { sectionId: d.sectionId, status: r.status, remarks: r.remarks, editedBy: ctx.userId }, $setOnInsert: { markedBy: ctx.userId } }, upsert: true,
  } })));
  await audit(ctx, "attendance.mark", "Section", d.sectionId, { date: d.date, count: d.records.length });
  return { saved: d.records.length };
});
