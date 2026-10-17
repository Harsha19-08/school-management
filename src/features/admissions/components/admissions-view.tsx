"use client";
import { useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Plus } from "lucide-react";
import { Badge, Button, ErrorNote, Field, Input, Select, Skeleton } from "@/components/ui/primitives";
import { Modal } from "@/components/ui/modal";
import { DataTable } from "@/components/tables/data-table";
import { ClassSectionSelect } from "@/components/ui/class-section-select";
import { useList } from "@/hooks/use-list";
import { useFetch } from "@/hooks/use-fetch";
import { useAction } from "@/hooks/use-action";
import { useStructure } from "@/hooks/use-structure";
import { api } from "@/lib/api/client";
import { manualTargets, type AdmissionStatus } from "@/features/admissions/logic";

interface Row { id: string; applicationNo: string; status: AdmissionStatus; studentName: string; guardian: { name: string; phone: string }; classId: string; createdAt: string }
interface Detail { id: string; applicationNo: string; status: AdmissionStatus; student: { firstName: string; lastName: string; gender: string; dob: string }; guardian: { name: string; phone: string; email?: string }; classId: string; previousSchool?: string; decisionNote?: string; enrolledStudentId?: string; history: { at: string; from?: string; to: string; note?: string }[] }
const tone: Record<string, "neutral" | "info" | "warning" | "success" | "danger"> = { draft: "neutral", submitted: "info", under_review: "warning", approved: "success", rejected: "danger", enrolled: "success" };
const label = (s: string) => s.replace("_", " ");

export function AdmissionsView({ canWrite, canDecide }: { canWrite: boolean; canDecide: boolean }) {
  const l = useList<Row>("/api/admissions");
  const st = useStructure();
  const [create, setCreate] = useState(false); const [open, setOpen] = useState<string | null>(null);
  const cls = useMemo(() => new Map(st.classes.map((c) => [c.id, c.name])), [st.classes]);
  const cols = useMemo<ColumnDef<Row, unknown>[]>(() => [
    { id: "applicationNo", header: "Application", cell: ({ row }) => <span className="font-mono text-xs">{row.original.applicationNo}</span> },
    { id: "studentName", header: "Applicant", cell: ({ row }) => <span className="font-semibold">{row.original.studentName}</span> },
    { id: "class", header: "Class", cell: ({ row }) => cls.get(row.original.classId) ?? "—" },
    { id: "guardian", header: "Guardian", cell: ({ row }) => `${row.original.guardian.name} · ${row.original.guardian.phone}` },
    { id: "status", header: "Status", cell: ({ row }) => <Badge tone={tone[row.original.status]}>{label(row.original.status)}</Badge> },
  ], [cls]);
  return (
    <>
      <div className="mb-4 flex flex-wrap gap-2">
        <Input aria-label="Search applications" className="max-w-xs" placeholder="Search applicant, guardian, number" value={l.q} onChange={(e) => l.setQ(e.target.value)} />
        <Select aria-label="Status" className="w-44" value={l.filters.status ?? ""} onChange={(e) => l.setFilter("status", e.target.value || undefined)}><option value="">All statuses</option>{["draft", "submitted", "under_review", "approved", "rejected", "enrolled"].map((s) => <option key={s} value={s}>{label(s)}</option>)}</Select>
        {canWrite && <Button className="ml-auto" onClick={() => setCreate(true)}><Plus className="size-4" />New application</Button>}
      </div>
      <DataTable columns={cols} data={l.items} loading={l.loading} state={l.state} onPage={l.onPage} onRowClick={(r) => setOpen(r.id)} empty={{ title: "No applications", hint: "New applications appear here." }} />
      <Modal open={create} onOpenChange={setCreate} title="New application" wide><AppForm onDone={() => { setCreate(false); l.reload(); }} /></Modal>
      <Modal open={!!open} onOpenChange={(o) => !o && setOpen(null)} title="Application" wide>{open && <Review id={open} canWrite={canWrite} canDecide={canDecide} onChanged={l.reload} />}</Modal>
    </>
  );
}

