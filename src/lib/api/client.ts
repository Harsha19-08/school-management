export class ClientApiError extends Error {
  constructor(message: string, public status: number, public code?: string, public fields?: Record<string, string>) { super(message); }
}

/** Typed fetch wrapper for our `{ok,data}` / `{ok:false,error}` envelope. */
export async function api<T = unknown>(url: string, init?: Omit<RequestInit, "body"> & { json?: unknown; form?: FormData; redirectOnUnauthorized?: boolean }): Promise<T> {
  const { json, form, headers, redirectOnUnauthorized = true, ...rest } = init ?? {};
  const res = await fetch(url, {
    ...rest, credentials: "same-origin",
    headers: { ...(json !== undefined ? { "Content-Type": "application/json" } : {}), ...headers },
    body: form ?? (json !== undefined ? JSON.stringify(json) : undefined),
  });
  let payload: { ok?: boolean; data?: T; error?: { message?: string; code?: string; details?: Record<string, string[] | string> } } | null = null;
  try { payload = await res.json(); } catch { /* non-JSON */ }
  if (!res.ok || !payload?.ok) {
    if (res.status === 401 && redirectOnUnauthorized && typeof window !== "undefined") window.location.assign("/login");
    throw new ClientApiError(payload?.error?.message ?? `Request failed (${res.status})`, res.status, payload?.error?.code, flat(payload?.error?.details));
  }
  return payload.data as T;
}

function flat(d: unknown): Record<string, string> | undefined {
  if (!d || typeof d !== "object") return undefined;
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(d as Record<string, unknown>)) out[k] = Array.isArray(v) ? String(v[0]) : String(v);
  return out;
}

export function qs(params: Record<string, string | number | boolean | undefined | null>): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== null && v !== "") sp.set(k, String(v));
  const s = sp.toString();
  return s ? `?${s}` : "";
}

export const fieldErrors = (e: unknown): Record<string, string> => (e instanceof ClientApiError && e.fields ? e.fields : {});
export const errMsg = (e: unknown): string => (e instanceof Error ? e.message : "Something went wrong");
