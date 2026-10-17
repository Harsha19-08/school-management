import type { TimetableSlot } from "@/features/academics/timetable";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
/** Read-only weekly grid, shared by admin, teacher, student and parent views. */
export function TimetableGrid({ slots, onCell, showSection }: { slots: TimetableSlot[]; onCell?: (day: number, period: number, slot?: TimetableSlot) => void; showSection?: boolean }) {
  const periods = Math.max(5, ...slots.map((s) => s.period));
  const get = (d: number, p: number) => slots.find((s) => s.day === d && s.period === p);
  return (
    <div className="overflow-x-auto rounded-[14px] border border-line bg-surface">
      <table className="w-full min-w-[640px] text-sm">
        <thead className="border-b border-line bg-canvas text-xs uppercase text-muted"><tr><th className="px-3 py-2 text-left">Period</th>{DAYS.map((d) => <th key={d} className="px-3 py-2 text-left">{d}</th>)}</tr></thead>
        <tbody>{Array.from({ length: periods }).map((_, pi) => { const p = pi + 1; const any = slots.find((s) => s.period === p); return (
          <tr key={p} className="border-b border-line last:border-0 align-top">
            <th scope="row" className="px-3 py-2 text-left font-mono text-xs text-muted">P{p}{any && <div>{any.start}–{any.end}</div>}</th>
            {DAYS.map((_, di) => { const s = get(di + 1, p); const Cell = onCell ? "button" : "div"; return (
              <td key={di} className="p-1"><Cell {...(onCell ? { type: "button" as const, onClick: () => onCell(di + 1, p, s) } : {})} className={`block min-h-14 w-full rounded-lg px-2 py-1.5 text-left ${s ? "bg-soft" : "bg-canvas/60"} ${onCell ? "hover:ring-2 hover:ring-interactive/40" : ""}`}>
                {s ? <><span className="block font-semibold text-primary">{s.subjectName}</span><span className="block text-xs text-muted">{showSection ? s.sectionLabel : s.teacherName}{s.room ? ` · ${s.room}` : ""}</span></> : <span className="text-xs text-muted">{onCell ? "+ add" : ""}</span>}
              </Cell></td>); })}
          </tr>); })}</tbody>
      </table>
    </div>
  );
}
