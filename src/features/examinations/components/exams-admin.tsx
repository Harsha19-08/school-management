"use client";
import { useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Plus, Trash2 } from "lucide-react";
import { Badge, Button, ErrorNote, Field, Input, Select, Skeleton, Tabs } from "@/components/ui/primitives";
import { Modal } from "@/components/ui/modal";
import { DataTable } from "@/components/tables/data-table";
import { useList } from "@/hooks/use-list";
import { useFetch } from "@/hooks/use-fetch";
import { useAction } from "@/hooks/use-action";
import { useStructure } from "@/hooks/use-structure";
import { api, qs } from "@/lib/api/client";
import { MarksEntry } from "./marks-entry";
import { ReportCard } from "./report-card";

interface Row { id: string; name: string; term: string; type: string; classId: string; status: string; subjects: { subjectId: string; maxMarks: number; passMarks: number }[] }
const tone: Record<string, "neutral" | "info" | "warning" | "success"> = { draft: "neutral", scheduled: "info", marks_open: "warning", published: "success" };
const NEXT: Record<string, { to: string; label: string } | undefined> = { draft: { to: "scheduled", label: "Mark scheduled" }, scheduled: { to: "marks_open", label: "Open marks entry" } };

export function ExamsAdmin({ canWrite, canPublish }: { canWrite: boolean; canPublish: boolean }) {
  const [tab, setTab] = useState<"exams" | "marks" | "cards">("exams");
  return (<>
    <Tabs value={tab} onChange={setTab} tabs={[{ id: "exams", label: "Exams" }, { id: "marks", label: "Marks entry" }, { id: "cards", label: "Report cards" }]} />
    {tab === "exams" && <ExamList canWrite={canWrite} canPublish={canPublish} />}{tab === "marks" && <MarksEntry />}{tab === "cards" && <Cards />}
  </>);
}

