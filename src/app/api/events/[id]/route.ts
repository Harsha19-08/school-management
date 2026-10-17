import { body, route } from "@/lib/api/route";
import { notFound } from "@/lib/api/errors";
import { scoped } from "@/lib/authorization/context";
import { SchoolEvent } from "@/models";
import { audit } from "@/lib/audit";
import { eventSchema } from "@/features/events/schemas";

export const PATCH = route<{ id: string }>({ perm: "event.write" }, async ({ req, ctx, params }) => {
  const d = await body(req, eventSchema);
  const e = await SchoolEvent.findOneAndUpdate({ _id: params.id, ...scoped(ctx) }, { $set: d as object }, { returnDocument: "after" });
  if (!e) throw notFound("Event");
  await audit(ctx, "event.update", "Event", e._id);
  return { id: String(e._id) };
});
export const DELETE = route<{ id: string }>({ perm: "event.write" }, async ({ ctx, params }) => {
  const r = await SchoolEvent.deleteOne({ _id: params.id, ...scoped(ctx) });
  if (!r.deletedCount) throw notFound("Event");
  await audit(ctx, "event.delete", "Event", params.id);
  return { id: params.id };
});
