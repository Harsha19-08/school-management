"use client";
import { useRef, useState } from "react";
import { Download, FileText, Trash2, Upload } from "lucide-react";
import { Badge, Button, EmptyState, Field, Input, Select, Skeleton } from "@/components/ui/primitives";
import { Modal } from "@/components/ui/modal";
import { useFetch } from "@/hooks/use-fetch";
import { useAction } from "@/hooks/use-action";
import { api } from "@/lib/api/client";

interface D { id: string; title: string; category: string; mime: string; size: number; createdAt: string; deleted: boolean; audience: string[] }
const CATS = ["admission", "certificate", "report_card", "receipt", "circular", "exam_timetable", "id_proof", "other"];
const kb = (n: number) => (n > 1024 * 1024 ? `${(n / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);

export function DocumentsView({ canWrite }: { canWrite: boolean }) {
  const [cat, setCat] = useState(""); const { data, loading, reload } = useFetch<{ items: D[] }>(`/api/documents?pageSize=100${cat ? `&category=${cat}` : ""}`);
  const [open, setOpen] = useState(false); const file = useRef<HTMLInputElement>(null); const { busy, run } = useAction();
  const [f, setF] = useState({ title: "", category: "circular", audience: "staff" });
  return (<>
    <div className="mb-4 flex flex-wrap gap-2"><Select aria-label="Category" className="w-48" value={cat} onChange={(e) => setCat(e.target.value)}><option value="">All categories</option>{CATS.map((c) => <option key={c} value={c}>{c.replace("_", " ")}</option>)}</Select>{canWrite && <Button className="ml-auto" onClick={() => setOpen(true)}><Upload className="size-4" />Upload</Button>}</div>
    {loading || !data ? <Skeleton className="h-40" /> : data.items.length === 0 ? <EmptyState title="No documents" /> : (
      <ul className="divide-y divide-line rounded-[14px] border border-line bg-surface">{data.items.map((d) => (
        <li key={d.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3"><div className="flex items-center gap-3"><FileText className="size-5 text-muted" aria-hidden /><div><p className={`text-sm font-semibold ${d.deleted ? "line-through" : ""}`}>{d.title}</p><p className="text-xs text-muted">{d.category.replace("_", " ")} · {kb(d.size)} · {new Date(d.createdAt).toLocaleDateString("en-IN")}</p></div></div>
          <div className="flex items-center gap-2">{canWrite && <Badge>{d.audience.join(", ")}</Badge>}{!d.deleted && <a href={`/api/documents/${d.id}`} className="inline-flex h-8 items-center gap-1 rounded-xl border border-line px-3 text-xs font-semibold hover:bg-soft"><Download className="size-3" />Download</a>}
            {canWrite && !d.deleted && <Button size="sm" variant="ghost" aria-label="Delete" onClick={async () => { if (confirm("Remove this document?") && (await run(() => api(`/api/documents/${d.id}`, { method: "DELETE" }), "Removed"))) reload(); }}><Trash2 className="size-3 text-danger" /></Button>}</div></li>))}</ul>)}
    <Modal open={open} onOpenChange={setOpen} title="Upload document" description="PDF, PNG, JPEG or WebP up to 5 MB. Files are checked by content, not by name."><form className="space-y-3" onSubmit={async (e) => { e.preventDefault(); const file0 = file.current?.files?.[0]; if (!file0) return; const fd = new FormData(); fd.set("file", file0); fd.set("title", f.title || file0.name); fd.set("category", f.category); fd.set("audience", f.audience);
      if (await run(() => api("/api/documents", { method: "POST", form: fd }), "Uploaded")) { setOpen(false); reload(); } }}>
      <Field label="File"><input ref={file} type="file" accept="application/pdf,image/png,image/jpeg,image/webp" required className="block w-full text-sm" /></Field><Field label="Title"><Input value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} /></Field>
      <div className="grid grid-cols-2 gap-3"><Field label="Category"><Select value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })}>{CATS.map((c) => <option key={c} value={c}>{c.replace("_", " ")}</option>)}</Select></Field><Field label="Visible to"><Select value={f.audience} onChange={(e) => setF({ ...f, audience: e.target.value })}><option value="staff">Staff only</option><option value="teachers">Teachers</option><option value="students">Students</option><option value="parents">Parents</option><option value="teachers,students,parents">Everyone</option></Select></Field></div>
      <Button type="submit" className="w-full" loading={busy}>Upload</Button></form></Modal>
  </>);
}
