import { formatInTimeZone } from "date-fns-tz";

/** School-local calendar date as "YYYY-MM-DD" — the canonical attendance key. */
export function schoolDate(d: Date, tz: string): string { return formatInTimeZone(d, tz, "yyyy-MM-dd"); }

export function isValidDateKey(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(s + "T00:00:00Z");
  return !Number.isNaN(d.getTime()) && d.toISOString().startsWith(s);
}
export function daysBetweenKeys(a: string, b: string): number { return Math.round((Date.parse(b + "T00:00:00Z") - Date.parse(a + "T00:00:00Z")) / 86_400_000); }
export function monthRange(ym: string): { from: string; to: string } {
  const [y, m] = ym.split("-").map(Number);
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return { from: `${ym}-01`, to: `${ym}-${String(last).padStart(2, "0")}` };
}
