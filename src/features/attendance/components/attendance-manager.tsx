"use client";
import { useState } from "react";
import { Check } from "lucide-react";
import { Badge, Button, Card, EmptyState, ErrorNote, Input, Skeleton, Tabs } from "@/components/ui/primitives";
import { ClassSectionSelect } from "@/components/ui/class-section-select";
import { useFetch } from "@/hooks/use-fetch";
import { useAction } from "@/hooks/use-action";
import { api, qs } from "@/lib/api/client";

type St = "present" | "absent" | "late" | "leave";
interface Roster { date: string; marked: boolean; students: { id: string; name: string; rollNo?: number; status: St | null; remarks: string }[] }
interface Report { threshold: number; rows: { id: string; name: string; rollNo?: number; present: number; late: number; absent: number; leave: number; percent: number | null; low: boolean }[] }
const OPTS: { v: St; label: string; cls: string }[] = [{ v: "present", label: "P", cls: "bg-success text-white" }, { v: "late", label: "L", cls: "bg-warning text-white" }, { v: "absent", label: "A", cls: "bg-danger text-white" }, { v: "leave", label: "Lv", cls: "bg-primary text-white" }];
const today = () => new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });

export function AttendanceManager({ canMark }: { canMark: boolean }) {
  const [sel, setSel] = useState({ classId: "", sectionId: "" }); const [date, setDate] = useState(today()); const [tab, setTab] = useState<"mark" | "report">("mark");
  const roster = useFetch<Roster>(sel.sectionId && tab === "mark" ? `/api/attendance${qs({ sectionId: sel.sectionId, date })}` : null);
  const [edits, setEdits] = useState<{ key: string; marks: Record<string, St>; rem: Record<string, string> }>({ key: "", marks: {}, rem: {} });
  const { busy, run } = useAction();
  const [from, setFrom] = useState(() => new Date(Date.now() - 29 * 86400000).toLocaleDateString("en-CA")); const [to, setTo] = useState(today());
  const report = useFetch<Report>(sel.sectionId && tab === "report" ? `/api/attendance/report${qs({ sectionId: sel.sectionId, from, to })}` : null);
  const students = roster.data?.students ?? [];
  // Edits are scoped to the section+date they were made for; the server values fill in everything else.
  const scope = `${sel.sectionId}|${date}`; const mine = edits.key === scope ? edits : { key: scope, marks: {}, rem: {} };
  const marks: Record<string, St> = { ...Object.fromEntries(students.filter((s) => s.status).map((s) => [s.id, s.status as St])), ...mine.marks };
  const rem: Record<string, string> = { ...Object.fromEntries(students.map((s) => [s.id, s.remarks])), ...mine.rem };
  const setMarks = (m: Record<string, St>) => setEdits({ ...mine, marks: m }); const setRem = (r: Record<string, string>) => setEdits({ ...mine, rem: r });
  const unmarked = students.filter((s) => !marks[s.id]).length;
  return (
    <div className="space-y-4">
      <Tabs value={tab} onChange={setTab} tabs={[{ id: "mark", label: canMark ? "Mark attendance" : "View" }, { id: "report", label: "Report" }]} />
      <div className="flex flex-wrap items-end gap-3"><div className="w-full max-w-md"><ClassSectionSelect classId={sel.classId} sectionId={sel.sectionId} onChange={setSel} /></div>
        {tab === "mark" ? <label className="space-y-1.5 text-xs font-semibold">Date<Input type="date" max={today()} value={date} onChange={(e) => setDate(e.target.value)} className="w-44" /></label>
          : <><label className="space-y-1.5 text-xs font-semibold">From<Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-40" /></label><label className="space-y-1.5 text-xs font-semibold">To<Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-40" /></label></>}</div>
      {!sel.sectionId && <EmptyState title="Pick a section" hint="Choose a class and section to continue." />}
      {tab === "mark" && sel.sectionId && (roster.error ? <ErrorNote message={roster.error} /> : roster.loading || !roster.data ? <Skeleton className="h-64" /> : students.length === 0 ? <EmptyState title="No active students in this section" /> : (
        <Card className="p-0">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line p-4">
            <p className="text-sm text-muted">{roster.data.marked ? "Already marked — saving updates the record." : "Not marked yet."} {unmarked > 0 && <span className="text-warning">{unmarked} unmarked</span>}</p>
            {canMark && <div className="flex gap-2"><Button size="sm" variant="secondary" onClick={() => setMarks(Object.fromEntries(students.map((s) => [s.id, "present" as St])))}>All present</Button>
              <Button size="sm" loading={busy} disabled={unmarked > 0} onClick={async () => { if (await run(() => api("/api/attendance", { method: "POST", json: { sectionId: sel.sectionId, date, records: students.map((s) => ({ studentId: s.id, status: marks[s.id], remarks: rem[s.id] || undefined })) } }), "Attendance saved")) roster.reload(); }}><Check className="size-4" />Save</Button></div>}
          </div>
          <ul className="divide-y divide-line">{students.map((s) => (
            <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5">
              <span className="min-w-40 text-sm"><span className="mr-2 font-mono text-xs text-muted">{s.rollNo}</span>{s.name}</span>
              <div className="flex items-center gap-2">
                <div role="group" aria-label={`Status for ${s.name}`} className="flex gap-1">{OPTS.map((o) => <button key={o.v} disabled={!canMark} aria-pressed={marks[s.id] === o.v} title={o.v} onClick={() => setMarks({ ...marks, [s.id]: o.v })} className={`h-9 w-10 rounded-lg border text-xs font-bold transition ${marks[s.id] === o.v ? o.cls + " border-transparent" : "border-line bg-surface text-muted hover:bg-soft"}`}>{o.label}</button>)}</div>
                {canMark && <Input aria-label={`Remarks for ${s.name}`} placeholder="Remark" className="hidden h-9 w-40 sm:block" value={rem[s.id] ?? ""} onChange={(e) => setRem({ ...rem, [s.id]: e.target.value })} />}
              </div>
            </li>))}</ul>
        </Card>
      ))}
      {tab === "report" && sel.sectionId && (report.error ? <ErrorNote message={report.error} /> : report.loading || !report.data ? <Skeleton className="h-64" /> : (
        <div className="overflow-x-auto rounded-[14px] border border-line bg-surface"><table className="w-full text-sm"><thead className="border-b border-line bg-canvas text-left text-xs uppercase text-muted"><tr><th className="px-4 py-3">Student</th><th className="px-4 py-3 text-right">Present</th><th className="px-4 py-3 text-right">Late</th><th className="px-4 py-3 text-right">Absent</th><th className="px-4 py-3 text-right">Leave</th><th className="px-4 py-3 text-right">%</th></tr></thead>
          <tbody>{report.data.rows.map((r) => <tr key={r.id} className="border-b border-line last:border-0"><td className="px-4 py-2.5">{r.name}</td><td className="px-4 py-2.5 text-right">{r.present}</td><td className="px-4 py-2.5 text-right">{r.late}</td><td className="px-4 py-2.5 text-right">{r.absent}</td><td className="px-4 py-2.5 text-right">{r.leave}</td><td className="px-4 py-2.5 text-right">{r.percent === null ? <span className="text-muted">no data</span> : <Badge tone={r.low ? "danger" : "success"}>{r.percent}%</Badge>}</td></tr>)}</tbody></table>
          <p className="border-t border-line px-4 py-2 text-xs text-muted">Low-attendance threshold: {report.data.threshold}%.</p></div>
      ))}
    </div>
  );
}
