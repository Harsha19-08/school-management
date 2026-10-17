import { NextResponse } from "next/server";
import { ZodError } from "zod";

export class ApiError extends Error {
  constructor(public status: number, public code: string, message: string, public details?: unknown) { super(message); }
}
export const unauthorized = () => new ApiError(401, "UNAUTHENTICATED", "Please sign in.");
export const forbidden = (m = "You do not have permission to do that.") => new ApiError(403, "FORBIDDEN", m);
/** Cross-school or out-of-scope lookups deliberately look identical to missing records. */
export const notFound = (what = "Record") => new ApiError(404, "NOT_FOUND", `${what} not found.`);
export const conflict = (m: string) => new ApiError(409, "CONFLICT", m);
export const badRequest = (m: string, details?: unknown) => new ApiError(400, "BAD_REQUEST", m, details);

export function ok<T>(data: T, init?: ResponseInit) { return NextResponse.json({ ok: true, data }, init); }

export function fail(e: unknown) {
  if (e instanceof ApiError) return NextResponse.json({ ok: false, error: { code: e.code, message: e.message, details: e.details } }, { status: e.status });
  if (e instanceof ZodError) return NextResponse.json({ ok: false, error: { code: "VALIDATION", message: "Please check the highlighted fields.", details: e.flatten().fieldErrors } }, { status: 422 });
  const mongo = e as { code?: number; name?: string };
  if (mongo?.code === 11000) return NextResponse.json({ ok: false, error: { code: "DUPLICATE", message: "That record already exists." } }, { status: 409 });
  if (mongo?.name === "CastError") return NextResponse.json({ ok: false, error: { code: "NOT_FOUND", message: "Record not found." } }, { status: 404 });
  console.error("[api] unhandled", e instanceof Error ? e.message : "unknown error"); // never log bodies/tokens
  return NextResponse.json({ ok: false, error: { code: "INTERNAL", message: "Something went wrong." } }, { status: 500 });
}
