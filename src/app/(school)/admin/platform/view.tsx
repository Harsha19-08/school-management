"use client";
import { Card, ErrorNote, PageHeader, Skeleton } from "@/components/ui/primitives";
import { useFetch } from "@/hooks/use-fetch";
import { formatINR } from "@/lib/money";

interface Row { id: string; slug: string; name: string; students: number; teachers: number; pendingAdmissions: number; feeTotalPaise: number; feePaidPaise: number }
export function PlatformView() {
  const { data, error, loading } = useFetch<{ schools: Row[] }>("/api/dashboard/platform");
  return (
    <>
      <PageHeader title="Platform" accent="overview" subtitle="Both schools side by side. Data stays separated per school." />
      {error && <ErrorNote message={error} />}
      {loading ? <Skeleton className="h-40" /> : (
        <div className="grid gap-4 md:grid-cols-2">
          {data?.schools.map((s) => (
            <Card key={s.id} data-school={s.slug} className="border-t-4 border-t-primary">
              <h2 className="text-2xl text-primary">{s.name}</h2>
              <dl className="mt-4 grid grid-cols-3 gap-3 text-sm">
                <div><dt className="text-muted">Students</dt><dd className="font-display text-2xl">{s.students}</dd></div>
                <div><dt className="text-muted">Teachers</dt><dd className="font-display text-2xl">{s.teachers}</dd></div>
                <div><dt className="text-muted">Pending apps</dt><dd className="font-display text-2xl">{s.pendingAdmissions}</dd></div>
              </dl>
              <p className="mt-4 text-sm text-muted">Fees collected <span className="font-mono font-semibold text-ink">{formatINR(s.feePaidPaise)}</span> of <span className="font-mono">{formatINR(s.feeTotalPaise)}</span></p>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
