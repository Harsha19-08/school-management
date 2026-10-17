import { describe, expect, it } from "vitest";
import { attendancePercent, dateEditable, tally } from "@/features/attendance/logic";
import { canTransition, dedupeKey, manualTargets } from "@/features/admissions/logic";
import { gradeFor, rankStudents, summarise } from "@/services/grading";
import { submissionDecision } from "@/features/assignments/logic";
import { canAccessDocument, type Reader } from "@/features/documents/access";
import { noticeVisible } from "@/features/notices/visibility";
import { DEFAULT_ROLE_PERMISSIONS, roleHas, sanitizeOverride } from "@/lib/authorization/permissions";
import { isValidDateKey, monthRange } from "@/lib/dates";
import { validateUpload } from "@/lib/storage";

describe("attendance", () => {
  it("excludes leave from the denominator and counts late as attended", () => { expect(attendancePercent({ present: 8, late: 1, absent: 1, leave: 5 })).toBe(90); });
  it("returns null, not 0, when there is no data", () => { expect(attendancePercent({ present: 0, late: 0, absent: 0, leave: 3 })).toBeNull(); });
  it("tallies", () => { expect(tally([{ status: "present" }, { status: "absent" }, { status: "present" }])).toEqual({ present: 2, absent: 1, late: 0, leave: 0 }); });
  it("limits teacher edits to the window and blocks future dates", () => {
    expect(dateEditable({ date: "2026-05-10", today: "2026-05-09", isTeacher: false, windowDays: 2 }).ok).toBe(false);
    expect(dateEditable({ date: "2026-05-06", today: "2026-05-09", isTeacher: true, windowDays: 2 }).ok).toBe(false);
    expect(dateEditable({ date: "2026-05-07", today: "2026-05-09", isTeacher: true, windowDays: 2 }).ok).toBe(true);
    expect(dateEditable({ date: "2026-01-01", today: "2026-05-09", isTeacher: false, windowDays: 2 }).ok).toBe(true);
  });
});
describe("admissions", () => {
  it("only allows legal transitions", () => {
    expect(canTransition("draft", "submitted")).toBe(true); expect(canTransition("submitted", "approved")).toBe(false); expect(canTransition("rejected", "approved")).toBe(false); expect(canTransition("approved", "enrolled")).toBe(true);
  });
  it("enrolment is never a manual target", () => { expect(manualTargets("approved")).not.toContain("enrolled"); });
  it("dedupe key ignores case, spacing and punctuation", () => {
    expect(dedupeKey({ firstName: "Aarav ", lastName: "D'Souza", dob: "2015-04-10", guardianName: "Mr. John" })).toBe(dedupeKey({ firstName: "aarav", lastName: "dsouza", dob: new Date("2015-04-10"), guardianName: "MR JOHN" }));
    expect(dedupeKey({ firstName: "a", lastName: "b", dob: "2015-04-10", guardianName: "c" })).not.toBe(dedupeKey({ firstName: "a", lastName: "b", dob: "2015-04-11", guardianName: "c" }));
  });
});
describe("grading", () => {
  const scale = [{ min: 90, grade: "A+" }, { min: 60, grade: "B" }, { min: 0, grade: "F" }];
  it("maps percent to grade", () => { expect(gradeFor(95, scale)).toBe("A+"); expect(gradeFor(60, scale)).toBe("B"); expect(gradeFor(10, scale)).toBe("F"); });
  it("does not compute a total/grade while marks are missing", () => { const s = summarise([{ subjectId: "1", marks: 50, maxMarks: 100, passMarks: 35 }, { subjectId: "2", marks: null, maxMarks: 100, passMarks: 35 }], scale, 35); expect(s.complete).toBe(false); expect(s.percent).toBeNull(); expect(s.grade).toBeNull(); });
  it("fails a student who is below pass marks in any subject", () => { const s = summarise([{ subjectId: "1", marks: 95, maxMarks: 100, passMarks: 35 }, { subjectId: "2", marks: 20, maxMarks: 100, passMarks: 35 }], scale, 35); expect(s.percent).toBe(57.5); expect(s.passed).toBe(false); });
  it("treats absence as a fail but keeps the card complete", () => { const s = summarise([{ subjectId: "1", absent: true, maxMarks: 100, passMarks: 35 }], scale, 35); expect(s.complete).toBe(true); expect(s.passed).toBe(false); });
  it("ranks with ties and skips incomplete results", () => { const r = rankStudents([{ studentId: "a", percent: 90 }, { studentId: "b", percent: 90 }, { studentId: "c", percent: 70 }, { studentId: "d", percent: null }]); expect([r.get("a"), r.get("b"), r.get("c"), r.get("d")]).toEqual([1, 1, 3, undefined]); });
});
describe("assignment submission rules", () => {
  const due = new Date("2026-05-01T10:00:00Z");
  it("rejects late work unless allowed", () => { expect(submissionDecision({ dueAt: due, allowLate: false, allowResubmission: false, hasExisting: false, graded: false, now: new Date("2026-05-02") }).ok).toBe(false); expect(submissionDecision({ dueAt: due, allowLate: true, allowResubmission: false, hasExisting: false, graded: false, now: new Date("2026-05-02") })).toEqual({ ok: true, late: true }); });
  it("blocks resubmission unless allowed, and after grading", () => {
    expect(submissionDecision({ allowLate: false, allowResubmission: false, hasExisting: true, graded: false }).ok).toBe(false);
    expect(submissionDecision({ allowLate: false, allowResubmission: true, hasExisting: true, graded: false }).ok).toBe(true);
    expect(submissionDecision({ allowLate: false, allowResubmission: true, hasExisting: true, graded: true }).ok).toBe(false);
  });
});
describe("document access", () => {
  const base: Reader = { role: "student", userId: "u1", studentId: "s1", childIds: [], sectionIds: ["sec1"], canManage: false };
  it("limits a student to their own or section-targeted documents", () => {
    expect(canAccessDocument({ audience: ["staff"], sectionIds: [] }, base)).toBe(false);
    expect(canAccessDocument({ audience: ["staff"], ownerStudentId: "s1", sectionIds: [] }, base)).toBe(true);
    expect(canAccessDocument({ audience: ["staff"], ownerStudentId: "s2", sectionIds: [] }, base)).toBe(false);
    expect(canAccessDocument({ audience: ["students"], sectionIds: ["sec2"] }, base)).toBe(false);
    expect(canAccessDocument({ audience: ["students"], sectionIds: ["sec1"] }, base)).toBe(true);
  });
  it("limits parents to their linked children", () => { const p: Reader = { ...base, role: "parent", studentId: undefined, childIds: ["s1"] }; expect(canAccessDocument({ audience: [], ownerStudentId: "s1", sectionIds: [] }, p)).toBe(true); expect(canAccessDocument({ audience: [], ownerStudentId: "s9", sectionIds: [] }, p)).toBe(false); });
  it("hides soft-deleted documents from non-managers", () => { expect(canAccessDocument({ audience: ["students"], sectionIds: [], deleted: true }, base)).toBe(false); expect(canAccessDocument({ audience: [], sectionIds: [], deleted: true }, { ...base, canManage: true })).toBe(true); });
});
describe("notice visibility", () => {
  const n = { audience: ["parents"], classIds: [], sectionIds: [], studentIds: [] as string[] };
  it("respects audience", () => { expect(noticeVisible(n, { role: "parent" })).toBe(true); expect(noticeVisible(n, { role: "student" })).toBe(false); expect(noticeVisible({ ...n, audience: ["all"] }, { role: "student" })).toBe(true); });
  it("respects class targeting and expiry", () => {
    expect(noticeVisible({ ...n, audience: ["all"], classIds: ["c1"] }, { role: "student", classId: ["c2"] })).toBe(false); expect(noticeVisible({ ...n, audience: ["all"], classIds: ["c1"] }, { role: "student", classId: ["c1"] })).toBe(true);
    expect(noticeVisible({ ...n, audience: ["all"], expiresAt: new Date("2020-01-01") }, { role: "student" })).toBe(false);
  });
});
describe("permissions", () => {
  it("never lets overrides grant staff-only powers to teachers, students or parents", () => {
    for (const r of ["teacher", "student", "parent"] as const) { const o = sanitizeOverride(r, ["fee.write", "results.publish", "user.manage", "role.manage", "student.write"]); expect(o).not.toContain("fee.write"); expect(o).not.toContain("results.publish"); expect(o).not.toContain("user.manage"); }
  });
  it("keeps students and parents inside their default ceiling", () => { expect(sanitizeOverride("student", ["marks.enter", "attendance.mark"])).toEqual([]); });
  it("gives students no way to write, and super admin everything", () => { expect(roleHas("student", "student.write")).toBe(false); expect(roleHas("student", "results.read_published")).toBe(true); expect(roleHas("super_admin", "role.manage")).toBe(true); expect(DEFAULT_ROLE_PERMISSIONS.parent).not.toContain("fee.collect"); });
});
describe("dates & uploads", () => {
  it("validates date keys", () => { expect(isValidDateKey("2026-02-28")).toBe(true); expect(isValidDateKey("2026-02-30")).toBe(false); expect(isValidDateKey("26-1-1")).toBe(false); expect(monthRange("2026-02")).toEqual({ from: "2026-02-01", to: "2026-02-28" }); });
  it("accepts real files by magic bytes and rejects disguised ones", () => {
    expect(validateUpload(Buffer.from("%PDF-1.7 rest")).mime).toBe("application/pdf");
    expect(validateUpload(Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0])).mime).toBe("image/jpeg");
    expect(() => validateUpload(Buffer.from("<script>alert(1)</script>"))).toThrow(); expect(() => validateUpload(Buffer.alloc(0))).toThrow(); expect(() => validateUpload(Buffer.alloc(6 * 1024 * 1024, 1))).toThrow();
  });
});
