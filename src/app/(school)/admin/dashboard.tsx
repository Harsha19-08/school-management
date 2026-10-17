"use client";
import Link from "next/link";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { Card, ErrorNote, PageHeader, Skeleton } from "@/components/ui/primitives";
import { useFetch } from "@/hooks/use-fetch";
import { formatINR } from "@/lib/money";

interface D { students: number; teachers: number; pendingAdmissions: number; openExams: number; attendanceToday: { marked: number; presentPct: number | null }; fees: { totalPaise: number; paidPaise: number; outstandingPaise: number; collectedLast30Paise: number }; upcomingEvents: { id: string; title: string; startsAt: string; venue?: string }[] }

export function AdminDashboard({ school, name }: { school: string; name: string }) {
  const { data, error, loading } = useFetch<D>("/api/dashboard/admin");
  const pct = data && data.fees.totalPaise > 0 ? Math.round((data.fees.paidPaise / data.fees.totalPaise) * 100) : null;
  return (
    <>
      <PageHeader title="Good day," accent={name} subtitle={school} />
      {error && <ErrorNote message={error} />}
      {loading || !data ? <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24" />)}</div> : (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <KpiCard label="Active students" value={data.students} />
            <KpiCard label="Teachers" value={data.teachers} />
            <KpiCard label="Attendance today" value={data.attendanceToday.presentPct === null ? "—" : `${data.attendanceToday.presentPct}%`} hint={data.attendanceToday.marked ? `${data.attendanceToday.marked} marked` : "Not marked yet"} />
            <KpiCard label="Pending admissions" value={data.pendingAdmissions} tone={data.pendingAdmissions ? "warn" : undefined} />
          </div>
          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <h2 className="text-xl text-primary">Fee collection</h2>
              {pct === null ? <p className="mt-3 text-sm text-muted">No fees have been generated yet.</p> : (
                <>
                  <div className="mt-4 h-3 overflow-hidden rounded-full bg-soft" role="img" aria-label={`${pct}% collected`}><div className="h-full rounded-full bg-interactive" style={{ width: `${pct}%` }} /></div>
                  <dl className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                    <div><dt className="text-muted">Billed</dt><dd className="font-mono font-semibold">{formatINR(data.fees.totalPaise)}</dd></div>
                    <div><dt className="text-muted">Collected</dt><dd className="font-mono font-semibold text-success">{formatINR(data.fees.paidPaise)}</dd></div>
                    <div><dt className="text-muted">Outstanding</dt><dd className="font-mono font-semibold text-warning">{formatINR(data.fees.outstandingPaise)}</dd></div>
                    <div><dt className="text-muted">Last 30 days</dt><dd className="font-mono font-semibold">{formatINR(data.fees.collectedLast30Paise)}</dd></div>
                  </dl>
                </>
              )}
            </Card>
            <Card>
              <h2 className="text-xl text-primary">Upcoming</h2>
              {data.upcomingEvents.length === 0 ? <p className="mt-3 text-sm text-muted">No published events ahead.</p> : (
                <ul className="mt-3 space-y-3">{data.upcomingEvents.map((e) => <li key={e.id} className="text-sm"><p className="font-semibold">{e.title}</p><p className="text-xs text-muted">{new Date(e.startsAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}{e.venue ? ` · ${e.venue}` : ""}</p></li>)}</ul>
              )}
              <Link href="/admin/events" className="mt-3 inline-block text-sm text-interactive hover:underline">All events</Link>
            </Card>
          </div>
          {data.openExams > 0 && <p className="text-sm text-muted">{data.openExams} exam(s) are scheduled or open for marks entry. <Link className="text-interactive hover:underline" href="/admin/exams">Review</Link></p>}
        </div>
      )}
    </>
  );
}
