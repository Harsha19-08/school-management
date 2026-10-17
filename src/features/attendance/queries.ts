import { Types } from "mongoose";
import { Attendance } from "@/models";
import { attendancePercent, emptyCounts, type AttStatus } from "./logic";

/** Per-student counts + percent for a school-local date range, computed in the database. */
export async function rangeSummary(schoolId: string, match: { studentId?: string; sectionId?: string }, from: string, to: string) {
  const m: Record<string, unknown> = { schoolId: new Types.ObjectId(schoolId), date: { $gte: from, $lte: to } };
  if (match.studentId) m.studentId = new Types.ObjectId(match.studentId);
  if (match.sectionId) m.sectionId = new Types.ObjectId(match.sectionId);
  const rows = await Attendance.aggregate<{ _id: { s: Types.ObjectId; st: AttStatus }; n: number }>([{ $match: m }, { $group: { _id: { s: "$studentId", st: "$status" }, n: { $sum: 1 } } }]);
  const by = new Map<string, ReturnType<typeof emptyCounts>>();
  for (const r of rows) { const k = String(r._id.s); const c = by.get(k) ?? emptyCounts(); c[r._id.st] += r.n; by.set(k, c); }
  return [...by.entries()].map(([studentId, counts]) => ({ studentId, ...counts, percent: attendancePercent(counts) }));
}

export async function studentPercent(schoolId: string, studentId: string, from: string, to: string) {
  const r = await rangeSummary(schoolId, { studentId }, from, to);
  return r[0] ?? { studentId, ...emptyCounts(), percent: null as number | null };
}
