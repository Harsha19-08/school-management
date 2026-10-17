import { z } from "zod";
import { query, route } from "@/lib/api/route";
import { resolveStudentScope, scoped } from "@/lib/authorization/context";
import { Attendance } from "@/models";
import { isValidDateKey, monthRange } from "@/lib/dates";
import { studentPercent } from "@/features/attendance/queries";

/** One student's month calendar + totals. Student/parent ids are resolved server-side, never trusted. */
export const GET = route({ perm: "attendance.read" }, async ({ req, ctx }) => {
  const q = query(req, z.object({ studentId: z.string().optional(), month: z.string().regex(/^\d{4}-\d{2}$/).optional() }));
  const studentId = await resolveStudentScope(ctx, q.studentId);
  const ym = q.month ?? new Date().toISOString().slice(0, 7);
  const { from, to } = monthRange(ym);
  if (!isValidDateKey(from)) throw new Error("bad month");
  const [days, month, term] = await Promise.all([
    Attendance.find({ ...scoped(ctx), studentId, date: { $gte: from, $lte: to } }).sort({ date: 1 }).select("date status remarks").lean(),
    studentPercent(ctx.schoolId, studentId, from, to), studentPercent(ctx.schoolId, studentId, "0000-01-01", "9999-12-31"),
  ]);
  return { month: ym, days: days.map((d) => ({ date: d.date, status: d.status, remarks: d.remarks })), monthSummary: month, overall: term };
});
