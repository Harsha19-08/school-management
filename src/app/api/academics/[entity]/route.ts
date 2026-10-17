import { body, route } from "@/lib/api/route";
import { notFound } from "@/lib/api/errors";
import { scoped } from "@/lib/authorization/context";
import { ENTITIES } from "@/features/academics/entities";
import { audit } from "@/lib/audit";

export const GET = route<{ entity: string }>({ perm: "academics.read" }, async ({ ctx, params }) => {
  const e = ENTITIES[params.entity]; if (!e) throw notFound();
  return (await e.model.find(scoped(ctx)).sort(e.sort).lean()).map((d) => ({ ...d, id: String(d._id) }));
});

export const POST = route<{ entity: string }>({ perm: "academics.write" }, async ({ req, ctx, params }) => {
  const e = ENTITIES[params.entity]; if (!e) throw notFound();
  const data = await body(req, e.schema) as Record<string, unknown>;
  await e.before?.(ctx, data);
  const doc = await e.model.create({ ...data, ...scoped(ctx) });
  await e.after?.(ctx, doc, data);
  await audit(ctx, `academics.${params.entity}.create`, e.label, doc._id);
  return { id: String(doc._id) };
});
