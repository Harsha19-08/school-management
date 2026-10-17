import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { connectDB } from "@/lib/db/connect";
import { fail } from "@/lib/api/errors";
import { assertSameOrigin, body } from "@/lib/api/route";
import { clientIp, rateLimit } from "@/lib/security/rate-limit";
import { newToken } from "@/lib/security/crypto";
import { User } from "@/models";
import { audit } from "@/lib/audit";

const MESSAGE = "If that account exists, a reset link has been prepared. Email delivery is not configured in this deployment, so ask the school office to share the link.";

export async function POST(req: NextRequest) {
  try {
    assertSameOrigin(req);
    await connectDB();
    const { identifier } = await body(req, z.object({ identifier: z.string().trim().min(1).max(120) }));
    const ip = clientIp(req.headers);
    if (!rateLimit(`forgot:${ip}`, 5, 15 * 60_000).ok) return NextResponse.json({ ok: true, data: { message: MESSAGE } }); // same answer: no oracle
    const id = identifier.toLowerCase();
    const user = await User.findOne({ $or: [{ email: id }, { username: id }], active: true });
    let devResetPath: string | undefined;
    if (user) {
      const t = newToken();
      await User.updateOne({ _id: user._id }, { resetTokenHash: t.hash, resetTokenExpires: new Date(Date.now() + 3600_000) });
      await audit(null, "auth.reset_requested", "User", user._id, undefined, { ip });
      // The link is only ever exposed outside production, because there is no email provider to deliver it.
      if (process.env.NODE_ENV !== "production") devResetPath = `/reset-password?token=${t.token}`;
    }
    return NextResponse.json({ ok: true, data: { message: MESSAGE, devResetPath } });
  } catch (e) { return fail(e); }
}
