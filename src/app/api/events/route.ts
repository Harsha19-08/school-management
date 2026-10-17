import { z } from "zod";
import { body, pageQuery, paged, query, route } from "@/lib/api/route";
import { can, scoped } from "@/lib/authorization/context";
import { SchoolEvent } from "@/models";
import { audit } from "@/lib/audit";
import { eventSchema } from "@/features/events/schemas";

const AUD: Record<string, string> = { student: "students", parent: "parents", teacher: "teachers" };
const dto = (e: { _id: unknown; title: string; description?: string | null; category?: string | null; venue?: string | null; organizer?: string | null; startsAt: Date; endsAt?: Date | null; status: string; audience: string[] }) => ({ id: String(e._id), title: e.title, description: e.description, category: e.category, venue: e.venue, organizer: e.organizer, startsAt: e.startsAt, endsAt: e.endsAt, status: e.status, audience: e.audience });

/** Learners/teachers only ever see published events addressed to them; drafts stay with staff. */
export const GET = route({ perm: "event.read" }, async ({ req, ctx }) => {
  const q = query(req, pageQuery.extend({ when: z.enum(["upcoming", "past", "all"]).default("all") }));
  const f: Record<string, unknown> = { ...scoped(ctx) };
  if (!can(ctx, "event.write")) { f.status = "published"; f.audience = { $in: ["all", AUD[ctx.role] ?? "all"] }; }
  if (q.when === "upcoming") f.startsAt = { $gte: new Date() }; if (q.when === "past") f.startsAt = { $lt: new Date() };
  const [items, total] = await Promise.all([SchoolEvent.find(f).sort({ startsAt: q.when === "past" ? -1 : 1 }).skip((q.page - 1) * q.pageSize).limit(q.pageSize).lean(), SchoolEvent.countDocuments(f)]);
  return paged(items.map(dto), total, q.page, q.pageSize);
});

export const POST = route({ perm: "event.write" }, async ({ req, ctx }) => {
  const d = await body(req, eventSchema);
  const e = await SchoolEvent.create({ ...d, ...scoped(ctx), createdBy: ctx.userId });
  await audit(ctx, "event.create", "Event", e._id);
  return { id: String(e._id) };
});
