"use client";
import { Download } from "lucide-react";
import { Badge, Card, ErrorNote, Skeleton } from "@/components/ui/primitives";
import { useFetch } from "@/hooks/use-fetch";
import { qs } from "@/lib/api/client";
import type { ReportCard as RC } from "@/features/examinations/queries";

export function ReportCard({ examId, studentId }: { examId: string; studentId?: string }) {
  const { data, error, loading } = useFetch<RC>(`/api/results${qs({ examId, studentId })}`);
  if (error) return <ErrorNote message={error} />;
  if (loading || !data) return <Skeleton className="h-64" />;
  const s = data.summary;
  return (
    <Card>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
        <div><h2 className="text-2xl text-primary">{data.exam.name}</h2><p className="text-sm text-muted">{data.student.name} · {data.exam.term}</p></div>
        <a href={`/api/results/pdf${qs({ examId, studentId })}`} target="_blank" rel="noreferrer" className="inline-flex h-8 items-center gap-1 rounded-xl border border-line px-3 text-xs font-semibold hover:bg-soft"><Download className="size-3" />PDF</a>
      </div>
      {data.exam.status !== "published" && <p className="mb-3 rounded-xl bg-warning/10 p-2 text-xs text-warning">Not published — students and parents cannot see this yet.</p>}
      <div className="overflow-x-auto"><table className="w-full text-sm"><thead className="border-b border-line text-left text-xs uppercase text-muted"><tr><th className="py-2">Subject</th><th className="py-2 text-right">Marks</th><th className="py-2 text-right">Max</th><th className="py-2 text-right">Result</th></tr></thead>
        <tbody>{data.rows.map((r) => <tr key={r.subjectId} className="border-b border-line last:border-0"><td className="py-2.5 font-semibold">{r.subject}</td><td className="py-2.5 text-right font-mono">{r.absent ? "Absent" : r.marks ?? "—"}</td><td className="py-2.5 text-right font-mono text-muted">{r.maxMarks}</td><td className="py-2.5 text-right">{r.passed === null ? "—" : <Badge tone={r.passed ? "success" : "danger"}>{r.passed ? "Pass" : "Fail"}</Badge>}</td></tr>)}</tbody></table></div>
      <div className="mt-4 flex flex-wrap items-center gap-3 rounded-xl bg-soft p-3 text-sm">
        {s.complete && s.percent !== null ? <><span>Total <b className="font-mono">{s.total}/{s.max}</b></span><span>Percentage <b className="font-mono">{s.percent}%</b></span><span>Grade <b>{s.grade}</b></span><Badge tone={s.passed ? "success" : "danger"}>{s.passed ? "Pass" : "Fail"}</Badge>{data.showRank && data.rank && <span>Rank <b>{data.rank}</b></span>}</> : <span className="text-muted">Some marks are not recorded yet, so a total and grade are not shown.</span>}
      </div>
    </Card>
  );
}
