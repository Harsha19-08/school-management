import { z } from "zod";
import { query, route } from "@/lib/api/route";
import { assertTeacherSection, scoped } from "@/lib/authorization/context";
import { Student, School } from "@/models";
import { isValidDateKey } from "@/lib/dates";
import { rangeSummary } from "@/features/attendance/queries";
import { assertSection } from "@/features/academics/refs";
import { badRequest } from "@/lib/api/errors";

const key = z.string().refine(isValidDateKey, "Invalid date");
/** Per-student attendance % for a section over a range, with low-attendance flag from the school's threshold. */
export const GET = route({ perm: "attendance.read", roles: ["super_admin", "school_admin", "teacher"] }, async ({ req, ctx }) => {
  const q = query(req, z.object({ sectionId: z.string(), from: key, to: key }));
  if (q.from > q.to) throw badRequest("From must be before To.");
  await assertSection(ctx, q.sectionId); await assertTeacherSection(ctx, q.sectionId);
  const [students, sums, school] = await Promise.all([
    Student.find({ ...scoped(ctx), sectionId: q.sectionId, status: "active" }).sort({ rollNo: 1, firstName: 1 }).select("firstName lastName rollNo").lean(),
    rangeSummary(ctx.schoolId, { sectionId: q.sectionId }, q.from, q.to), School.findById(ctx.schoolId).select("settings.attendance").lean(),
  ]);
  const thr = school?.settings?.attendance?.lowAttendanceThresholdPct ?? 75;
  const m = new Map(sums.map((s) => [s.studentId, s]));
  return { threshold: thr, rows: students.map((s) => { const r = m.get(String(s._id)); return { id: String(s._id), name: `${s.firstName} ${s.lastName}`, rollNo: s.rollNo, present: r?.present ?? 0, late: r?.late ?? 0, absent: r?.absent ?? 0, leave: r?.leave ?? 0, percent: r?.percent ?? null, low: r?.percent != null && r.percent < thr }; }) };
});
