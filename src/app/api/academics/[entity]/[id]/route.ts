import { body, route } from "@/lib/api/route";
import { notFound } from "@/lib/api/errors";
import { scoped } from "@/lib/authorization/context";
import { ENTITIES } from "@/features/academics/entities";
import { audit } from "@/lib/audit";

type P = { entity: string; id: string };

export const PATCH = route<P>({ perm: "academics.write" }, async ({ req, ctx, params }) => {
  const e = ENTITIES[params.entity]; if (!e) throw notFound();
  const data = await body(req, e.schema.partial()) as Record<string, unknown>;
  delete data.classId; // a section never moves between classes via edit
  await e.before?.(ctx, data);
  const doc = await e.model.findOneAndUpdate({ _id: params.id, ...scoped(ctx) }, { $set: data }, { returnDocument: "after" });
  if (!doc) throw notFound(e.label);
  await e.after?.(ctx, doc, data);
  await audit(ctx, `academics.${params.entity}.update`, e.label, doc._id);
  return { id: String(doc._id) };
});

export const DELETE = route<P>({ perm: "academics.write" }, async ({ ctx, params }) => {
  const e = ENTITIES[params.entity]; if (!e) throw notFound();
  if (!(await e.model.exists({ _id: params.id, ...scoped(ctx) }))) throw notFound(e.label);
  await e.guardDelete?.(ctx, params.id);
  await e.model.deleteOne({ _id: params.id, ...scoped(ctx) });
  await audit(ctx, `academics.${params.entity}.delete`, e.label, params.id);
  return { id: params.id };
});
