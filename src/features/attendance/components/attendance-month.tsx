"use client";
import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Badge, Button, Card, ErrorNote, Skeleton } from "@/components/ui/primitives";
import { useFetch } from "@/hooks/use-fetch";
import { qs } from "@/lib/api/client";

interface D { month: string; days: { date: string; status: string; remarks?: string }[]; monthSummary: { present: number; late: number; absent: number; leave: number; percent: number | null }; overall: { percent: number | null } }
const COLOR: Record<string, string> = { present: "bg-success/15 text-success", late: "bg-warning/15 text-warning", absent: "bg-danger/15 text-danger", leave: "bg-soft text-primary" };
const shift = (ym: string, n: number) => { const [y, m] = ym.split("-").map(Number); const d = new Date(Date.UTC(y, m - 1 + n, 1)); return d.toISOString().slice(0, 7); };

/** Month calendar + totals for one student. The server resolves which student the caller may see. */
export function AttendanceMonth({ studentId }: { studentId?: string }) {
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const { data, error, loading } = useFetch<D>(`/api/attendance/summary${qs({ studentId, month })}`);
  const [y, m] = month.split("-").map(Number); const first = new Date(Date.UTC(y, m - 1, 1)); const days = new Date(Date.UTC(y, m, 0)).getUTCDate(); const lead = (first.getUTCDay() + 6) % 7;
  const by = new Map(data?.days.map((d) => [d.date, d]));
  return (
    <Card>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl text-primary">{first.toLocaleDateString("en-IN", { month: "long", year: "numeric", timeZone: "UTC" })}</h2>
        <div className="flex gap-1"><Button size="sm" variant="secondary" aria-label="Previous month" onClick={() => setMonth(shift(month, -1))}><ChevronLeft className="size-4" /></Button><Button size="sm" variant="secondary" aria-label="Next month" onClick={() => setMonth(shift(month, 1))}><ChevronRight className="size-4" /></Button></div>
      </div>
      {error && <ErrorNote message={error} />}
      {loading || !data ? <Skeleton className="h-52" /> : (
        <>
          <div className="mb-4 flex flex-wrap gap-2 text-sm">
            <Badge tone="info">This month: {data.monthSummary.percent === null ? "no records" : `${data.monthSummary.percent}%`}</Badge>
            <Badge>Overall: {data.overall.percent === null ? "no records" : `${data.overall.percent}%`}</Badge>
            <Badge tone="success">Present {data.monthSummary.present}</Badge><Badge tone="warning">Late {data.monthSummary.late}</Badge><Badge tone="danger">Absent {data.monthSummary.absent}</Badge><Badge tone="info">Leave {data.monthSummary.leave}</Badge>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center text-xs" role="grid" aria-label="Attendance calendar">
            {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => <div key={i} className="py-1 font-semibold text-muted">{d}</div>)}
            {Array.from({ length: lead }).map((_, i) => <div key={"b" + i} />)}
            {Array.from({ length: days }).map((_, i) => { const key = `${month}-${String(i + 1).padStart(2, "0")}`; const rec = by.get(key); return <div key={key} title={rec ? `${rec.status}${rec.remarks ? ` — ${rec.remarks}` : ""}` : "No record"} className={`grid aspect-square place-items-center rounded-lg ${rec ? COLOR[rec.status] : "bg-canvas text-muted"}`}><span>{i + 1}</span></div>; })}
          </div>
          <p className="mt-3 text-xs text-muted">Attendance % counts present and late days against present, late and absent days; approved leave is excluded.</p>
        </>
      )}
    </Card>
  );
}
