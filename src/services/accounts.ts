import { Types } from "mongoose";
import { conflict } from "@/lib/api/errors";
import { newToken } from "@/lib/security/crypto";
import { Membership, User } from "@/models";

const ACTIVATION_TTL_MS = 72 * 3600_000;

/**
 * Creates (or links) a login for a person and returns a one-time activation token.
 * Email isn't configured here, so the token is shown once to the admin to hand over — never stored in plaintext.
 */
export async function createAccount(i: { schoolId: string; role: "school_admin" | "teacher" | "student" | "parent"; name: string; email: string; link?: { studentId?: string; teacherId?: string; guardianId?: string } }) {
  const email = i.email.trim().toLowerCase();
  let user = await User.findOne({ email });
  let token: string | null = null;
  if (!user) {
    const t = newToken();
    token = t.token;
    user = await User.create({ email, name: i.name, active: true, activationTokenHash: t.hash, activationTokenExpires: new Date(Date.now() + ACTIVATION_TTL_MS) });
  }
  const exists = await Membership.exists({ userId: user._id, schoolId: i.schoolId, role: i.role });
  if (exists) throw conflict("This person already has an account in this school.");
  await Membership.create({ userId: user._id, schoolId: new Types.ObjectId(i.schoolId), role: i.role, active: true, ...i.link });
  return { userId: String(user._id), activationToken: token, activationPath: token ? `/reset-password?token=${token}&activate=1` : null };
}
