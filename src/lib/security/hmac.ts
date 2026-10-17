import { createHmac, timingSafeEqual } from "node:crypto";

export function hmacSha256Hex(secret: string, payload: string | Buffer): string {
  return createHmac("sha256", secret).update(payload).digest("hex");
}

/** Constant-time comparison of two hex strings. Different lengths / bad input → false (never throws). */
export function safeEqualHex(a: string, b: string): boolean {
  if (typeof a !== "string" || typeof b !== "string") return false;
  if (!/^[0-9a-f]+$/i.test(a) || !/^[0-9a-f]+$/i.test(b)) return false;
  const ba = Buffer.from(a.toLowerCase(), "hex");
  const bb = Buffer.from(b.toLowerCase(), "hex");
  if (ba.length !== bb.length || ba.length === 0) return false;
  return timingSafeEqual(ba, bb);
}

/** Verifies `signature` (hex) == HMAC-SHA256(secret, rawBody). rawBody must be the exact bytes received. */
export function verifyHmacSha256(secret: string, rawBody: string | Buffer, signature: string | null | undefined): boolean {
  if (!secret || !signature) return false;
  return safeEqualHex(hmacSha256Hex(secret, rawBody), signature.trim());
}
