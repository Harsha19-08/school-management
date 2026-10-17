import { z } from "zod";
import { body, route } from "@/lib/api/route";
import { RoleConfig } from "@/models";
import { scoped } from "@/lib/authorization/context";
import { DEFAULT_ROLE_PERMISSIONS, PERMISSIONS, sanitizeOverride, type Permission, type Role } from "@/lib/authorization/permissions";
import { User } from "@/models";
import { Membership } from "@/models";
import { audit } from "@/lib/audit";

const ROLES = ["school_admin", "teacher", "student", "parent"] as const;

export const GET = route({ perm: "role.manage" }, async ({ ctx }) => {
  const cfgs = await RoleConfig.find(scoped(ctx)).lean();
  const m = new Map(cfgs.map((c) => [c.role, c.permissions as Permission[]]));
  return { permissions: PERMISSIONS, roles: ROLES.map((r) => ({ role: r, permissions: m.get(r) ?? DEFAULT_ROLE_PERMISSIONS[r], customised: m.has(r) })) };
});

/** Overrides are clamped to the role's ceiling so a teacher/student/parent can never be granted staff-only powers. */
export const PUT = route({ perm: "role.manage" }, async ({ req, ctx }) => {
  const d = await body(req, z.object({ role: z.enum(ROLES), permissions: z.array(z.enum(PERMISSIONS)).max(60), reset: z.boolean().optional() }));
  if (d.reset) await RoleConfig.deleteOne({ ...scoped(ctx), role: d.role });
  else {
    const clean = sanitizeOverride(d.role as Role, d.permissions);
    if (d.role === "school_admin" && !clean.includes("role.manage")) clean.push("role.manage"); // never lock admins out of roles
    await RoleConfig.updateOne({ ...scoped(ctx), role: d.role }, { $set: { permissions: clean } }, { upsert: true });
  }
  const members = await Membership.find({ ...scoped(ctx), role: d.role }).select("userId").lean();
  await User.updateMany({ _id: { $in: members.map((x) => x.userId) } }, { $inc: { tokenVersion: 0 } });
  await audit(ctx, "role.update", "RoleConfig", d.role, { reset: !!d.reset });
  return { ok: true };
});
