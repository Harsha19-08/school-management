"use client";
import { useState } from "react";
import { Button, ErrorNote, Field, Input, Select, Skeleton } from "@/components/ui/primitives";
import { Modal } from "@/components/ui/modal";
import { ClassSectionSelect } from "@/components/ui/class-section-select";
import { useFetch } from "@/hooks/use-fetch";
import { useAction } from "@/hooks/use-action";
import { useStructure } from "@/hooks/use-structure";
import { api, qs } from "@/lib/api/client";
import type { TimetableSlot } from "@/features/academics/timetable";
import { TimetableGrid } from "./timetable-grid";

export function TimetableEditor({ canWrite }: { canWrite: boolean }) {
  const [sel, setSel] = useState({ classId: "", sectionId: "" });
  const { data, error, loading, reload } = useFetch<TimetableSlot[]>(sel.sectionId ? `/api/timetable${qs({ sectionId: sel.sectionId })}` : null);
  const teachers = useFetch<{ items: { id: string; name: string }[] }>("/api/academics/teachers?pageSize=100");
  const st = useStructure(); const { busy, run } = useAction();
  const [cell, setCell] = useState<{ day: number; period: number; slot?: TimetableSlot } | null>(null);
  const [v, setV] = useState({ subjectId: "", teacherId: "", start: "09:00", end: "09:45", room: "" });
  return (
    <div className="space-y-3">
      <div className="max-w-md"><ClassSectionSelect classId={sel.classId} sectionId={sel.sectionId} onChange={setSel} /></div>
      {error && <ErrorNote message={error} />}
      {!sel.sectionId ? <p className="text-sm text-muted">Choose a class and section to view its timetable.</p> : loading || !data ? <Skeleton className="h-64" /> : (
        <TimetableGrid slots={data} onCell={canWrite ? (day, period, slot) => { setCell({ day, period, slot }); setV(slot ? { subjectId: slot.subjectId, teacherId: slot.teacherId ?? "", start: slot.start, end: slot.end, room: slot.room ?? "" } : { subjectId: "", teacherId: "", start: `${String(8 + period).padStart(2, "0")}:00`, end: `${String(8 + period).padStart(2, "0")}:45`, room: "" }); } : undefined} />
      )}
      <Modal open={!!cell} onOpenChange={(o) => !o && setCell(null)} title={cell ? `Day ${cell.day} · Period ${cell.period}` : ""}>
        <form className="space-y-3" onSubmit={async (e) => { e.preventDefault(); if (!cell) return; const r = await run(() => api("/api/timetable", { method: "PUT", json: { sectionId: sel.sectionId, day: cell.day, period: cell.period, ...v, teacherId: v.teacherId || undefined, room: v.room || undefined } }), "Saved"); if (r) { setCell(null); reload(); } }}>
          <Field label="Subject"><Select value={v.subjectId} onChange={(e) => setV({ ...v, subjectId: e.target.value })} required><option value="">Select</option>{st.subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</Select></Field>
          <Field label="Teacher"><Select value={v.teacherId} onChange={(e) => setV({ ...v, teacherId: e.target.value })}><option value="">Unassigned</option>{teachers.data?.items.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</Select></Field>
          <div className="grid grid-cols-3 gap-2"><Field label="Start"><Input type="time" value={v.start} onChange={(e) => setV({ ...v, start: e.target.value })} required /></Field><Field label="End"><Input type="time" value={v.end} onChange={(e) => setV({ ...v, end: e.target.value })} required /></Field><Field label="Room"><Input value={v.room} onChange={(e) => setV({ ...v, room: e.target.value })} /></Field></div>
          <div className="flex gap-2"><Button type="submit" className="flex-1" loading={busy}>Save</Button>{cell?.slot && <Button type="button" variant="danger" onClick={async () => { const r = await run(() => api(`/api/timetable${qs({ sectionId: sel.sectionId, day: cell.day, period: cell.period })}`, { method: "DELETE" }), "Cleared"); if (r) { setCell(null); reload(); } }}>Clear</Button>}</div>
        </form>
      </Modal>
    </div>
  );
}
