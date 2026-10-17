import { Types } from "mongoose";
import { scoped, type Ctx } from "@/lib/authorization/context";
import { Student } from "@/models";

export type Audience = "all" | "students" | "parents" | "teachers";
const ROLE_AUD: Record<string, Audience | null> = { student: "students", parent: "parents", teacher: "teachers", school_admin: null, super_admin: null };

/** Pure rule: may a reader with these attributes see this notice? */
export function noticeVisible(n: { audience: string[]; classIds: string[]; sectionIds: string[]; studentIds: string[]; expiresAt?: Date | null }, r: { role: string; classId?: string[]; sectionId?: string[]; studentIds?: string[] }, now = new Date()): boolean {
  if (r.role === "school_admin" || r.role === "super_admin") return true;
  if (n.expiresAt && n.expiresAt < now) return false;
  const aud = ROLE_AUD[r.role];
  if (!aud || !(n.audience.includes("all") || n.audience.includes(aud))) return false;
  const targeted = n.classIds.length + n.sectionIds.length + n.studentIds.length > 0;
  if (!targeted || r.role === "teacher") return true;
  return n.classIds.some((c) => r.classId?.includes(c)) || n.sectionIds.some((s) => r.sectionId?.includes(s)) || n.studentIds.some((s) => r.studentIds?.includes(s));
}

/** Resolves the student placement a learner/parent reader has, server-side. */
export async function readerPlacement(ctx: Ctx) {
  const ids = ctx.role === "student" && ctx.studentId ? [ctx.studentId] : ctx.role === "parent" ? ctx.childIds : [];
  if (!ids.length) return { classId: [], sectionId: [], studentIds: [] as string[] };
  const ss = await Student.find({ ...scoped(ctx), _id: { $in: ids.map((i) => new Types.ObjectId(i)) } }).select("classId sectionId").lean();
  return { classId: ss.map((s) => String(s.classId)), sectionId: ss.map((s) => String(s.sectionId)), studentIds: ids };
}
