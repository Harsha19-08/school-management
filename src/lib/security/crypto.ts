import bcrypt from "bcryptjs";
import { createHash, randomBytes } from "node:crypto";

const ROUNDS = process.env.NODE_ENV === "test" ? 4 : 12;
export const hashPassword = (plain: string) => bcrypt.hash(plain, ROUNDS);
export const verifyPassword = (plain: string, hash: string) => bcrypt.compare(plain, hash);
export const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");

/** Opaque random token for reset/activation; only its SHA-256 is stored. */
export function newToken(): { token: string; hash: string } {
  const token = randomBytes(32).toString("base64url");
  return { token, hash: sha256(token) };
}

export function passwordPolicyError(pw: string): string | null {
  if (pw.length < 10) return "Password must be at least 10 characters.";
  if (!/[a-z]/.test(pw) || !/[A-Z]/.test(pw) || !/\d/.test(pw)) return "Use upper-case, lower-case letters and a number.";
  return null;
}
