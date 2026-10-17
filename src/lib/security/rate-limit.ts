/**
 * Fixed-window in-memory limiter. Adequate for a single Node process (dev / one instance).
 * For multi-instance production, swap `store` for Redis — call sites stay the same.
 */
const store = new Map<string, { count: number; reset: number }>();

export function rateLimit(key: string, limit: number, windowMs: number): { ok: boolean; retryAfterSec: number } {
  const now = Date.now();
  const e = store.get(key);
  if (!e || e.reset <= now) { store.set(key, { count: 1, reset: now + windowMs }); return { ok: true, retryAfterSec: 0 }; }
  e.count += 1;
  if (e.count > limit) return { ok: false, retryAfterSec: Math.ceil((e.reset - now) / 1000) };
  return { ok: true, retryAfterSec: 0 };
}

export function clientIp(h: Headers): string {
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
}

setInterval(() => { const now = Date.now(); for (const [k, v] of store) if (v.reset <= now) store.delete(k); }, 60_000).unref?.();
