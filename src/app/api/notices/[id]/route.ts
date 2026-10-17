import { route } from "@/lib/api/route";
import { notFound } from "@/lib/api/errors";
import { scoped } from "@/lib/authorization/context";
import { Notice } from "@/models";
import { audit } from "@/lib/audit";

export const DELETE = route<{ id: string }>({ perm: "notice.write" }, async ({ ctx, params }) => {
  const r = await Notice.deleteOne({ _id: params.id, ...scoped(ctx) });
  if (!r.deletedCount) throw notFound("Notice");
  await audit(ctx, "notice.delete", "Notice", params.id);
  return { id: params.id };
});
