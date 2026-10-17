export type AdmissionStatus = "draft" | "submitted" | "under_review" | "approved" | "rejected" | "enrolled";

export const TRANSITIONS: Record<AdmissionStatus, AdmissionStatus[]> = {
  draft: ["submitted"], submitted: ["under_review", "rejected"], under_review: ["approved", "rejected"],
  approved: ["enrolled", "rejected"], rejected: [], enrolled: [],
};
export const canTransition = (from: AdmissionStatus, to: AdmissionStatus) => TRANSITIONS[from]?.includes(to) ?? false;
/** `enrolled` is only reachable through the enroll endpoint, which creates the student atomically. */
export const manualTargets = (from: AdmissionStatus) => TRANSITIONS[from].filter((s) => s !== "enrolled");
export const EDITABLE: AdmissionStatus[] = ["draft", "submitted"];

const norm = (s: string) => s.normalize("NFKD").toLowerCase().replace(/[^a-z0-9]/g, "");
/** Same child + DOB + guardian ⇒ same application, regardless of spacing/case/punctuation. */
export function dedupeKey(i: { firstName: string; lastName: string; dob: Date | string; guardianName: string }): string {
  const d = new Date(i.dob); const day = isNaN(d.getTime()) ? "" : d.toISOString().slice(0, 10);
  return [norm(i.firstName), norm(i.lastName), day, norm(i.guardianName)].join("|");
}