function ExamList({ canWrite, canPublish }: { canWrite: boolean; canPublish: boolean }) {
  const l = useList<Row>("/api/exams"); const st = useStructure(); const [create, setCreate] = useState(false); const [open, setOpen] = useState<string | null>(null);
  const cols = useMemo<ColumnDef<Row, unknown>[]>(() => [
    { id: "name", header: "Exam", cell: ({ row }) => <span className="font-semibold">{row.original.name}</span> }, { id: "term", header: "Term", cell: ({ row }) => row.original.term },
    { id: "class", header: "Class", cell: ({ row }) => st.classes.find((c) => c.id === row.original.classId)?.name ?? "—" },
    { id: "subjects", header: "Subjects", cell: ({ row }) => row.original.subjects.length },
    { id: "status", header: "Status", cell: ({ row }) => <Badge tone={tone[row.original.status]}>{row.original.status.replace("_", " ")}</Badge> },
  ], [st.classes]);
  return (<>
    <div className="mb-4 flex gap-2"><Select aria-label="Class" className="w-44" value={l.filters.classId ?? ""} onChange={(e) => l.setFilter("classId", e.target.value || undefined)}><option value="">All classes</option>{st.classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</Select>{canWrite && <Button className="ml-auto" onClick={() => setCreate(true)}><Plus className="size-4" />New exam</Button>}</div>
    <DataTable columns={cols} data={l.items} loading={l.loading} state={l.state} onPage={l.onPage} onRowClick={(r) => setOpen(r.id)} empty={{ title: "No exams yet" }} />
    <Modal open={create} onOpenChange={setCreate} title="New exam" wide><ExamForm onDone={() => { setCreate(false); l.reload(); }} /></Modal>
    <Modal open={!!open} onOpenChange={(o) => !o && setOpen(null)} title="Exam" wide>{open && <ExamDetail id={open} canWrite={canWrite} canPublish={canPublish} onChanged={l.reload} />}</Modal>
  </>);
}

function ExamForm({ onDone }: { onDone: () => void }) {
  const st = useStructure(); const { busy, run } = useAction();
  const [f, setF] = useState({ name: "", term: "Term 1", type: "unit_test", classId: "", academicYearId: "" }); const [subs, setSubs] = useState([{ subjectId: "", maxMarks: "100", passMarks: "35" }]);
  return (
    <form className="space-y-3" onSubmit={async (e) => { e.preventDefault(); if (await run(() => api("/api/exams", { method: "POST", json: { ...f, academicYearId: f.academicYearId || st.years.find((y) => y.current)?.id, subjects: subs.map((s) => ({ subjectId: s.subjectId, maxMarks: Number(s.maxMarks), passMarks: Number(s.passMarks) })) } }), "Exam created")) onDone(); }}>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Name"><Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} required /></Field><Field label="Term"><Input value={f.term} onChange={(e) => setF({ ...f, term: e.target.value })} required /></Field>
        <Field label="Type"><Select value={f.type} onChange={(e) => setF({ ...f, type: e.target.value })}>{["unit_test", "midterm", "final", "practical", "other"].map((t) => <option key={t} value={t}>{t.replace("_", " ")}</option>)}</Select></Field>
        <Field label="Class"><Select value={f.classId} onChange={(e) => setF({ ...f, classId: e.target.value })} required><option value="">Select</option>{st.classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</Select></Field>
      </div>
      <p className="text-xs font-semibold uppercase text-muted">Subjects</p>
      {subs.map((s, i) => (<div key={i} className="grid grid-cols-[1fr_5rem_5rem_auto] gap-2"><Select aria-label="Subject" value={s.subjectId} onChange={(e) => setSubs(subs.map((x, j) => j === i ? { ...x, subjectId: e.target.value } : x))} required><option value="">Subject</option>{st.subjects.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</Select>
        <Input aria-label="Max marks" inputMode="numeric" value={s.maxMarks} onChange={(e) => setSubs(subs.map((x, j) => j === i ? { ...x, maxMarks: e.target.value } : x))} /><Input aria-label="Pass marks" inputMode="numeric" value={s.passMarks} onChange={(e) => setSubs(subs.map((x, j) => j === i ? { ...x, passMarks: e.target.value } : x))} />
        <Button type="button" variant="ghost" size="sm" aria-label="Remove" onClick={() => setSubs(subs.filter((_, j) => j !== i))} disabled={subs.length === 1}><Trash2 className="size-4 text-danger" /></Button></div>))}
      <Button type="button" variant="secondary" size="sm" onClick={() => setSubs([...subs, { subjectId: "", maxMarks: "100", passMarks: "35" }])}><Plus className="size-3" />Add subject</Button>
      <Button type="submit" className="w-full" loading={busy}>Create exam</Button>
    </form>
  );
}

function ExamDetail({ id, canWrite, canPublish, onChanged }: { id: string; canWrite: boolean; canPublish: boolean; onChanged: () => void }) {
  const { data, error, reload } = useFetch<Row>(`/api/exams/${id}`); const st = useStructure(); const { busy, run } = useAction();
  const [fix, setFix] = useState({ studentId: "", subjectId: "", marks: "", reason: "" });
  const students = useFetch<{ items: { id: string; name: string }[] }>(data?.status === "published" ? `/api/students?classId=${data.classId}&pageSize=100` : null);
  if (error) return <ErrorNote message={error} />; if (!data) return <Skeleton className="h-40" />;
  const next = NEXT[data.status];
  return (
    <div className="space-y-4 text-sm">
      <div className="flex items-center justify-between"><div><p className="text-lg font-semibold">{data.name} <span className="font-normal text-muted">· {data.term}</span></p><p className="text-muted">{st.classes.find((c) => c.id === data.classId)?.name}</p></div><Badge tone={tone[data.status]}>{data.status.replace("_", " ")}</Badge></div>
      <ul className="divide-y divide-line rounded-xl border border-line">{data.subjects.map((s) => <li key={s.subjectId} className="flex justify-between px-3 py-2"><span>{st.subjects.find((x) => x.id === s.subjectId)?.name}</span><span className="font-mono text-xs text-muted">max {s.maxMarks} · pass {s.passMarks}</span></li>)}</ul>
      <div className="flex flex-wrap gap-2">
        {canWrite && next && <Button size="sm" loading={busy} onClick={async () => { if (await run(() => api(`/api/exams/${id}`, { method: "PATCH", json: { status: next.to } }), "Updated")) { reload(); onChanged(); } }}>{next.label}</Button>}
        {canPublish && data.status === "marks_open" && <Button size="sm" variant="primary" loading={busy} onClick={async () => { if (confirm("Publish results? Students and parents will see them immediately, and this cannot be undone.") && (await run(() => api(`/api/exams/${id}/publish`, { method: "POST", json: {} }), "Results published"))) { reload(); onChanged(); } }}>Publish results</Button>}
        {canWrite && data.status !== "published" && <Button size="sm" variant="danger" loading={busy} onClick={async () => { if (confirm("Delete this exam?") && (await run(() => api(`/api/exams/${id}`, { method: "DELETE" }), "Deleted"))) onChanged(); }}>Delete</Button>}
      </div>
      {canPublish && data.status === "published" && (
        <form className="space-y-2 rounded-xl border border-line p-3" onSubmit={async (e) => { e.preventDefault(); if (await run(() => api(`/api/exams/${id}/correct`, { method: "POST", json: { studentId: fix.studentId, subjectId: fix.subjectId, marks: Number(fix.marks), reason: fix.reason } }), "Correction recorded")) setFix({ studentId: "", subjectId: "", marks: "", reason: "" }); }}>
          <p className="font-semibold">Correct a published mark</p>
          <div className="grid grid-cols-2 gap-2"><Select aria-label="Student" value={fix.studentId} onChange={(e) => setFix({ ...fix, studentId: e.target.value })} required><option value="">Student</option>{students.data?.items.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</Select>
            <Select aria-label="Subject" value={fix.subjectId} onChange={(e) => setFix({ ...fix, subjectId: e.target.value })} required><option value="">Subject</option>{data.subjects.map((s) => <option key={s.subjectId} value={s.subjectId}>{st.subjects.find((x) => x.id === s.subjectId)?.name}</option>)}</Select>
            <Input aria-label="New marks" placeholder="New marks" inputMode="decimal" value={fix.marks} onChange={(e) => setFix({ ...fix, marks: e.target.value })} required /><Input aria-label="Reason" placeholder="Reason (audited)" value={fix.reason} onChange={(e) => setFix({ ...fix, reason: e.target.value })} required minLength={3} /></div>
          <Button type="submit" size="sm" loading={busy}>Record correction</Button></form>
      )}
    </div>
  );
}

function Cards() {
  const st = useStructure(); const [classId, setClassId] = useState(""); const [studentId, setStudentId] = useState(""); const [examId, setExamId] = useState("");
  const students = useFetch<{ items: { id: string; name: string }[] }>(classId ? `/api/students${qs({ classId, pageSize: 100 })}` : null);
  const exams = useFetch<{ id: string; name: string; status: string }[]>(studentId ? `/api/results${qs({ studentId })}` : null);
  return (<div className="space-y-4"><div className="grid gap-3 md:grid-cols-3">
    <Field label="Class"><Select value={classId} onChange={(e) => { setClassId(e.target.value); setStudentId(""); setExamId(""); }}><option value="">Select</option>{st.classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</Select></Field>
    <Field label="Student"><Select value={studentId} onChange={(e) => { setStudentId(e.target.value); setExamId(""); }} disabled={!classId}><option value="">Select</option>{students.data?.items.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</Select></Field>
    <Field label="Exam"><Select value={examId} onChange={(e) => setExamId(e.target.value)} disabled={!studentId}><option value="">Select</option>{exams.data?.map((x) => <option key={x.id} value={x.id}>{x.name} ({x.status.replace("_", " ")})</option>)}</Select></Field></div>
    {examId && studentId && <ReportCard examId={examId} studentId={studentId} />}</div>);
}
