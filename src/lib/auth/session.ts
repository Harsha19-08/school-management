import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

export const SESSION_COOKIE = "sp_session";

export interface SessionClaims {
  uid: string;
  tv: number; // user.tokenVersion at issue time
  sid?: string; // selected school (verified against membership on every request)
}

function secret(): Uint8Array {
  const s = process.env.AUTH_SECRET;
  if (!s || s.length < 32) throw new Error("AUTH_SECRET must be set to a random string of at least 32 characters.");
  return new TextEncoder().encode(s);
}

export async function signSession(claims: SessionClaims, remember: boolean): Promise<string> {
  return new SignJWT({ ...claims }).setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime(remember ? "14d" : "12h").sign(secret());
}

export async function verifySession(token: string | undefined): Promise<SessionClaims | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret(), { algorithms: ["HS256"] });
    if (typeof payload.uid !== "string" || typeof payload.tv !== "number") return null;
    return { uid: payload.uid, tv: payload.tv, sid: typeof payload.sid === "string" ? payload.sid : undefined };
  } catch { return null; }
}

export async function setSessionCookie(claims: SessionClaims, remember = false) {
  const jar = await cookies();
  jar.set(SESSION_COOKIE, await signSession(claims, remember), {
    httpOnly: true, secure: process.env.NODE_ENV === "production",
    sameSite: "lax", // CSRF: not sent on cross-site POSTs; mutations are also Origin-checked
    path: "/", ...(remember ? { maxAge: 14 * 24 * 3600 } : {}),
  });
}
export async function clearSessionCookie() { (await cookies()).delete(SESSION_COOKIE); }
export async function readSessionClaims(): Promise<SessionClaims | null> { return verifySession((await cookies()).get(SESSION_COOKIE)?.value); }
