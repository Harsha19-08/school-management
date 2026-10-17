"use client";
import { useState } from "react";
import { MapPin, Pencil, Plus, Trash2 } from "lucide-react";
import { Badge, Button, Card, EmptyState, Field, Input, Select, Skeleton, Tabs, Textarea } from "@/components/ui/primitives";
import { Modal } from "@/components/ui/modal";
import { useFetch } from "@/hooks/use-fetch";
import { useAction } from "@/hooks/use-action";
import { api } from "@/lib/api/client";

interface E { id: string; title: string; description?: string; venue?: string; startsAt: string; endsAt?: string; status: string; audience: string[]; category?: string }
const local = (d?: string) => (d ? new Date(new Date(d).getTime() - new Date(d).getTimezoneOffset() * 60000).toISOString().slice(0, 16) : "");

export function EventsView({ canWrite }: { canWrite: boolean }) {
  const [when, setWhen] = useState<"upcoming" | "past">("upcoming");
  const { data, loading, reload } = useFetch<{ items: E[] }>(`/api/events?when=${when}&pageSize=50`);
  const [edit, setEdit] = useState<E | "new" | null>(null); const { busy, run } = useAction();
  const [f, setF] = useState({ title: "", description: "", venue: "", startsAt: "", endsAt: "", status: "draft", audience: "all" });
  const open = (e: E | "new") => { setF(e === "new" ? { title: "", description: "", venue: "", startsAt: "", endsAt: "", status: "draft", audience: "all" } : { title: e.title, description: e.description ?? "", venue: e.venue ?? "", startsAt: local(e.startsAt), endsAt: local(e.endsAt), status: e.status, audience: e.audience[0] ?? "all" }); setEdit(e); };
  return (<>
    <div className="flex items-center justify-between"><Tabs value={when} onChange={setWhen} tabs={[{ id: "upcoming", label: "Upcoming" }, { id: "past", label: "Past" }]} />{canWrite && <Button className="mb-5" onClick={() => open("new")}><Plus className="size-4" />New event</Button>}</div>
    {loading || !data ? <Skeleton className="h-40" /> : data.items.length === 0 ? <EmptyState title={`No ${when} events`} /> : (
      <div className="grid gap-3 md:grid-cols-2">{data.items.map((e) => (
        <Card key={e.id} className="space-y-1.5"><div className="flex items-start justify-between gap-2"><h3 className="text-xl text-primary">{e.title}</h3>{e.status !== "published" && <Badge tone={e.status === "cancelled" ? "danger" : "warning"}>{e.status}</Badge>}</div>
          <p className="text-sm font-semibold">{new Date(e.startsAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</p>{e.venue && <p className="flex items-center gap-1 text-sm text-muted"><MapPin className="size-3" />{e.venue}</p>}{e.description && <p className="text-sm text-muted">{e.description}</p>}
          {canWrite && <div className="flex gap-1 pt-1"><Button size="sm" variant="secondary" onClick={() => open(e)}><Pencil className="size-3" />Edit</Button><Button size="sm" variant="ghost" aria-label="Delete" onClick={async () => { if (confirm("Delete this event?") && (await run(() => api(`/api/events/${e.id}`, { method: "DELETE" }), "Deleted"))) reload(); }}><Trash2 className="size-3 text-danger" /></Button></div>}</Card>))}</div>)}
    <Modal open={!!edit} onOpenChange={(o) => !o && setEdit(null)} title={edit === "new" ? "New event" : "Edit event"}><form className="space-y-3" onSubmit={async (e) => { e.preventDefault(); const json = { title: f.title, description: f.description || undefined, venue: f.venue || undefined, startsAt: f.startsAt, endsAt: f.endsAt || undefined, status: f.status, audience: [f.audience] }; if (await run(() => edit === "new" ? api("/api/events", { method: "POST", json }) : api(`/api/events/${(edit as E).id}`, { method: "PATCH", json }), "Saved")) { setEdit(null); reload(); } }}>
      <Field label="Title"><Input value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} required /></Field>
      <div className="grid grid-cols-2 gap-3"><Field label="Starts"><Input type="datetime-local" value={f.startsAt} onChange={(e) => setF({ ...f, startsAt: e.target.value })} required /></Field><Field label="Ends"><Input type="datetime-local" value={f.endsAt} onChange={(e) => setF({ ...f, endsAt: e.target.value })} /></Field></div>
      <Field label="Venue"><Input value={f.venue} onChange={(e) => setF({ ...f, venue: e.target.value })} /></Field><Field label="Description"><Textarea value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></Field>
      <div className="grid grid-cols-2 gap-3"><Field label="Audience"><Select value={f.audience} onChange={(e) => setF({ ...f, audience: e.target.value })}>{["all", "students", "parents", "teachers"].map((a) => <option key={a}>{a}</option>)}</Select></Field><Field label="Status" hint="Only published events are visible outside staff."><Select value={f.status} onChange={(e) => setF({ ...f, status: e.target.value })}>{["draft", "published", "cancelled"].map((a) => <option key={a}>{a}</option>)}</Select></Field></div>
      <Button type="submit" className="w-full" loading={busy}>Save</Button></form></Modal>
  </>);
}
