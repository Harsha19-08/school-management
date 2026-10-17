export type AttStatus = "present" | "absent" | "late" | "leave";
export interface Counts { present: number; absent: number; late: number; leave: number }
export const emptyCounts = (): Counts => ({ present: 0, absent: 0, late: 0, leave: 0 });

/**
 * Attendance % = (present + late) / (present + late + absent). Leave is excluded from the denominator.
 * Returns null — never 0% — when there is nothing to measure.
 */
export function attendancePercent(c: Counts): number | null {
  const denom = c.present + c.late + c.absent;
  if (denom === 0) return null;
  return Math.round(((c.present + c.late) / denom) * 1000) / 10;
}
export function tally(records: { status: AttStatus }[]): Counts { const c = emptyCounts(); for (const r of records) c[r.status] += 1; return c; }

/** Teachers can only edit recent dates (window from settings); admins are unrestricted. Future dates never allowed. */
export function dateEditable(opts: { date: string; today: string; isTeacher: boolean; windowDays: number }): { ok: boolean; reason?: string } {
  if (opts.date > opts.today) return { ok: false, reason: "Attendance cannot be marked for a future date." };
  if (opts.isTeacher) {
    const diff = Math.round((Date.parse(opts.today + "T00:00:00Z") - Date.parse(opts.date + "T00:00:00Z")) / 86_400_000);
    if (diff > opts.windowDays) return { ok: false, reason: `Teachers can edit attendance only for the last ${opts.windowDays} day(s). Ask an administrator.` };
  }
  return { ok: true };
}
