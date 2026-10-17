import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { connectDB } from "@/lib/db/connect";
import { ApiError, fail } from "@/lib/api/errors";
import { assertSameOrigin, body } from "@/lib/api/route";
import { clientIp, rateLimit } from "@/lib/security/rate-limit";
import { hashPassword, passwordPolicyError, sha256 } from "@/lib/security/crypto";
import { User } from "@/models";
import { audit } from "@/lib/audit";

const schema = z.object({ token: z.string().min(20).max(200), password: z.string().min(1).max(200) });

/** Handles both password reset and first-time account activation. Tokens are single-use and expire. */
export async function POST(req: NextRequest) {
  try {
    assertSameOrigin(req);
    await connectDB();
    const { token, password } = await body(req, schema);
    const ip = clientIp(req.headers);
    if (!rateLimit(`reset:${ip}`, 10, 15 * 60_000).ok) throw new ApiError(429, "RATE_LIMITED", "Too many attempts. Try later.");
    const policy = passwordPolicyError(password);
    if (policy) throw new ApiError(422, "WEAK_PASSWORD", policy);
    const hash = sha256(token); const now = new Date();
    const user = await User.findOne({ $or: [{ resetTokenHash: hash, resetTokenExpires: { $gt: now } }, { activationTokenHash: hash, activationTokenExpires: { $gt: now } }] });
    if (!user) throw new ApiError(400, "INVALID_TOKEN", "This link is invalid or has expired. Request a new one.");
    await User.updateOne({ _id: user._id }, { passwordHash: await hashPassword(password), $inc: { tokenVersion: 1 }, failedLogins: 0, activatedAt: user.activatedAt ?? now, $unset: { resetTokenHash: 1, resetTokenExpires: 1, activationTokenHash: 1, activationTokenExpires: 1, lockedUntil: 1 } });
    await audit(null, "auth.password_reset", "User", user._id, undefined, { ip });
    return NextResponse.json({ ok: true, data: { message: "Password set. You can sign in now." } });
  } catch (e) { return fail(e); }
}
