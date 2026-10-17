"use client";
import { useState } from "react";
import { Badge, EmptyState, Skeleton } from "@/components/ui/primitives";
import { ReportCard } from "@/features/examinations/components/report-card";
import { useFetch } from "@/hooks/use-fetch";
import { qs } from "@/lib/api/client";

/** Lists only published exams (server-enforced) and shows the report card for the chosen one. */
export function ResultsView({ studentId }: { studentId?: string }) {
  const { data, loading } = useFetch<{ id: string; name: string; term: string }[]>(`/api/results${qs({ studentId })}`);
  const [sel, setSel] = useState<string | null>(null);
  if (loading || !data) return <Skeleton className="h-40" />;
  if (!data.length) return <EmptyState title="No results published yet" hint="Results appear here once the school publishes them." />;
  const id = sel ?? data[0].id;
  return (<div className="space-y-4"><div className="flex gap-2 overflow-x-auto pb-1">{data.map((e) => <button key={e.id} onClick={() => setSel(e.id)} className={`whitespace-nowrap rounded-full border px-4 py-1.5 text-sm font-semibold ${e.id === id ? "border-interactive bg-soft text-primary" : "border-line bg-surface text-muted"}`}>{e.name} <Badge className="ml-1">{e.term}</Badge></button>)}</div><ReportCard examId={id} studentId={studentId} /></div>);
}
