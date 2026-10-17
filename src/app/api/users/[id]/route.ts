import { z } from "zod";
import { body, route } from "@/lib/api/route";
import { badRequest, notFound } from "@/lib/api/errors";
import { scoped } from "@/lib/authorization/context";
import { Membership, User } from "@/models";
import { newToken } from "@/lib/security/crypto";
import { audit } from "@/lib/audit";

/** Activate/deactivate this person's access to THIS school, or issue a fresh password-reset link. */
export const PATCH = route<{ id: string }>({ perm: "user.manage" }, async ({ req, ctx, params }) => {
  const d = await body(req, z.object({ active: z.boolean().optional(), resetLink: z.boolean().optional() }));
  if (params.id === ctx.userId && d.active === false) throw badRequest("You cannot deactivate yourself.");
  const ms = await Membership.find({ userId: params.id, ...scoped(ctx) });
  if (!ms.length) throw notFound("User");
  let resetPath: string | undefined;
  if (d.active !== undefined) {
    await Membership.updateMany({ userId: params.id, ...scoped(ctx) }, { active: d.active });
    if (!d.active) await User.updateOne({ _id: params.id }, { $inc: { tokenVersion: 1 } });
  }
  if (d.resetLink) { const t = newToken(); await User.updateOne({ _id: params.id }, { resetTokenHash: t.hash, resetTokenExpires: new Date(Date.now() + 3600_000) }); resetPath = `/reset-password?token=${t.token}`; }
  await audit(ctx, "user.update", "User", params.id, { active: d.active, resetLink: !!d.resetLink });
  return { ok: true, resetPath };
});
