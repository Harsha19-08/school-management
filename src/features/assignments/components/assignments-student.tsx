"use client";
import { useState } from "react";
import { Badge, Button, Card, EmptyState, Skeleton, Textarea } from "@/components/ui/primitives";
import { useFetch } from "@/hooks/use-fetch";
import { useAction } from "@/hooks/use-action";
import { api, qs } from "@/lib/api/client";

interface A { id: string; title: string; kind: string; instructions?: string; subject?: string; dueAt?: string; maxMarks?: number; allowResubmission: boolean; mine: { submitted: boolean; marks?: number; feedback?: string; late?: boolean } }

export function AssignmentsStudent({ studentId, canSubmit }: { studentId?: string; canSubmit: boolean }) {
  const { data, loading, reload } = useFetch<{ items: A[] }>(`/api/assignments${qs({ studentId, pageSize: 50 })}`); const [text, setText] = useState<Record<string, string>>({}); const { busy, run } = useAction();
  if (loading || !data) return <Skeleton className="h-40" />;
  if (!data.items.length) return <EmptyState title="Nothing assigned" />;
  return (<div className="space-y-3">{data.items.map((a) => { const overdue = a.dueAt && new Date(a.dueAt) < new Date(); return (
    <Card key={a.id} className="space-y-2"><div className="flex items-start justify-between gap-2"><div><h3 className="text-lg text-primary">{a.title}</h3><p className="text-xs text-muted">{a.subject}{a.dueAt ? ` · due ${new Date(a.dueAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}` : ""}</p></div>
      {a.kind === "resource" ? <Badge tone="info">resource</Badge> : a.mine.submitted ? <Badge tone={a.mine.marks != null ? "success" : "info"}>{a.mine.marks != null ? `${a.mine.marks}${a.maxMarks ? `/${a.maxMarks}` : ""}` : "submitted"}</Badge> : <Badge tone={overdue ? "danger" : "warning"}>{overdue ? "overdue" : "to do"}</Badge>}</div>
      {a.instructions && <p className="whitespace-pre-wrap text-sm">{a.instructions}</p>}{a.mine.feedback && <p className="rounded-xl bg-soft p-2 text-sm">Feedback: {a.mine.feedback}</p>}
      {canSubmit && a.kind === "assignment" && (!a.mine.submitted || (a.allowResubmission && a.mine.marks == null)) && (<div className="space-y-2"><Textarea aria-label="Your answer" placeholder="Write your answer" value={text[a.id] ?? ""} onChange={(e) => setText({ ...text, [a.id]: e.target.value })} /><Button size="sm" loading={busy} disabled={!text[a.id]?.trim()} onClick={async () => { if (await run(() => api(`/api/assignments/${a.id}/submit`, { method: "POST", json: { text: text[a.id] } }), "Submitted")) reload(); }}>{a.mine.submitted ? "Resubmit" : "Submit"}</Button></div>)}</Card>); })}</div>);
}
