import { z } from "zod";
import { body, route } from "@/lib/api/route";
import { Notification } from "@/models";

export const GET = route({}, async ({ ctx }) => {
  const filter = { userId: ctx.userId, schoolId: ctx.schoolId };
  const [items, unread] = await Promise.all([Notification.find(filter).sort({ createdAt: -1 }).limit(20).lean(), Notification.countDocuments({ ...filter, read: false })]);
  return { unread, items: items.map((n) => ({ id: String(n._id), title: n.title, body: n.body, link: n.link, read: n.read, createdAt: n.createdAt })) };
});

/** Marks the caller's own notifications read (all, or the given ids). */
export const POST = route({}, async ({ req, ctx }) => {
  const { ids } = await body(req, z.object({ ids: z.array(z.string()).max(50).optional() }));
  await Notification.updateMany({ userId: ctx.userId, schoolId: ctx.schoolId, ...(ids ? { _id: { $in: ids } } : {}) }, { read: true });
  return { ok: true };
});
