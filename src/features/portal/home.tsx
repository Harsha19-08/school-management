"use client";
import Link from "next/link";
import { Card, Skeleton } from "@/components/ui/primitives";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { useFetch } from "@/hooks/use-fetch";
import { qs } from "@/lib/api/client";
import { formatINR } from "@/lib/money";
import type { TimetableSlot } from "@/features/academics/timetable";

interface Att { overall: { percent: number | null }; monthSummary: { percent: number | null } }
interface Fee { outstandingPaise: number; overduePaise: number }
interface Notice { items: { id: string; title: string; body: string; createdAt: string }[] }

export function PortalHome({ studentId, base, name }: { studentId?: string; base: "/student" | "/parent"; name?: string }) {
  const q = qs({ studentId });
  const att = useFetch<Att>(`/api/attendance/summary${q}`); const fee = useFetch<Fee>(`/api/fees/summary${q}`);
  const tt = useFetch<TimetableSlot[]>(base === "/student" || studentId ? `/api/timetable${q}` : null); const nt = useFetch<Notice>("/api/notices?pageSize=3");
  const dow = ((new Date().getDay() + 6) % 7) + 1; const today = (tt.data ?? []).filter((s) => s.day === dow);
  return (
    <div className="space-y-5">
      {name && <h1 className="text-3xl text-primary">Hi, <span className="accent-italic">{name}</span></h1>}
      <div className="grid grid-cols-2 gap-3">
        <Link href={`${base}/attendance`}><KpiCard label="Attendance" value={att.data ? (att.data.overall.percent === null ? "—" : `${att.data.overall.percent}%`) : "…"} hint="Overall" /></Link>
        <Link href={`${base}/fees`}><KpiCard label="Fees due" value={fee.data ? formatINR(fee.data.outstandingPaise) : "…"} tone={fee.data?.overduePaise ? "warn" : undefined} hint={fee.data?.overduePaise ? "Some overdue" : undefined} /></Link>
      </div>
      <Card><h2 className="mb-2 text-xl text-primary">Today</h2>{tt.loading ? <Skeleton className="h-16" /> : today.length === 0 ? <p className="text-sm text-muted">No classes today.</p> : <ul className="divide-y divide-line text-sm">{today.map((s) => <li key={s.id} className="flex justify-between py-2"><span className="font-semibold">{s.subjectName}</span><span className="font-mono text-xs text-muted">{s.start}–{s.end}</span></li>)}</ul>}</Card>
      <Card><h2 className="mb-2 text-xl text-primary">Latest notices</h2>{nt.loading ? <Skeleton className="h-16" /> : !nt.data?.items.length ? <p className="text-sm text-muted">Nothing new.</p> : <ul className="space-y-3 text-sm">{nt.data.items.map((n) => <li key={n.id}><p className="font-semibold">{n.title}</p><p className="line-clamp-2 text-muted">{n.body}</p></li>)}</ul>}</Card>
    </div>
  );
}
