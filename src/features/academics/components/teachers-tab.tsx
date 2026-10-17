"use client";
import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Badge, Button, EmptyState, Field, Input, Select, Skeleton } from "@/components/ui/primitives";
import { Modal } from "@/components/ui/modal";
import { useFetch } from "@/hooks/use-fetch";
import { useAction } from "@/hooks/use-action";
import { useStructure } from "@/hooks/use-structure";
import { api } from "@/lib/api/client";

interface T { id: string; name: string; employeeNo: string; email?: string; status: string; hasAccount: boolean; assignments: { subjectId: string; sectionId: string }[] }

export function TeachersTab({ canWrite }: { canWrite: boolean }) {
  const { data, loading, reload } = useFetch<{ items: T[] }>("/api/academics/teachers?pageSize=100");
  const st = useStructure(); const { busy, run } = useAction();
  const [add, setAdd] = useState(false); const [assign, setAssign] = useState<T | null>(null); const [link, setLink] = useState<string | null>(null);
  const [f, setF] = useState({ name: "", employeeNo: "", email: "", createAccount: false }); const [rows, setRows] = useState<{ subjectId: string; sectionId: string }[]>([]);
  const secLabel = (id: string) => { const s = st.sections.find((x) => x.id === id); return s ? `${st.classes.find((c) => c.id === s.classId)?.name}-${s.name}` : "—"; };
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between"><h2 className="text-xl text-primary">Teachers</h2>{canWrite && <Button size="sm" onClick={() => { setLink(null); setF({ name: "", employeeNo: "", email: "", createAccount: false }); setAdd(true); }}><Plus className="size-4" />Add</Button>}</div>
      {loading ? <Skeleton className="h-32" /> : !data?.items.length ? <EmptyState title="No teachers yet" /> : (
        <div className="overflow-x-auto rounded-[14px] border border-line bg-surface"><table className="w-full text-sm"><thead className="border-b border-line bg-canvas text-left text-xs uppercase text-muted"><tr><th className="px-4 py-3">Teacher</th><th className="px-4 py-3">Employee no.</th><th className="px-4 py-3">Teaching</th><th className="px-4 py-3">Login</th>{canWrite && <th />}</tr></thead>
          <tbody>{data.items.map((t) => <tr key={t.id} className="border-b border-line last:border-0 align-top"><td className="px-4 py-3 font-semibold">{t.name}<p className="text-xs font-normal text-muted">{t.email}</p></td><td className="px-4 py-3 font-mono text-xs">{t.employeeNo}</td><td className="px-4 py-3 text-xs text-muted">{t.assignments.length ? `${t.assignments.length} subject-section assignment(s)` : "None"}</td><td className="px-4 py-3"><Badge tone={t.hasAccount ? "success" : "neutral"}>{t.hasAccount ? "active" : "none"}</Badge></td>{canWrite && <td className="px-4 py-3 text-right"><Button size="sm" variant="secondary" onClick={() => { setAssign(t); setRows(t.assignments); }}>Assignments</Button></td>}</tr>)}</tbody></table></div>
      )}
      <Modal open={add} onOpenChange={setAdd} title="Add teacher">
        {link ? <div className="space-y-2 text-sm"><p>Share this one-time activation link (72 hours):</p><p className="break-all rounded-xl bg-soft p-3 font-mono text-xs">{window.location.origin}{link}</p></div> : (
          <form className="space-y-3" onSubmit={async (e) => { e.preventDefault(); const r = await run(() => api<{ activationPath: string | null }>("/api/academics/teachers", { method: "POST", json: { name: f.name, employeeNo: f.employeeNo, email: f.email || undefined, createAccount: f.createAccount } }), "Teacher added"); if (r) { reload(); if (r.activationPath) setLink(r.activationPath); else setAdd(false); } }}>
            <Field label="Name"><Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} required /></Field>
            <Field label="Employee number"><Input value={f.employeeNo} onChange={(e) => setF({ ...f, employeeNo: e.target.value })} required /></Field>
            <Field label="Email"><Input type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></Field>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={f.createAccount} onChange={(e) => setF({ ...f, createAccount: e.target.checked })} />Create a portal login (needs email)</label>
            <Button type="submit" className="w-full" loading={busy}>Add teacher</Button>
          </form>)}
      </Modal>
      <Modal open={!!assign} onOpenChange={(o) => !o && setAssign(null)} title={`Assignments — ${assign?.name ?? ""}`} description="Teachers can only mark attendance and enter marks for subject-section pairs listed here." wide>
        <div className="space-y-2">
          {rows.map((r, i) => (
            <div key={i} className="grid grid-cols-[1fr_1fr_auto] gap-2">
              <Select aria-label="Subject" value={r.subjectId} onChange={(e) => setRows(rows.map((x, j) => j === i ? { ...x, subjectId: e.target.value } : x))}><option value="">Subject</option>{st.subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</Select>
              <Select aria-label="Section" value={r.sectionId} onChange={(e) => setRows(rows.map((x, j) => j === i ? { ...x, sectionId: e.target.value } : x))}><option value="">Section</option>{st.sections.map((s) => <option key={s.id} value={s.id}>{secLabel(s.id)}</option>)}</Select>
              <Button variant="ghost" size="sm" aria-label="Remove" onClick={() => setRows(rows.filter((_, j) => j !== i))}><Trash2 className="size-4 text-danger" /></Button>
            </div>))}
          <Button variant="secondary" size="sm" onClick={() => setRows([...rows, { subjectId: "", sectionId: "" }])}><Plus className="size-3" />Add row</Button>
          <Button className="w-full" loading={busy} onClick={async () => { if (!assign) return; const r = await run(() => api(`/api/academics/teachers/${assign.id}`, { method: "PATCH", json: { assignments: rows.filter((x) => x.subjectId && x.sectionId) } }), "Assignments saved"); if (r) { setAssign(null); reload(); } }}>Save assignments</Button>
        </div>
      </Modal>
    </div>
  );
}
