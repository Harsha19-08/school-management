import { can, scoped, type Ctx } from "@/lib/authorization/context";
import { readerPlacement } from "@/features/notices/visibility";
import type { Reader } from "./access";

export async function readerFor(ctx: Ctx): Promise<Reader> {
  const p = await readerPlacement(ctx);
  return { role: ctx.role, userId: ctx.userId, studentId: ctx.studentId, childIds: ctx.childIds, sectionIds: p.sectionId, canManage: can(ctx, "document.write") };
}
export { scoped };
