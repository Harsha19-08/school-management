import { NextResponse, type NextRequest } from "next/server";
import { z, type ZodType } from "zod";
import { connectDB } from "@/lib/db/connect";
import { requireCtx, type Ctx } from "@/lib/authorization/context";
import type { Permission, Role } from "@/lib/authorization/permissions";
import { ApiError, badRequest, fail, forbidden } from "./errors";

type Handler<P> = (a: { req: NextRequest; ctx: Ctx; params: P }) => Promise<NextResponse | unknown>;
interface Opts { perm?: Permission | Permission[]; roles?: Role[] }
const MUTATING = new Set(["POST", "PUT", "PATCH", "DELETE"]);

/** CSRF defence in depth: SameSite=Lax cookie + same-origin check on every mutating request. */
export function assertSameOrigin(req: NextRequest) {
  if (!MUTATING.has(req.method)) return;
  const origin = req.headers.get("origin");
  if (!origin) return; // non-browser clients carry no Origin and no ambient cookies
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  if (new URL(origin).host !== host) throw forbidden("Cross-origin request blocked.");
}

/** Standard protected route: connect → same-origin → authenticate → authorize → handler. schoolId always comes from ctx. */
export function route<P = Record<string, string>>(opts: Opts, handler: Handler<P>) {
  return async (req: NextRequest, segment: { params: Promise<P> }) => {
    try {
      assertSameOrigin(req);
      await connectDB();
      const ctx = await requireCtx(opts);
      const out = await handler({ req, ctx, params: await segment.params });
      if (out instanceof NextResponse || out instanceof Response) return out;
      return NextResponse.json({ ok: true, data: out });
    } catch (e) { return fail(e); }
  };
}

export async function body<T extends ZodType>(req: NextRequest, schema: T): Promise<z.infer<T>> {
  let json: unknown;
  try { json = await req.json(); } catch { throw badRequest("Invalid JSON body."); }
  return schema.parse(json); // unknown keys stripped → no mass assignment
}
export function query<T extends ZodType>(req: NextRequest, schema: T): z.infer<T> { return schema.parse(Object.fromEntries(req.nextUrl.searchParams)); }

export const pageQuery = z.object({
  page: z.coerce.number().int().min(1).default(1), pageSize: z.coerce.number().int().min(1).max(100).default(20),
  q: z.string().trim().max(80).optional(), sort: z.string().trim().max(30).optional(), dir: z.enum(["asc", "desc"]).default("asc"),
});
export function paged<T>(items: T[], total: number, page: number, pageSize: number) { return { items, total, page, pageSize, pages: Math.max(1, Math.ceil(total / pageSize)) }; }
export const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
export { ApiError };
