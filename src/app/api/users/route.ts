import { z } from "zod";
import { body, pageQuery, paged, query, route } from "@/lib/api/route";
import { scoped } from "@/lib/authorization/context";
import { Membership, User } from "@/models";
import { createAccount } from "@/services/accounts";
import { audit } from "@/lib/audit";

export const GET = route({ perm: "user.manage" }, async ({ req, ctx }) => {
  const q = query(req, pageQuery.extend({ role: z.string().optional() }));
  const mf: Record<string, unknown> = { ...scoped(ctx) }; if (q.role) mf.role = q.role;
  const ms = await Membership.find(mf).sort({ createdAt: -1 }).lean();
  const users = await User.find({ _id: { $in: ms.map((m) => m.userId) }, ...(q.q ? { $or: [{ name: new RegExp(q.q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i") }, { email: new RegExp(q.q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i") }] } : {}) }).lean();
  const um = new Map(users.map((u) => [String(u._id), u]));
  const rows = ms.filter((m) => um.has(String(m.userId))).map((m) => { const u = um.get(String(m.userId))!; return { id: String(u._id), membershipId: String(m._id), name: u.name, email: u.email, role: m.role, active: m.active && u.active, activated: !!u.activatedAt, lastLoginAt: u.lastLoginAt }; });
  return paged(rows.slice((q.page - 1) * q.pageSize, q.page * q.pageSize), rows.length, q.page, q.pageSize);
});

/** Creates a school admin login (other roles are created from their own records). Returns a one-time activation link. */
export const POST = route({ perm: "user.manage", roles: ["super_admin", "school_admin"] }, async ({ req, ctx }) => {
  const d = await body(req, z.object({ name: z.string().trim().min(2).max(80), email: z.string().trim().toLowerCase().email() }));
  const acc = await createAccount({ schoolId: ctx.schoolId, role: "school_admin", name: d.name, email: d.email });
  await audit(ctx, "user.create", "User", acc.userId, { role: "school_admin" });
  return { activationPath: acc.activationPath, existingUser: !acc.activationToken };
});
