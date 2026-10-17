import { z } from "zod";
import { pageQuery, paged, query, route } from "@/lib/api/route";
import { scoped } from "@/lib/authorization/context";
import { AuditLog, User } from "@/models";

export const GET = route({ perm: "audit.view" }, async ({ req, ctx }) => {
  const q = query(req, pageQuery.extend({ action: z.string().optional() }));
  const f: Record<string, unknown> = { ...scoped(ctx) };
  if (q.action) f.action = new RegExp("^" + q.action.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const [items, total] = await Promise.all([AuditLog.find(f).sort({ createdAt: -1 }).skip((q.page - 1) * q.pageSize).limit(q.pageSize).lean(), AuditLog.countDocuments(f)]);
  const users = await User.find({ _id: { $in: items.map((i) => i.actorId).filter(Boolean) } }).select("name").lean();
  const un = new Map(users.map((u) => [String(u._id), u.name]));
  return paged(items.map((a) => ({ id: String(a._id), at: a.createdAt, actor: a.actorId ? un.get(String(a.actorId)) ?? "—" : "system", role: a.actorRole, action: a.action, entity: a.entity, entityId: a.entityId })), total, q.page, q.pageSize);
});
