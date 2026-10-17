"use client";
import { useState } from "react";
import { Download, Plus, Undo2 } from "lucide-react";
import { Badge, Button, Card, EmptyState, ErrorNote, Field, Input, Select, Skeleton } from "@/components/ui/primitives";
import { Modal } from "@/components/ui/modal";
import { useFetch } from "@/hooks/use-fetch";
import { useAction } from "@/hooks/use-action";
import { api, qs } from "@/lib/api/client";
import { formatINR } from "@/lib/money";

interface Summary { totalPaise: number; paidPaise: number; outstandingPaise: number; overduePaise: number; lateFeeAccruedPaise: number; fees: { id: string; label: string; netPaise: number; paidPaise: number; outstandingPaise: number; concessionPaise: number; dueDate: string; status: string; overdue: boolean; lateFeePaise: number }[] }
interface Pay { id: string; kind: string; amountPaise: number; mode: string; receiptNo?: string; paidOn: string; reason?: string; reversed: boolean }
const tone = { paid: "success", partial: "warning", pending: "neutral", waived: "info" } as const;

/** One component for admin profile, student and parent views, so every audience sees the same numbers. */
export function FeePanel({ studentId, canCollect = false, canReverse = false, canConcede = false }: { studentId?: string; canCollect?: boolean; canReverse?: boolean; canConcede?: boolean }) {
  const s = useFetch<Summary>(`/api/fees/summary${qs({ studentId })}`);
  const p = useFetch<Pay[]>(`/api/fees/payments${qs({ studentId })}`);
  const [pay, setPay] = useState<{ id: string; label: string; max: number } | null>(null);
  const [con, setCon] = useState<{ id: string; label: string } | null>(null);
  const [rev, setRev] = useState<Pay | null>(null);
  const [amount, setAmount] = useState(""); const [mode, setMode] = useState("cash"); const [ref, setRef] = useState(""); const [reason, setReason] = useState("");
  const { busy, run } = useAction();
  const reload = () => { s.reload(); p.reload(); };
  if (s.error) return <ErrorNote message={s.error} />;
  if (s.loading || !s.data) return <Skeleton className="h-40" />;
  const d = s.data;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[["Total", d.totalPaise, ""], ["Paid", d.paidPaise, "text-success"], ["Outstanding", d.outstandingPaise, d.outstandingPaise ? "text-warning" : ""], ["Overdue", d.overduePaise, d.overduePaise ? "text-danger" : ""]].map(([l, v, c]) => (
          <Card key={l as string} className="p-4"><p className="text-xs font-semibold uppercase text-muted">{l as string}</p><p className={`font-mono text-xl font-semibold ${c}`}>{formatINR(v as number)}</p></Card>
        ))}
      </div>
      {d.lateFeeAccruedPaise > 0 && <p className="text-xs text-muted">Late fee accrued under school policy: <span className="font-mono">{formatINR(d.lateFeeAccruedPaise)}</span> (shown for information; it is not added to the balance automatically).</p>}
      {d.fees.length === 0 ? <EmptyState title="No fees yet" hint="Fees appear here once they are generated for this student." /> : (
        <div className="overflow-x-auto rounded-[14px] border border-line bg-surface">
          <table className="w-full text-sm"><thead className="border-b border-line bg-canvas text-left text-xs uppercase text-muted"><tr><th className="px-4 py-3">Fee</th><th className="px-4 py-3">Due</th><th className="px-4 py-3 text-right">Net</th><th className="px-4 py-3 text-right">Paid</th><th className="px-4 py-3">Status</th>{(canCollect || canConcede) && <th className="px-4 py-3" />}</tr></thead>
            <tbody>{d.fees.map((f) => (
              <tr key={f.id} className="border-b border-line last:border-0">
                <td className="px-4 py-3 font-semibold">{f.label}{f.concessionPaise > 0 && <span className="ml-2 text-xs font-normal text-muted">(−{formatINR(f.concessionPaise)} concession)</span>}</td>
                <td className="px-4 py-3">{new Date(f.dueDate).toLocaleDateString("en-IN")}</td>
                <td className="px-4 py-3 text-right font-mono">{formatINR(f.netPaise)}</td><td className="px-4 py-3 text-right font-mono">{formatINR(f.paidPaise)}</td>
                <td className="px-4 py-3"><Badge tone={f.overdue ? "danger" : tone[f.status as keyof typeof tone] ?? "neutral"}>{f.overdue ? "overdue" : f.status}</Badge></td>
                {(canCollect || canConcede) && <td className="space-x-1 px-4 py-3 text-right">
                  {canCollect && f.outstandingPaise > 0 && <Button size="sm" onClick={() => { setPay({ id: f.id, label: f.label, max: f.outstandingPaise }); setAmount(String(f.outstandingPaise / 100)); }}><Plus className="size-3" />Collect</Button>}
                  {canConcede && <Button size="sm" variant="secondary" onClick={() => { setCon({ id: f.id, label: f.label }); setAmount(String(f.concessionPaise / 100)); setReason(""); }}>Concession</Button>}
                </td>}
              </tr>))}</tbody></table>
        </div>
      )}
      <h3 className="text-lg text-primary">Payments</h3>
      {p.data && p.data.length > 0 ? (
        <ul className="divide-y divide-line rounded-[14px] border border-line bg-surface text-sm">
          {p.data.map((x) => (
            <li key={x.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
              <div><span className={`font-mono font-semibold ${x.kind === "reversal" ? "text-danger" : ""}`}>{x.kind === "reversal" ? "−" : ""}{formatINR(x.amountPaise)}</span> <span className="text-muted">· {x.mode.replace("_", " ")} · {new Date(x.paidOn).toLocaleDateString("en-IN")}</span>
                <p className="font-mono text-xs text-muted">{x.kind === "reversal" ? `Reversal: ${x.reason}` : x.receiptNo}{x.reversed && " · reversed"}</p></div>
              <div className="flex gap-2">
                {x.kind === "payment" && !x.reversed && <a className="inline-flex h-8 items-center gap-1 rounded-xl border border-line px-3 text-xs font-semibold hover:bg-soft" href={`/api/fees/receipt/${x.id}`} target="_blank" rel="noreferrer"><Download className="size-3" />Receipt</a>}
                {canReverse && x.kind === "payment" && !x.reversed && <Button size="sm" variant="secondary" onClick={() => { setRev(x); setReason(""); }}><Undo2 className="size-3" />Reverse</Button>}
              </div>
            </li>))}
        </ul>
      ) : <p className="text-sm text-muted">No payments recorded.</p>}

      <Modal open={!!pay} onOpenChange={(o) => !o && setPay(null)} title="Record payment" description={pay ? `${pay.label} · outstanding ${formatINR(pay.max)}` : undefined}>
        <form className="space-y-3" onSubmit={async (e) => { e.preventDefault(); if (!pay) return; const key = crypto.randomUUID(); const r = await run(() => api("/api/fees/payments", { method: "POST", json: { feeId: pay.id, amount, mode, reference: ref || undefined, idempotencyKey: key } }), "Payment recorded"); if (r) { setPay(null); reload(); } }}>
          <Field label="Amount (₹)"><Input inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} required /></Field>
          <Field label="Mode"><Select value={mode} onChange={(e) => setMode(e.target.value)}><option value="cash">Cash</option><option value="bank_transfer">Bank transfer</option><option value="cheque">Cheque</option></Select></Field>
          <Field label="Reference (optional)"><Input value={ref} onChange={(e) => setRef(e.target.value)} /></Field>
          <Button type="submit" className="w-full" loading={busy}>Record payment</Button>
        </form>
      </Modal>
      <Modal open={!!con} onOpenChange={(o) => !o && setCon(null)} title="Set concession" description={con?.label}>
        <form className="space-y-3" onSubmit={async (e) => { e.preventDefault(); if (!con) return; const r = await run(() => api(`/api/fees/concession/${con.id}`, { method: "POST", json: { amount, reason } }), "Concession saved"); if (r) { setCon(null); reload(); } }}>
          <Field label="Concession amount (₹)"><Input inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} required /></Field>
          <Field label="Reason"><Input value={reason} onChange={(e) => setReason(e.target.value)} required minLength={3} /></Field>
          <Button type="submit" className="w-full" loading={busy}>Save concession</Button>
        </form>
      </Modal>
      <Modal open={!!rev} onOpenChange={(o) => !o && setRev(null)} title="Reverse payment" description="The original entry stays in the ledger; a reversal is added with your reason.">
        <form className="space-y-3" onSubmit={async (e) => { e.preventDefault(); if (!rev) return; const r = await run(() => api(`/api/fees/payments/${rev.id}/reverse`, { method: "POST", json: { reason } }), "Payment reversed"); if (r) { setRev(null); reload(); } }}>
          <Field label="Reason"><Input value={reason} onChange={(e) => setReason(e.target.value)} required minLength={3} /></Field>
          <Button type="submit" variant="danger" className="w-full" loading={busy}>Reverse {rev ? formatINR(rev.amountPaise) : ""}</Button>
        </form>
      </Modal>
    </div>
  );
}
