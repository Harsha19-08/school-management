import { z } from "zod";
import { body, pageQuery, paged, query, route } from "@/lib/api/route";
import { scoped } from "@/lib/authorization/context";
import { Guardian, Notice, Student } from "@/models";
import { noticeVisible, readerPlacement } from "@/features/notices/visibility";
import { assertClass, assertSection } from "@/features/academics/refs";
import { notify } from "@/services/notify";
import { audit } from "@/lib/audit";

const oid = z.string().regex(/^[a-f\d]{24}$/i);
const schema = z.object({
  title: z.string().trim().min(2).max(120), body: z.string().trim().min(2).max(4000),
  audience: z.array(z.enum(["all", "students", "parents", "teachers"])).min(1).default(["all"]),
  classIds: z.array(oid).default([]), sectionIds: z.array(oid).default([]), pinned: z.boolean().optional(), expiresAt: z.coerce.date().optional().or(z.literal("").transform(() => undefined)),
  kind: z.enum(["announcement", "fee_reminder", "exam_reminder", "event_reminder", "document"]).default("announcement"),
});

const dto = (n: { _id: unknown; title: string; body: string; audience: string[]; pinned?: boolean | null; kind?: string | null; createdAt?: Date; expiresAt?: Date | null; classIds: unknown[]; sectionIds: unknown[] }) => ({ id: String(n._id), title: n.title, body: n.body, audience: n.audience, pinned: !!n.pinned, kind: n.kind, createdAt: n.createdAt, expiresAt: n.expiresAt ?? undefined, targeted: n.classIds.length + n.sectionIds.length > 0 });

/** Visibility is decided on the server per reader, never by hiding things in the UI. */
export const GET = route({ perm: "notice.read" }, async ({ req, ctx }) => {
  const q = query(req, pageQuery);
  const all = await Notice.find(scoped(ctx)).sort({ pinned: -1, createdAt: -1 }).limit(300).lean();
  const place = await readerPlacement(ctx);
  const vis = all.filter((n) => noticeVisible({ audience: n.audience, classIds: n.classIds.map(String), sectionIds: n.sectionIds.map(String), studentIds: n.studentIds.map(String), expiresAt: n.expiresAt }, { role: ctx.role, ...place }));
  return paged(vis.slice((q.page - 1) * q.pageSize, q.page * q.pageSize).map(dto), vis.length, q.page, q.pageSize);
});

export const POST = route({ perm: "notice.write" }, async ({ req, ctx }) => {
  const d = await body(req, schema);
  for (const c of d.classIds) await assertClass(ctx, c); for (const s of d.sectionIds) await assertSection(ctx, s);
  const n = await Notice.create({ ...d, ...scoped(ctx), createdBy: ctx.userId });
  // In-app notifications for matching, linked accounts. Email/SMS are recorded as not_configured by the service.
  const sf: Record<string, unknown> = { ...scoped(ctx), status: "active" };
  if (d.sectionIds.length) sf.sectionId = { $in: d.sectionIds }; else if (d.classIds.length) sf.classId = { $in: d.classIds };
  const students = await Student.find(sf).select("userId").lean();
  const users: string[] = [];
  if (d.audience.includes("all") || d.audience.includes("students")) users.push(...students.map((s) => s.userId).filter(Boolean).map(String));
  if (d.audience.includes("all") || d.audience.includes("parents")) users.push(...(await Guardian.find({ ...scoped(ctx), studentIds: { $in: students.map((s) => s._id) } }).select("userId").lean()).map((g) => g.userId).filter(Boolean).map(String));
  const delivery = await notify({ schoolId: ctx.schoolId, userIds: users, title: d.title, body: d.body.slice(0, 140), link: "/student/more", kind: "notice" });
  await audit(ctx, "notice.create", "Notice", n._id, { recipients: delivery.created });
  return { id: String(n._id), recipients: delivery.created, email: delivery.email, sms: delivery.sms };
});