function AppForm({ onDone }: { onDone: () => void }) {
  const [f, setF] = useState({ firstName: "", lastName: "", gender: "male", dob: "", gName: "", gPhone: "", gEmail: "", classId: "", previousSchool: "" });
  const [submit, setSubmit] = useState(true); const [err, setErr] = useState<string | null>(null);
  const { busy, run } = useAction(); const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });
  const st = useStructure();
  return (
    <form className="space-y-3" onSubmit={async (e) => { e.preventDefault(); setErr(null);
      const r = await run(() => api("/api/admissions", { method: "POST", json: { student: { firstName: f.firstName, lastName: f.lastName, gender: f.gender, dob: f.dob }, guardian: { name: f.gName, phone: f.gPhone, email: f.gEmail || undefined }, classId: f.classId, previousSchool: f.previousSchool || undefined, submit } }).catch((x: Error) => { setErr(x.message); throw x; }), "Application saved");
      if (r) onDone(); }}>
      {err && <ErrorNote message={err} />}
      <div className="grid grid-cols-2 gap-3">
        <Field label="First name"><Input value={f.firstName} onChange={set("firstName")} required /></Field><Field label="Last name"><Input value={f.lastName} onChange={set("lastName")} required /></Field>
        <Field label="Gender"><Select value={f.gender} onChange={set("gender")}><option value="male">Male</option><option value="female">Female</option><option value="other">Other</option></Select></Field>
        <Field label="Date of birth"><Input type="date" value={f.dob} onChange={set("dob")} required /></Field>
        <Field label="Applying for class"><Select value={f.classId} onChange={set("classId")} required><option value="">Select</option>{st.classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</Select></Field>
        <Field label="Previous school"><Input value={f.previousSchool} onChange={set("previousSchool")} /></Field>
        <Field label="Guardian name"><Input value={f.gName} onChange={set("gName")} required /></Field><Field label="Guardian phone"><Input inputMode="tel" value={f.gPhone} onChange={set("gPhone")} required /></Field>
        <Field label="Guardian email" className="col-span-2"><Input type="email" value={f.gEmail} onChange={set("gEmail")} /></Field>
      </div>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={submit} onChange={(e) => setSubmit(e.target.checked)} />Submit for review now (otherwise saved as draft)</label>
      <Button type="submit" className="w-full" loading={busy}>Save application</Button>
    </form>
  );
}

function Review({ id, canWrite, canDecide, onChanged }: { id: string; canWrite: boolean; canDecide: boolean; onChanged: () => void }) {
  const { data, error, reload } = useFetch<Detail>(`/api/admissions/${id}`);
  const { busy, run } = useAction(); const [note, setNote] = useState(""); const [place, setPlace] = useState({ classId: "", sectionId: "" });
  const st = useStructure();
  if (error) return <ErrorNote message={error} />;
  if (!data) return <Skeleton className="h-40" />;
  const targets = manualTargets(data.status).filter((t) => (t === "approved" || t === "rejected" ? canDecide : canWrite));
  const classId = data.classId;
  return (
    <div className="space-y-4 text-sm">
      <div className="flex items-center justify-between"><p className="font-mono text-xs">{data.applicationNo}</p><Badge tone={tone[data.status]}>{label(data.status)}</Badge></div>
      <dl className="grid grid-cols-2 gap-3">
        <div><dt className="text-muted">Applicant</dt><dd className="font-semibold">{data.student.firstName} {data.student.lastName}</dd></div><div><dt className="text-muted">Date of birth</dt><dd>{new Date(data.student.dob).toLocaleDateString("en-IN")}</dd></div>
        <div><dt className="text-muted">Applying for</dt><dd>{st.classes.find((c) => c.id === classId)?.name}</dd></div><div><dt className="text-muted">Previous school</dt><dd>{data.previousSchool ?? "—"}</dd></div>
        <div><dt className="text-muted">Guardian</dt><dd>{data.guardian.name}</dd></div><div><dt className="text-muted">Contact</dt><dd>{data.guardian.phone}</dd></div>
      </dl>
      {data.decisionNote && <p className="rounded-xl bg-soft p-3">Decision note: {data.decisionNote}</p>}
      {targets.length > 0 && (
        <div className="space-y-2"><Field label="Note (kept in history)"><Input value={note} onChange={(e) => setNote(e.target.value)} /></Field>
          <div className="flex flex-wrap gap-2">{targets.map((t) => <Button key={t} variant={t === "rejected" ? "danger" : "primary"} size="sm" loading={busy} onClick={async () => { if (await run(() => api(`/api/admissions/${id}/transition`, { method: "POST", json: { to: t, note: note || undefined } }), `Moved to ${label(t)}`)) { reload(); onChanged(); } }}>{t === "under_review" ? "Start review" : t === "submitted" ? "Submit" : t === "approved" ? "Approve" : "Reject"}</Button>)}</div></div>
      )}
      {data.status === "approved" && canDecide && (
        <div className="space-y-2 rounded-xl border border-line p-3"><p className="font-semibold">Enroll as student</p>
          <ClassSectionSelect classId={classId} sectionId={place.sectionId} onChange={(v) => setPlace({ classId, sectionId: v.sectionId })} disabled={false} />
          <Button size="sm" loading={busy} disabled={!place.sectionId} onClick={async () => { if (await run(() => api(`/api/admissions/${id}/enroll`, { method: "POST", json: { sectionId: place.sectionId } }), "Student enrolled")) { reload(); onChanged(); } }}>Enroll</Button></div>
      )}
      {data.enrolledStudentId && <a className="text-interactive hover:underline" href={`/admin/students/${data.enrolledStudentId}`}>Open student record</a>}
      <div><p className="mb-1 font-semibold">History</p><ul className="space-y-1 text-xs text-muted">{[...data.history].reverse().map((h, i) => <li key={i}>{new Date(h.at).toLocaleString("en-IN")} — {h.from ? `${label(h.from)} → ` : ""}{label(h.to)}{h.note ? ` (${h.note})` : ""}</li>)}</ul></div>
    </div>
  );
}
