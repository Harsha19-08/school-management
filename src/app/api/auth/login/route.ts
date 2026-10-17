import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { connectDB } from "@/lib/db/connect";
import { ApiError, fail } from "@/lib/api/errors";
import { assertSameOrigin, body } from "@/lib/api/route";
import { clientIp, rateLimit } from "@/lib/security/rate-limit";
import { verifyPassword } from "@/lib/security/crypto";
import { setSessionCookie } from "@/lib/auth/session";
import { Membership, SuperAdmin, User } from "@/models";
import { audit } from "@/lib/audit";
import { homeFor } from "@/lib/authorization/context";
import type { Role } from "@/lib/authorization/permissions";

const schema = z.object({ identifier: z.string().trim().min(1).max(120), password: z.string().min(1).max(200), remember: z.boolean().optional() });
const BAD = () => new ApiError(401, "INVALID_CREDENTIALS", "Incorrect email/username or password."); // never reveals which part
const MAX_FAILS = 5; const LOCK_MS = 15 * 60_000;

export async function POST(req: NextRequest) {
  try {
    assertSameOrigin(req);
    await connectDB();
    const { identifier, password, remember } = await body(req, schema);
    const id = identifier.toLowerCase();
    const ip = clientIp(req.headers);
    const rl = rateLimit(`login:${ip}:${id}`, 10, 15 * 60_000);
    const rlIp = rateLimit(`login-ip:${ip}`, 40, 15 * 60_000);
    if (!rl.ok || !rlIp.ok) throw new ApiError(429, "RATE_LIMITED", `Too many attempts. Try again in ${Math.max(rl.retryAfterSec, rlIp.retryAfterSec)}s.`);

    const user = await User.findOne({ $or: [{ email: id }, { username: id }] }).select("+passwordHash");
    if (user?.lockedUntil && user.lockedUntil > new Date()) throw new ApiError(423, "LOCKED", "Account temporarily locked after repeated failures. Try again later.");
    // Same cost whether or not the user exists, to blunt timing probes.
    const valid = user?.passwordHash ? await verifyPassword(password, user.passwordHash) : (await verifyPassword(password, "$2a$12$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvali"), false);
    if (!user || !valid || !user.active) {
      if (user) {
        const fails = (user.failedLogins ?? 0) + 1;
        await User.updateOne({ _id: user._id }, fails >= MAX_FAILS ? { failedLogins: 0, lockedUntil: new Date(Date.now() + LOCK_MS) } : { failedLogins: fails });
        await audit(null, "auth.login_failed", "User", user._id, { reason: user.active ? "bad_password" : "inactive" }, { ip });
      }
      throw BAD();
    }

    const isSuper = !!(await SuperAdmin.exists({ userId: user._id, active: true }));
    const memberships = isSuper ? [] : await Membership.find({ userId: user._id, active: true }).lean();
    if (!isSuper && memberships.length === 0) throw new ApiError(403, "NO_ACCESS", "Your account is not assigned to a school. Contact the school office.");
    await User.updateOne({ _id: user._id }, { failedLogins: 0, $unset: { lockedUntil: 1 }, lastLoginAt: new Date() });
    const sid = isSuper ? undefined : String(memberships[0].schoolId);
    await setSessionCookie({ uid: String(user._id), tv: user.tokenVersion, sid }, !!remember);
    const role: Role = isSuper ? "super_admin" : (memberships[0].role as Role);
    await audit({ userId: String(user._id), role, schoolId: sid }, "auth.login", "User", user._id, undefined, { ip, schoolId: sid });
    return NextResponse.json({ ok: true, data: { redirect: homeFor(role) } });
  } catch (e) { return fail(e); }
}
