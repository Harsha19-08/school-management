export interface SubmitInput { dueAt?: Date | null; allowLate: boolean; allowResubmission: boolean; hasExisting: boolean; graded: boolean; now?: Date }
/** Pure submission rule: late and resubmission policy decided server-side. */
export function submissionDecision(i: SubmitInput): { ok: true; late: boolean } | { ok: false; reason: string } {
  const now = i.now ?? new Date();
  const late = !!i.dueAt && now > i.dueAt;
  if (late && !i.allowLate) return { ok: false, reason: "The deadline has passed and late submissions are not accepted." };
  if (i.hasExisting && !i.allowResubmission) return { ok: false, reason: "You have already submitted this assignment." };
  if (i.hasExisting && i.graded) return { ok: false, reason: "This submission has already been graded." };
  return { ok: true, late };
}
