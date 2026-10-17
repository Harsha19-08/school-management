"use client";
import { useState } from "react";
import { Plus } from "lucide-react";
import { Badge, Button, Card, EmptyState, Field, Input, Select, Skeleton, Textarea } from "@/components/ui/primitives";
import { Modal } from "@/components/ui/modal";
import { ClassSectionSelect } from "@/components/ui/class-section-select";
import { useFetch } from "@/hooks/use-fetch";
import { useAction } from "@/hooks/use-action";
import { useStructure } from "@/hooks/use-structure";
import { api } from "@/lib/api/client";

interface A { id: string; title: string; subject?: string; dueAt?: string; maxMarks?: number; submissionCount?: number; kind: string }
interface Detail { id: string; title: string; maxMarks?: number; students: { id: string; name: string; rollNo?: number; submitted: boolean; text?: string; late?: boolean; marks?: number; feedback?: string }[] }

export function AssignmentsTeacher() {
  const { data, loading, reload } = useFetch<{ items: A[] }>("/api/assignments?pageSize=50"); const st = useStructure(); const { busy, run } = useAction();
  const [create, setCreate] = useState(false); const [view, setView] = useState<string | null>(null);
  const [sel, setSel] = useState({ classId: "", sectionId: "" }); const [f, setF] = useState({ title: "", subjectId: "", instructions: "", dueAt: "", maxMarks: "", allowLate: false, allowResubmission: false, kind: "assignment" });
  return (<>
    <div className="mb-4 flex justify-end"><Button onClick={() => setCreate(true)}><Plus className="size-4" />New</Button></div>
    {loading || !data ? <Skeleton className="h-40" /> : data.items.length === 0 ? <EmptyState title="No assignments yet" hint="Create one for a section you teach." /> : (
      <div className="grid gap-3 md:grid-cols-2">{data.items.map((a) => <Card key={a.id} className="space-y-1"><div className="flex justify-between gap-2"><h3 className="text-lg text-primary">{a.title}</h3><Badge>{a.kind}</Badge></div><p className="text-sm text-muted">{a.subject}{a.dueAt ? ` · due ${new Date(a.dueAt).toLocaleDateString("en-IN")}` : ""}</p><p className="text-sm">{a.submissionCount ?? 0} submission(s)</p><Button size="sm" variant="secondary" onClick={() => setView(a.id)}>Review</Button></Card>)}</div>)}
    <Modal open={create} onOpenChange={setCreate} title="New assignment" description="You can post only to subject-section pairs you are assigned to." wide>
      <form className="space-y-3" onSubmit={async (e) => { e.preventDefault(); if (await run(() => api("/api/assignments", { method: "POST", json: { sectionId: sel.sectionId, subjectId: f.subjectId, title: f.title, instructions: f.instructions || undefined, dueAt: f.dueAt || undefined, maxMarks: f.maxMarks ? Number(f.maxMarks) : undefined, allowLate: f.allowLate, allowResubmission: f.allowResubmission, kind: f.kind } }), "Posted")) { setCreate(false); reload(); } }}>
        <ClassSectionSelect classId={sel.classId} sectionId={sel.sectionId} onChange={setSel} />
        <div className="grid grid-cols-2 gap-3"><Field label="Subject"><Select value={f.subjectId} onChange={(e) => setF({ ...f, subjectId: e.target.value })} required><option value="">Select</option>{st.subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</Select></Field><Field label="Type"><Select value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value })}><option value="assignment">Assignment</option><option value="resource">Resource / notes</option></Select></Field></div>
        <Field label="Title"><Input value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} required /></Field><Field label="Instructions"><Textarea value={f.instructions} onChange={(e) => setF({ ...f, instructions: e.target.value })} /></Field>
        {f.kind === "assignment" && <><div className="grid grid-cols-2 gap-3"><Field label="Due"><Input type="datetime-local" value={f.dueAt} onChange={(e) => setF({ ...f, dueAt: e.target.value })} /></Field><Field label="Max marks"><Input inputMode="numeric" value={f.maxMarks} onChange={(e) => setF({ ...f, maxMarks: e.target.value })} /></Field></div>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={f.allowLate} onChange={(e) => setF({ ...f, allowLate: e.target.checked })} />Accept late submissions</label><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={f.allowResubmission} onChange={(e) => setF({ ...f, allowResubmission: e.target.checked })} />Allow resubmission (until graded)</label></>}
        <Button type="submit" className="w-full" loading={busy} disabled={!sel.sectionId}>Post</Button></form></Modal>
    <Modal open={!!view} onOpenChange={(o) => !o && setView(null)} title="Submissions" wide>{view && <Review id={view} />}</Modal>
  </>);
}

function Review({ id }: { id: string }) {
  const { data, loading, reload } = useFetch<Detail>(`/api/assignments/${id}`); const { run } = useAction(); const [g, setG] = useState<Record<string, { marks: string; feedback: string }>>({});
  if (loading || !data) return <Skeleton className="h-40" />;
  return (<ul className="divide-y divide-line text-sm">{data.students.map((s) => { const v = g[s.id] ?? { marks: s.marks?.toString() ?? "", feedback: s.feedback ?? "" }; return (
    <li key={s.id} className="space-y-2 py-3"><div className="flex items-center justify-between"><span className="font-semibold">{s.name}</span>{s.submitted ? <Badge tone={s.late ? "warning" : "success"}>{s.late ? "late" : "submitted"}</Badge> : <Badge>not submitted</Badge>}</div>
      {s.submitted && <><p className="whitespace-pre-wrap rounded-xl bg-canvas p-2">{s.text}</p><div className="flex gap-2"><Input aria-label="Marks" className="w-24" placeholder="Marks" inputMode="decimal" value={v.marks} onChange={(e) => setG({ ...g, [s.id]: { ...v, marks: e.target.value } })} /><Input aria-label="Feedback" placeholder="Feedback" value={v.feedback} onChange={(e) => setG({ ...g, [s.id]: { ...v, feedback: e.target.value } })} /><Button size="sm" onClick={async () => { if (await run(() => api(`/api/assignments/${id}/grade`, { method: "POST", json: { studentId: s.id, marks: v.marks === "" ? undefined : Number(v.marks), feedback: v.feedback || undefined } }), "Saved")) reload(); }}>Save</Button></div></>}</li>); })}</ul>);
}
