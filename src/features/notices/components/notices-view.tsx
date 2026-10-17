"use client";
import { useState } from "react";
import { Pin, Plus, Trash2 } from "lucide-react";
import { Badge, Button, Card, EmptyState, Field, Input, Select, Skeleton, Textarea } from "@/components/ui/primitives";
import { Modal } from "@/components/ui/modal";
import { useFetch } from "@/hooks/use-fetch";
import { useAction } from "@/hooks/use-action";
import { useStructure } from "@/hooks/use-structure";
import { api } from "@/lib/api/client";

interface N { id: string; title: string; body: string; audience: string[]; pinned: boolean; createdAt: string; kind?: string; targeted: boolean }

export function NoticesView({ canWrite, canTarget = true }: { canWrite: boolean; canTarget?: boolean }) {
  const { data, loading, reload } = useFetch<{ items: N[] }>("/api/notices?pageSize=50"); const { busy, run } = useAction(); const st = useStructure();
  const [open, setOpen] = useState(false); const [f, setF] = useState({ title: "", body: "", audience: "all", classId: "", pinned: false, kind: "announcement" });
  return (<>
    {canWrite && <div className="mb-4 flex justify-end"><Button onClick={() => setOpen(true)}><Plus className="size-4" />New notice</Button></div>}
    {loading || !data ? <Skeleton className="h-40" /> : data.items.length === 0 ? <EmptyState title="No notices" /> : (
      <div className="space-y-3">{data.items.map((n) => (<Card key={n.id}><div className="flex items-start justify-between gap-2"><h3 className="flex items-center gap-2 text-xl text-primary">{n.pinned && <Pin className="size-4 text-accent" aria-label="Pinned" />}{n.title}</h3>
        <div className="flex items-center gap-2"><Badge>{n.audience.join(", ")}</Badge>{canWrite && <Button size="sm" variant="ghost" aria-label="Delete" onClick={async () => { if (confirm("Delete this notice?") && (await run(() => api(`/api/notices/${n.id}`, { method: "DELETE" }), "Deleted"))) reload(); }}><Trash2 className="size-3 text-danger" /></Button>}</div></div>
        <p className="mt-2 whitespace-pre-wrap text-sm">{n.body}</p><p className="mt-2 text-xs text-muted">{new Date(n.createdAt).toLocaleDateString("en-IN", { dateStyle: "medium" })}{n.targeted ? " · targeted" : ""}</p></Card>))}</div>)}
    <Modal open={open} onOpenChange={setOpen} title="New notice" description="In-app notifications are sent to matching accounts. Email and SMS are not configured." wide><form className="space-y-3" onSubmit={async (e) => { e.preventDefault(); const r = await run(() => api<{ recipients: number }>("/api/notices", { method: "POST", json: { title: f.title, body: f.body, audience: [f.audience], classIds: f.classId ? [f.classId] : [], pinned: f.pinned, kind: f.kind } })); if (r) { setOpen(false); reload(); alert(`Published. ${r.recipients} in-app notification(s) created. Email/SMS: not configured.`); } }}>
      <Field label="Title"><Input value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} required /></Field><Field label="Message"><Textarea value={f.body} onChange={(e) => setF({ ...f, body: e.target.value })} required /></Field>
      <div className="grid grid-cols-2 gap-3"><Field label="Audience"><Select value={f.audience} onChange={(e) => setF({ ...f, audience: e.target.value })}>{["all", "students", "parents", "teachers"].map((a) => <option key={a}>{a}</option>)}</Select></Field>
        {canTarget && <Field label="Limit to class"><Select value={f.classId} onChange={(e) => setF({ ...f, classId: e.target.value })}><option value="">Whole school</option>{st.classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</Select></Field>}</div>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={f.pinned} onChange={(e) => setF({ ...f, pinned: e.target.checked })} />Pin to top</label><Button type="submit" className="w-full" loading={busy}>Publish</Button></form></Modal>
  </>);
}
