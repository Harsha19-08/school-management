import { route } from "@/lib/api/route";
import { notFound } from "@/lib/api/errors";
import { scoped } from "@/lib/authorization/context";
import { DocumentMeta } from "@/models";
import { getFile } from "@/lib/storage";
import { canAccessDocument } from "@/features/documents/access";
import { readerFor } from "@/features/documents/queries";
import { audit } from "@/lib/audit";

/** Authenticated download. Unauthorised and missing look identical (404). Never served statically. */
export const GET = route<{ id: string }>({}, async ({ ctx, params }) => {
  const d = await DocumentMeta.findOne({ _id: params.id, ...scoped(ctx) }).lean();
  if (!d || !canAccessDocument({ audience: d.audience, ownerStudentId: d.ownerStudentId ? String(d.ownerStudentId) : null, sectionIds: d.sectionIds.map(String), uploadedBy: d.uploadedBy ? String(d.uploadedBy) : null, deleted: d.deleted }, await readerFor(ctx))) throw notFound("Document");
  let buf: Buffer;
  try { buf = await getFile(d.storageKey); } catch { throw notFound("Document"); }
  const ext = d.mime === "application/pdf" ? "pdf" : d.mime.split("/")[1];
  return new Response(new Uint8Array(buf), { headers: { "Content-Type": d.mime, "Content-Disposition": `attachment; filename="${d.title.replace(/[^\w.-]+/g, "_").slice(0, 80)}.${ext}"`, "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" } });
});

/** Soft delete: the file and metadata are retained for audit. */
export const DELETE = route<{ id: string }>({ perm: "document.write" }, async ({ ctx, params }) => {
  const d = await DocumentMeta.findOneAndUpdate({ _id: params.id, ...scoped(ctx) }, { deleted: true });
  if (!d) throw notFound("Document");
  await audit(ctx, "document.delete", "Document", d._id);
  return { id: params.id };
});
