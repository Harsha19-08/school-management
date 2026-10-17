import { NextResponse, type NextRequest } from "next/server";

/**
 * Coarse gate only: bounces visitors with no session cookie away from app areas.
 * Real authentication/authorization happens server-side in requireCtx()/requirePage().
 */
const PROTECTED = ["/admin", "/teacher", "/student", "/parent"];

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (PROTECTED.some((p) => pathname === p || pathname.startsWith(p + "/")) && !req.cookies.get("sp_session")?.value) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}
export const config = { matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"] };
