import { z } from "zod";
import { body, route } from "@/lib/api/route";
import { ApiError } from "@/lib/api/errors";
import { User } from "@/models";
import { hashPassword, passwordPolicyError, verifyPassword } from "@/lib/security/crypto";
import { rateLimit } from "@/lib/security/rate-limit";
import { setSessionCookie } from "@/lib/auth/session";
import { audit } from "@/lib/audit";

/** Changing the password bumps tokenVersion, signing out every other device; this device is re-issued a fresh session. */
export const POST = route({}, async ({ req, ctx }) => {
  const d = await body(req, z.object({ current: z.string().min(1).max(200), next: z.string().min(1).max(200) }));
  if (!rateLimit(`chpw:${ctx.userId}`, 8, 15 * 60_000).ok) throw new ApiError(429, "RATE_LIMITED", "Too many attempts. Try later.");
  const policy = passwordPolicyError(d.next); if (policy) throw new ApiError(422, "WEAK_PASSWORD", policy);
  const u = await User.findById(ctx.userId).select("+passwordHash");
  if (!u?.passwordHash || !(await verifyPassword(d.current, u.passwordHash))) throw new ApiError(400, "WRONG_PASSWORD", "Current password is incorrect.");
  u.passwordHash = await hashPassword(d.next); u.tokenVersion += 1; await u.save();
  await setSessionCookie({ uid: String(u._id), tv: u.tokenVersion, sid: ctx.isSuper ? ctx.schoolId : ctx.schoolId });
  await audit(ctx, "auth.password_change", "User", u._id);
  return { ok: true };
});
