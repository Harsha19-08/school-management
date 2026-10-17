import { Types } from "mongoose";
import { AuditLog } from "@/models";
import type { Ctx } from "@/lib/authorization/context";

const SENSITIVE = /pass(word)?|token|secret|hash|otp|cvv|card/i;
const clean = (meta: Record<string, unknown> | undefined) => (meta ? Object.fromEntries(Object.entries(meta).filter(([k]) => !SENSITIVE.test(k))) : undefined);

/** Records who did what, where. Never pass passwords/tokens; sensitive-looking keys are dropped defensively. */
export async function audit(
  ctx: (Pick<Ctx, "userId" | "role"> & { schoolId?: string }) | null, action: string, entity?: string, entityId?: string | Types.ObjectId,
  meta?: Record<string, unknown>, opts?: { schoolId?: string; ip?: string },
) {
  try {
    await AuditLog.create({ schoolId: opts?.schoolId ?? ctx?.schoolId, actorId: ctx?.userId, actorRole: ctx?.role, action, entity, entityId: entityId ? String(entityId) : undefined, meta: clean(meta), ip: opts?.ip });
  } catch (e) { console.error("[audit] failed", e instanceof Error ? e.message : "unknown"); }
}
