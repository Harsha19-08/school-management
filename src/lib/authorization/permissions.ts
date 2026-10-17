export const ROLES = ["super_admin", "school_admin", "teacher", "student", "parent"] as const;
export type Role = (typeof ROLES)[number];

export const PERMISSIONS = [
  "school.manage", "school.settings", "user.manage", "role.manage", "audit.view",
  "student.read", "student.write", "student.export",
  "admission.read", "admission.write", "admission.decide",
  "academics.read", "academics.write",
  "attendance.read", "attendance.mark",
  "assignment.read", "assignment.write", "assignment.submit",
  "exam.read", "exam.write", "marks.enter", "results.publish", "results.read_published",
  "fee.read", "fee.write", "fee.collect", "fee.reverse", "fee.read_own",
  "event.read", "event.write", "notice.read", "notice.write",
  "document.read", "document.write", "document.read_own",
  "report.read", "teacher.read", "teacher.write",
] as const;
export type Permission = (typeof PERMISSIONS)[number];

const ALL: Permission[] = [...PERMISSIONS];

/** Default permission matrix. School admins may have a subset overridden per school (RoleConfig). */
export const DEFAULT_ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  super_admin: ALL,
  school_admin: ALL.filter((p) => p !== "school.manage"),
  teacher: ["student.read", "academics.read", "attendance.read", "attendance.mark", "assignment.read", "assignment.write", "exam.read", "marks.enter", "event.read", "notice.read", "notice.write", "document.read", "teacher.read"],
  student: ["academics.read", "attendance.read", "assignment.read", "assignment.submit", "exam.read", "results.read_published", "fee.read_own", "event.read", "notice.read", "document.read_own"],
  parent: ["academics.read", "attendance.read", "assignment.read", "exam.read", "results.read_published", "fee.read_own", "event.read", "notice.read", "document.read_own"],
};

/** Permissions a school-level override may never grant to a non-admin role (least-privilege ceiling). */
export const STAFF_ONLY: Permission[] = ["school.manage", "school.settings", "user.manage", "role.manage", "audit.view", "student.write", "student.export", "admission.decide", "fee.write", "fee.collect", "fee.reverse", "results.publish"];

export function roleHas(role: Role, perm: Permission, overrides?: Permission[] | null): boolean {
  if (role === "super_admin") return true;
  const base = overrides ?? DEFAULT_ROLE_PERMISSIONS[role];
  return base.includes(perm);
}

export function sanitizeOverride(role: Role, requested: Permission[]): Permission[] {
  if (role === "student" || role === "parent") return requested.filter((p) => DEFAULT_ROLE_PERMISSIONS[role].includes(p));
  if (role === "teacher") return requested.filter((p) => !STAFF_ONLY.includes(p));
  return requested.filter((p) => p !== "school.manage");
}

export const STAFF_ROLES: Role[] = ["super_admin", "school_admin"];
export const isStaff = (r: Role) => STAFF_ROLES.includes(r);
