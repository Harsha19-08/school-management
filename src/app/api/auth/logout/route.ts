import { NextResponse, type NextRequest } from "next/server";
import { fail } from "@/lib/api/errors";
import { assertSameOrigin } from "@/lib/api/route";
import { clearSessionCookie } from "@/lib/auth/session";

export async function POST(req: NextRequest) {
  try { assertSameOrigin(req); await clearSessionCookie(); return NextResponse.json({ ok: true, data: { redirect: "/login" } }); } catch (e) { return fail(e); }
}
