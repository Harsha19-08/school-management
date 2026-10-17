export interface GradeBand { min: number; grade: string }
export interface SubjectResult { subjectId: string; marks?: number | null; absent?: boolean; maxMarks: number; passMarks: number }

export function gradeFor(percent: number, scale: GradeBand[]): string {
  const sorted = [...scale].sort((a, b) => b.min - a.min);
  return sorted.find((b) => percent >= b.min)?.grade ?? sorted[sorted.length - 1]?.grade ?? "-";
}

export interface Summary { total: number; max: number; percent: number | null; grade: string | null; passed: boolean | null; complete: boolean }

/** Pure report-card maths. Absent/missing marks are not treated as zero silently: `complete` is false when any subject is unrecorded. */
export function summarise(rows: SubjectResult[], scale: GradeBand[], passingPercent: number): Summary {
  const entered = rows.filter((r) => r.absent || (r.marks !== null && r.marks !== undefined));
  const complete = rows.length > 0 && entered.length === rows.length;
  const max = rows.reduce((a, r) => a + r.maxMarks, 0);
  const total = rows.reduce((a, r) => a + (r.absent ? 0 : r.marks ?? 0), 0);
  if (!complete || max === 0) return { total, max, percent: null, grade: null, passed: null, complete };
  const percent = Math.round((total / max) * 10000) / 100;
  const subjectsPassed = rows.every((r) => !r.absent && (r.marks ?? 0) >= r.passMarks);
  return { total, max, percent, grade: gradeFor(percent, scale), passed: subjectsPassed && percent >= passingPercent, complete };
}

/** Competition ranking (1,2,2,4). Students with incomplete results are not ranked. */
export function rankStudents(items: { studentId: string; percent: number | null }[]): Map<string, number> {
  const ranked = items.filter((i): i is { studentId: string; percent: number } => i.percent !== null).sort((a, b) => b.percent - a.percent);
  const out = new Map<string, number>();
  ranked.forEach((r, i) => out.set(r.studentId, i > 0 && ranked[i - 1].percent === r.percent ? out.get(ranked[i - 1].studentId)! : i + 1));
  return out;
}
