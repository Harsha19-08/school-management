export interface DocLike { audience: string[]; ownerStudentId?: string | null; sectionIds: string[]; uploadedBy?: string | null; deleted?: boolean }
export interface Reader { role: string; userId: string; studentId?: string; childIds: string[]; sectionIds: string[]; canManage: boolean }

/** Pure access rule shared by list + download. Soft-deleted docs are invisible to everyone except managers. */
export function canAccessDocument(d: DocLike, r: Reader): boolean {
  if (r.canManage) return true;
  if (d.deleted) return false;
  if (d.uploadedBy && d.uploadedBy === r.userId) return true;
  switch (r.role) {
    case "teacher": return d.audience.includes("teachers");
    case "student": {
      if (d.ownerStudentId) return d.ownerStudentId === r.studentId;
      return d.audience.includes("students") && (d.sectionIds.length === 0 || d.sectionIds.some((s) => r.sectionIds.includes(s)));
    }
    case "parent": {
      if (d.ownerStudentId) return r.childIds.includes(d.ownerStudentId);
      return d.audience.includes("parents") && (d.sectionIds.length === 0 || d.sectionIds.some((s) => r.sectionIds.includes(s)));
    }
    default: return false;
  }
}
