import { Types } from "mongoose";
import { redirect } from "next/navigation";
import { connectDB } from "@/lib/db/connect";
import { readSessionClaims } from "@/lib/auth/session";
import { Guardian, Membership, RoleConfig, School, SuperAdmin, User } from "@/models";
import { forbidden, notFound, unauthorized } from "@/lib/api/errors";
import { roleHas, type Permission, type Role } from "./permissions";

export interface Ctx {
  userId: string; name: string; email: string; role: Role; isSuper: boolean;
  /** The ONLY school this request may touch. Always derived server-side from a verified membership. */
  schoolId: string; schoolSlug: "das" | "stmarys"; schoolName: string; timeZone: string;
  studentId?: string; teacherId?: string; guardianId?: string;
  /** For parents: the only students they may see. */
  childIds: string[];
  overrides: Permission[] | null;
}

export async function getCtx(): Promise<Ctx | null> {
  const claims = await readSessionClaims();
  if (!claims || !Types.ObjectId.isValid(claims.uid)) return null;
  await connectDB();
  const user = await User.findById(claims.uid).lean();
  if (!user || !user.active || user.tokenVersion !== claims.tv) return null;
  const isSuper = !!(await SuperAdmin.exists({ userId: user._id, active: true }));

  let school; let role: Role; let membership;
  if (isSuper) {
    role = "super_admin";
    school = (claims.sid && Types.ObjectId.isValid(claims.sid) ? await School.findById(claims.sid).lean() : null) ?? (await School.findOne({ active: true }).sort({ slug: 1 }).lean());
  } else {
    const memberships = await Membership.find({ userId: user._id, active: true }).lean();
    membership = memberships.find((m) => String(m.schoolId) === claims.sid) ?? (memberships.length === 1 ? memberships[0] : null);
    if (!membership) return null; // forged/stale school claim → no access
    role = membership.role as Role;
    school = await School.findOne({ _id: membership.schoolId, active: true }).lean();
  }
  if (!school) return null;

  let childIds: string[] = [];
  if (role === "parent" && membership?.guardianId) {
    const g = await Guardian.findOne({ _id: membership.guardianId, schoolId: school._id }).lean();
    childIds = (g?.studentIds ?? []).map(String);
  }
  const cfg = isSuper ? null : await RoleConfig.findOne({ schoolId: school._id, role }).lean();
  return {
    userId: String(user._id), name: user.name, email: user.email, role, isSuper,
    schoolId: String(school._id), schoolSlug: school.slug as "das" | "stmarys", schoolName: school.name, timeZone: school.timeZone ?? "Asia/Kolkata",
    studentId: membership?.studentId ? String(membership.studentId) : undefined, teacherId: membership?.teacherId ? String(membership.teacherId) : undefined, guardianId: membership?.guardianId ? String(membership.guardianId) : undefined,
    childIds, overrides: cfg?.permissions?.length ? (cfg.permissions as Permission[]) : null,
  };
}

export function can(ctx: Ctx, perm: Permission): boolean { return roleHas(ctx.role, perm, ctx.overrides); }

/** For route handlers / server actions. Throws ApiError. */
export async function requireCtx(opts: { perm?: Permission | Permission[]; roles?: Role[] } = {}): Promise<Ctx> {
  const ctx = await getCtx();
  if (!ctx) throw unauthorized();
  if (opts.roles && !opts.roles.includes(ctx.role)) throw forbidden();
  if (opts.perm) {
    const perms = Array.isArray(opts.perm) ? opts.perm : [opts.perm];
    if (!perms.every((p) => can(ctx, p))) throw forbidden();
  }
  return ctx;
}

/** For server components/pages. Redirects instead of throwing. */
export async function requirePage(opts: { perm?: Permission; roles?: Role[] } = {}): Promise<Ctx> {
  const ctx = await getCtx();
  if (!ctx) redirect("/login");
  if (opts.roles && !opts.roles.includes(ctx.role)) redirect(homeFor(ctx.role));
  if (opts.perm && !can(ctx, opts.perm)) redirect(homeFor(ctx.role));
  return ctx;
}

export function homeFor(role: Role): string {
  switch (role) {
    case "super_admin": case "school_admin": return "/admin";
    case "teacher": return "/teacher";
    case "student": return "/student";
    case "parent": return "/parent";
  }
}

export const scoped = (ctx: Pick<Ctx, "schoolId">) => ({ schoolId: new Types.ObjectId(ctx.schoolId) });
export const oidOf = (id: string) => new Types.ObjectId(id);

/** Which student's data is this request allowed to read? Never trusts the browser's id alone. */
export async function resolveStudentScope(ctx: Ctx, requested?: string | null): Promise<string> {
  if (ctx.role === "student") {
    if (!ctx.studentId) throw forbidden();
    return ctx.studentId; // ignores any requested id
  }
  if (ctx.role === "parent") {
    const id = requested || ctx.childIds[0];
    if (!id || !ctx.childIds.includes(id)) throw notFound("Student");
    return id;
  }
  if (!requested || !Types.ObjectId.isValid(requested)) throw notFound("Student");
  const { Student } = await import("@/models");
  const s = await Student.findOne({ _id: requested, ...scoped(ctx) }).select("sectionId").lean();
  if (!s) throw notFound("Student");
  if (ctx.role === "teacher") await assertTeacherSection(ctx, String(s.sectionId));
  return requested;
}

/** A teacher may only act on sections they are assigned to (or are class teacher of). */
export async function assertTeacherSection(ctx: Pick<Ctx, "role" | "teacherId" | "schoolId">, sectionId: string): Promise<void> {
  if (ctx.role !== "teacher") return;
  const { Teacher, Section } = await import("@/models");
  if (!ctx.teacherId) throw forbidden();
  const t = await Teacher.findOne({ _id: ctx.teacherId, ...scoped(ctx) }).lean();
  const assigned = (t?.assignments ?? []).some((a: { sectionId: unknown }) => String(a.sectionId) === sectionId);
  const classTeacher = await Section.exists({ _id: sectionId, ...scoped(ctx), classTeacherId: ctx.teacherId });
  if (!assigned && !classTeacher) throw forbidden("You are not assigned to this class.");
}
