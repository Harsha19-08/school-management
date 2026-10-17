import { z } from "zod";
import { NextResponse } from "next/server";
import { pageQuery, paged, query, route } from "@/lib/api/route";
import { badRequest } from "@/lib/api/errors";
import { scoped } from "@/lib/authorization/context";
import { DocumentMeta, Section, Student } from "@/models";
import { putFile, removeFile, validateUpload } from "@/lib/storage";
import { canAccessDocument } from "@/features/documents/access";
import { readerFor } from "@/features/documents/queries";
import { audit } from "@/lib/audit";

const dto = (d: { _id: unknown; title: string; category: string; mime: string; size: number; version?: number | null; audience: string[]; ownerStudentId?: unknown; createdAt?: Date; deleted?: boolean | null }) => ({ id: String(d._id), title: d.title, category: d.category, mime: d.mime, size: d.size, version: d.version ?? 1, audience: d.audience, ownerStudentId: d.ownerStudentId ? String(d.ownerStudentId) : undefined, createdAt: d.createdAt, deleted: !!d.deleted });

export const GET = route({}, async ({ req, ctx }) => {
  const q = query(req, pageQuery.extend({ category: z.string().optional(), studentId: z.string().optional() }));
  const reader = await readerFor(ctx);
  const f: Record<string, unknown> = { ...scoped(ctx) };
  if (!reader.canManage) f.deleted = { $ne: true };
  if (q.category) f.category = q.category; if (q.studentId) f.ownerStudentId = q.studentId;
  if (q.q) f.title = new RegExp(q.q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
  const all = await DocumentMeta.find(f).sort({ createdAt: -1 }).limit(500).lean();
  const vis = all.filter((d) => canAccessDocument({ audience: d.audience, ownerStudentId: d.ownerStudentId ? String(d.ownerStudentId) : null, sectionIds: d.sectionIds.map(String), uploadedBy: d.uploadedBy ? String(d.uploadedBy) : null, deleted: d.deleted }, reader));
  return paged(vis.slice((q.page - 1) * q.pageSize, q.page * q.pageSize).map(dto), vis.length, q.page, q.pageSize);
});

/** multipart upload: type verified by magic bytes, stored under a generated key outside the web root. */
export const POST = route({ perm: "document.write" }, async ({ req, ctx }) => {
  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) throw badRequest("Choose a file to upload.");
  const meta = z.object({ title: z.string().trim().min(2).max(120), category: z.enum(["admission", "certificate", "report_card", "receipt", "circular", "exam_timetable", "id_proof", "other"]).default("other"), studentId: z.string().optional(), audience: z.string().optional(), sectionId: z.string().optional() })
    .parse({ title: form.get("title") ?? file.name, category: form.get("category") ?? "other", studentId: form.get("studentId") || undefined, audience: form.get("audience") || undefined, sectionId: form.get("sectionId") || undefined });
  const buf = Buffer.from(await file.arrayBuffer());
  const { mime, ext } = validateUpload(buf);
  if (meta.studentId && !(await Student.exists({ _id: meta.studentId, ...scoped(ctx) }))) throw badRequest("Student not found.");
  if (meta.sectionId && !(await Section.exists({ _id: meta.sectionId, ...scoped(ctx) }))) throw badRequest("Section not found.");
  const audience = (meta.audience ? meta.audience.split(",") : ["staff"]).filter((a) => ["staff", "teachers", "students", "parents"].includes(a));
  const storageKey = await putFile(buf, ext);
  try {
    const d = await DocumentMeta.create({ ...scoped(ctx), title: meta.title, category: meta.category, storageKey, originalName: file.name.slice(0, 120), mime, size: buf.length, ownerStudentId: meta.studentId, audience, sectionIds: meta.sectionId ? [meta.sectionId] : [], uploadedBy: ctx.userId });
    await audit(ctx, "document.upload", "Document", d._id, { category: meta.category, size: buf.length });
    return NextResponse.json({ ok: true, data: dto(d) });
  } catch (e) { await removeFile(storageKey); throw e; }
});
