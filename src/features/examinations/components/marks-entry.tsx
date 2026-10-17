"use client";
import { useState } from "react";
import { Button, Card, EmptyState, ErrorNote, Field, Input, Select, Skeleton } from "@/components/ui/primitives";
import { ClassSectionSelect } from "@/components/ui/class-section-select";
import { useFetch } from "@/hooks/use-fetch";
import { useAction } from "@/hooks/use-action";
import { useStructure } from "@/hooks/use-structure";
import { api, qs } from "@/lib/api/client";

interface Exam { id: string; name: string; term: string; status: string; classId: string; subjects: { subjectId: string; maxMarks: number }[] }
interface Sheet { status: string; maxMarks: number; passMarks: number; students: { id: string; name: string; rollNo?: number; marks: number | null; absent: boolean }[] }

export function MarksEntry() {
  const exams = useFetch<{ items: Exam[] }>("/api/exams?pageSize=100&status=marks_open"); const st = useStructure();
  const [examId, setExamId] = useState(""); const [sel, setSel] = useState({ classId: "", sectionId: "" }); const [subjectId, setSubjectId] = useState("");
  const exam = exams.data?.items.find((e) => e.id === examId);
  const sheet = useFetch<Sheet>(exam && sel.sectionId && subjectId ? `/api/exams/${examId}/marks${qs({ sectionId: sel.sectionId, subjectId })}` : null);
  const [ed, setEd] = useState<{ key: string; vals: Record<string, string>; abs: Record<string, boolean> }>({ key: "", vals: {}, abs: {} }); const { busy, run } = useAction();
  const scope = `${examId}|${sel.sectionId}|${subjectId}`; const mine = ed.key === scope ? ed : { key: scope, vals: {}, abs: {} };
  const rows = sheet.data?.students ?? [];
  const vals: Record<string, string> = { ...Object.fromEntries(rows.map((s) => [s.id, s.marks === null ? "" : String(s.marks)])), ...mine.vals };
  const abs: Record<string, boolean> = { ...Object.fromEntries(rows.map((s) => [s.id, s.absent])), ...mine.abs };
  const setVals = (v: Record<string, string>) => setEd({ ...mine, vals: v }); const setAbs = (a: Record<string, boolean>) => setEd({ ...mine, abs: a });
  const bad = (id: string) => { const v = vals[id]; if (!v || abs[id]) return false; const n = Number(v); return Number.isNaN(n) || n < 0 || (sheet.data ? n > sheet.data.maxMarks : false); };
  const classSections = sel.classId;
  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-3">
        <Field label="Exam (marks open)"><Select value={examId} onChange={(e) => { setExamId(e.target.value); setSubjectId(""); const x = exams.data?.items.find((i) => i.id === e.target.value); if (x) setSel({ classId: x.classId, sectionId: "" }); }}><option value="">Select exam</option>{exams.data?.items.map((e) => <option key={e.id} value={e.id}>{e.name} · {st.classes.find((c) => c.id === e.classId)?.name}</option>)}</Select></Field>
        <Field label="Subject"><Select value={subjectId} onChange={(e) => setSubjectId(e.target.value)} disabled={!exam}><option value="">Select subject</option>{exam?.subjects.map((s) => <option key={s.subjectId} value={s.subjectId}>{st.subjects.find((x) => x.id === s.subjectId)?.name} (max {s.maxMarks})</option>)}</Select></Field>
      </div>
      {exam && <div className="max-w-md"><ClassSectionSelect classId={classSections} sectionId={sel.sectionId} onChange={(v) => setSel({ classId: exam.classId, sectionId: v.sectionId })} disabled={false} /></div>}
      {exams.data && exams.data.items.length === 0 && <EmptyState title="No exams are open for marks entry" hint="An administrator opens marks entry on an exam first." />}
      {sheet.error && <ErrorNote message={sheet.error} />}
      {sheet.loading && <Skeleton className="h-48" />}
      {sheet.data && (sheet.data.students.length === 0 ? <EmptyState title="No students in this section" /> : (
        <Card className="p-0">
          <div className="flex items-center justify-between border-b border-line p-4"><p className="text-sm text-muted">Out of <b>{sheet.data.maxMarks}</b> · pass mark {sheet.data.passMarks}</p>
            <Button size="sm" loading={busy} disabled={sheet.data.students.some((s) => bad(s.id))} onClick={async () => { if (await run(() => api(`/api/exams/${examId}/marks`, { method: "POST", json: { sectionId: sel.sectionId, subjectId, entries: sheet.data!.students.map((s) => abs[s.id] ? { studentId: s.id, absent: true } : { studentId: s.id, marks: vals[s.id] === "" ? null : Number(vals[s.id]) }) } }), "Marks saved")) sheet.reload(); }}>Save marks</Button></div>
          <ul className="divide-y divide-line">{sheet.data.students.map((s) => (
            <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5"><span className="text-sm"><span className="mr-2 font-mono text-xs text-muted">{s.rollNo}</span>{s.name}</span>
              <div className="flex items-center gap-3"><label className="flex items-center gap-1 text-xs"><input type="checkbox" checked={!!abs[s.id]} onChange={(e) => setAbs({ ...abs, [s.id]: e.target.checked })} />Absent</label>
                <Input aria-label={`Marks for ${s.name}`} inputMode="decimal" disabled={abs[s.id]} className={`h-9 w-24 text-right font-mono ${bad(s.id) ? "border-danger" : ""}`} value={vals[s.id] ?? ""} onChange={(e) => setVals({ ...vals, [s.id]: e.target.value })} /></div></li>))}</ul>
        </Card>
      ))}
    </div>
  );
}
