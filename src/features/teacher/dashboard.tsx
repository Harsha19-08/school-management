"use client";
import Link from "next/link";
import { Card, PageHeader, Skeleton } from "@/components/ui/primitives";
import { useFetch } from "@/hooks/use-fetch";
import { useStructure } from "@/hooks/use-structure";
import type { TimetableSlot } from "@/features/academics/timetable";

export function TeacherDashboard({ name }: { name: string }) {
  const tt = useFetch<TimetableSlot[]>("/api/timetable?mine=1"); const st = useStructure();
  const dow = ((new Date().getDay() + 6) % 7) + 1; const today = (tt.data ?? []).filter((s) => s.day === dow);
  return (<>
    <PageHeader title="Hello," accent={name} subtitle={new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })} />
    <div className="grid gap-4 md:grid-cols-3">
      <Card className="md:col-span-2"><h2 className="mb-3 text-xl text-primary">Today&apos;s classes</h2>
        {tt.loading ? <Skeleton className="h-24" /> : today.length === 0 ? <p className="text-sm text-muted">{dow > 6 ? "No classes on Sunday." : "No classes scheduled today."}</p> : <ul className="divide-y divide-line text-sm">{today.map((s) => <li key={s.id} className="flex justify-between py-2"><span><b>{s.subjectName}</b> <span className="text-muted">· {s.sectionLabel}</span></span><span className="font-mono text-xs text-muted">{s.start}–{s.end}</span></li>)}</ul>}</Card>
      <Card><h2 className="mb-3 text-xl text-primary">Quick links</h2><ul className="space-y-2 text-sm text-interactive"><li><Link href="/teacher/attendance" className="hover:underline">Mark attendance</Link></li><li><Link href="/teacher/marks" className="hover:underline">Enter marks</Link></li><li><Link href="/teacher/assignments" className="hover:underline">Assignments</Link></li></ul><p className="mt-3 text-xs text-muted">{st.sections.length} section(s) assigned</p></Card>
    </div></>);
}
