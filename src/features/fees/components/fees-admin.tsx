"use client";
/* eslint-disable @next/next/no-html-link-for-pages -- file downloads from API routes, not page navigation */
import { useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Plus, Trash2 } from "lucide-react";
import { Badge, Button, Card, Field, Input, Select, Skeleton, Tabs } from "@/components/ui/primitives";
import { Modal } from "@/components/ui/modal";
import { DataTable } from "@/components/tables/data-table";
import { useList } from "@/hooks/use-list";
import { useFetch } from "@/hooks/use-fetch";
import { useAction } from "@/hooks/use-action";
import { useStructure } from "@/hooks/use-structure";
import { api } from "@/lib/api/client";
import { formatINR } from "@/lib/money";
import { FeePanel } from "./fee-panel";

interface Due { id: string; studentId: string; student: string; admissionNo?: string; label: string; netPaise: number; paidPaise: number; outstandingPaise: number; dueDate: string; status: string; overdue: boolean }
interface Setup { categories: { id: string; name: string; frequency: string }[]; structures: { id: string; categoryId: string; classIds: string[]; amountPaise: number; installments: { label: string; dueDate: string; amountPaise: number }[] }[] }
const tone = { paid: "success", partial: "warning", pending: "neutral", waived: "info" } as const;

export function FeesAdmin({ perms }: { perms: { write: boolean; collect: boolean; reverse: boolean } }) {
  const [tab, setTab] = useState<"dues" | "setup">("dues");
  return (<><Tabs value={tab} onChange={setTab} tabs={[{ id: "dues", label: "Dues & collection" }, ...(perms.write ? [{ id: "setup" as const, label: "Fee setup" }] : [])]} />{tab === "dues" ? <Dues perms={perms} /> : <SetupTab />}</>);
}

function Dues({ perms }: { perms: { write: boolean; collect: boolean; reverse: boolean } }) {
  const l = useList<Due>("/api/fees/dues", { pageSize: 20 }); const st = useStructure(); const [open, setOpen] = useState<Due | null>(null);
  const cols = useMemo<ColumnDef<Due, unknown>[]>(() => [
    { id: "student", header: "Student", cell: ({ row }) => <div><p className="font-semibold">{row.original.student}</p><p className="font-mono text-xs text-muted">{row.original.admissionNo}</p></div> },
    { id: "label", header: "Fee", cell: ({ row }) => row.original.label }, { id: "due", header: "Due", cell: ({ row }) => new Date(row.original.dueDate).toLocaleDateString("en-IN") },
    { id: "out", header: "Outstanding", cell: ({ row }) => <span className="font-mono">{formatINR(row.original.outstandingPaise)}</span> },
    { id: "status", header: "Status", cell: ({ row }) => <Badge tone={row.original.overdue ? "danger" : tone[row.original.status as keyof typeof tone] ?? "neutral"}>{row.original.overdue ? "overdue" : row.original.status}</Badge> },
  ], []);
  return (<>
    <div className="mb-4 flex flex-wrap gap-2">
      <Input aria-label="Search student" className="max-w-xs" placeholder="Search student or admission no." value={l.q} onChange={(e) => l.setQ(e.target.value)} />
      <Select aria-label="Class" className="w-40" value={l.filters.classId ?? ""} onChange={(e) => l.setFilter("classId", e.target.value || undefined)}><option value="">All classes</option>{st.classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</Select>
      <Select aria-label="Filter" className="w-44" value={l.filters.overdue ? "overdue" : l.filters.status ?? ""} onChange={(e) => { const v = e.target.value; l.setFilter("overdue", v === "overdue" ? "1" : undefined); l.setFilter("status", v && v !== "overdue" ? v : undefined); }}><option value="">All</option><option value="overdue">Overdue</option><option value="pending">Pending</option><option value="partial">Partial</option><option value="paid">Paid</option></Select>
      <a href="/api/reports/fees-outstanding" className="inline-flex h-10 items-center rounded-xl border border-line bg-surface px-4 text-sm font-semibold hover:bg-soft">Outstanding CSV</a>
    </div>
    <DataTable columns={cols} data={l.items} loading={l.loading} state={l.state} onPage={l.onPage} onRowClick={setOpen} empty={{ title: "No fee records", hint: "Generate fees from the Fee setup tab." }} />
    <Modal open={!!open} onOpenChange={(o) => !o && setOpen(null)} title={open?.student ?? ""} description="Select Collect on a fee to record a payment." wide>{open && <FeePanel studentId={open.studentId} canCollect={perms.collect} canReverse={perms.reverse} canConcede={perms.write} />}</Modal>
  </>);
}

function SetupTab() {
  const { data, loading, reload } = useFetch<Setup>("/api/fees/setup"); const st = useStructure(); const { busy, run } = useAction();
  const [cat, setCat] = useState(false); const [struct, setStruct] = useState(false); const [gen, setGen] = useState<string | null>(null);
  const [cf, setCf] = useState({ name: "", frequency: "yearly" }); const [sf, setSf] = useState({ categoryId: "", amount: "", classIds: [] as string[] }); const [inst, setInst] = useState<{ label: string; dueDate: string; amount: string }[]>([]); const [due, setDue] = useState("");
  if (loading || !data) return <Skeleton className="h-40" />;
  const cname = (id: string) => data.categories.find((c) => c.id === id)?.name ?? "—";
  return (
    <div className="space-y-6">
      <section className="space-y-3"><div className="flex items-center justify-between"><h2 className="text-xl text-primary">Categories</h2><Button size="sm" onClick={() => setCat(true)}><Plus className="size-4" />Add</Button></div>
        <div className="flex flex-wrap gap-2">{data.categories.length ? data.categories.map((c) => <Badge key={c.id} tone="info">{c.name} · {c.frequency.replace("_", " ")}</Badge>) : <p className="text-sm text-muted">No categories yet.</p>}</div></section>
      <section className="space-y-3"><div className="flex items-center justify-between"><h2 className="text-xl text-primary">Fee structures</h2><Button size="sm" disabled={!data.categories.length} onClick={() => setStruct(true)}><Plus className="size-4" />Add</Button></div>
        {data.structures.length === 0 ? <p className="text-sm text-muted">No structures yet.</p> : data.structures.map((s) => (
          <Card key={s.id} className="flex flex-wrap items-center justify-between gap-3"><div><p className="font-semibold">{cname(s.categoryId)} <span className="font-mono text-sm">{formatINR(s.amountPaise)}</span></p><p className="text-xs text-muted">{s.classIds.map((c) => st.classes.find((x) => x.id === c)?.name).join(", ")}{s.installments.length ? ` · ${s.installments.length} installments` : " · single payment"}</p></div>
            <Button size="sm" variant="secondary" onClick={() => { setGen(s.id); setDue(""); }}>Generate fees</Button></Card>))}</section>
      <Modal open={cat} onOpenChange={setCat} title="Fee category"><form className="space-y-3" onSubmit={async (e) => { e.preventDefault(); if (await run(() => api("/api/fees/setup", { method: "POST", json: { kind: "category", data: cf } }), "Category added")) { setCat(false); reload(); } }}>
        <Field label="Name"><Input value={cf.name} onChange={(e) => setCf({ ...cf, name: e.target.value })} required /></Field><Field label="Frequency"><Select value={cf.frequency} onChange={(e) => setCf({ ...cf, frequency: e.target.value })}>{["one_time", "monthly", "quarterly", "term", "yearly"].map((f) => <option key={f} value={f}>{f.replace("_", " ")}</option>)}</Select></Field><Button type="submit" className="w-full" loading={busy}>Add</Button></form></Modal>
      <Modal open={struct} onOpenChange={setStruct} title="Fee structure" wide><form className="space-y-3" onSubmit={async (e) => { e.preventDefault(); if (await run(() => api("/api/fees/setup", { method: "POST", json: { kind: "structure", data: { academicYearId: st.years.find((y) => y.current)?.id, categoryId: sf.categoryId, amount: sf.amount, classIds: sf.classIds, installments: inst } } }), "Structure added")) { setStruct(false); reload(); } }}>
        <div className="grid grid-cols-2 gap-3"><Field label="Category"><Select value={sf.categoryId} onChange={(e) => setSf({ ...sf, categoryId: e.target.value })} required><option value="">Select</option>{data.categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</Select></Field><Field label="Total amount (₹)"><Input inputMode="decimal" value={sf.amount} onChange={(e) => setSf({ ...sf, amount: e.target.value })} required /></Field></div>
        <fieldset><legend className="mb-1 text-xs font-semibold">Classes</legend><div className="flex flex-wrap gap-3">{st.classes.map((c) => <label key={c.id} className="flex items-center gap-1.5 text-sm"><input type="checkbox" checked={sf.classIds.includes(c.id)} onChange={(e) => setSf({ ...sf, classIds: e.target.checked ? [...sf.classIds, c.id] : sf.classIds.filter((x) => x !== c.id) })} />{c.name}</label>)}</div></fieldset>
        <p className="text-xs font-semibold uppercase text-muted">Installments (optional — must add up to the total)</p>
        {inst.map((i, n) => <div key={n} className="grid grid-cols-[1fr_9rem_7rem_auto] gap-2"><Input aria-label="Label" placeholder="Label" value={i.label} onChange={(e) => setInst(inst.map((x, j) => j === n ? { ...x, label: e.target.value } : x))} required /><Input aria-label="Due date" type="date" value={i.dueDate} onChange={(e) => setInst(inst.map((x, j) => j === n ? { ...x, dueDate: e.target.value } : x))} required /><Input aria-label="Amount" inputMode="decimal" placeholder="₹" value={i.amount} onChange={(e) => setInst(inst.map((x, j) => j === n ? { ...x, amount: e.target.value } : x))} required /><Button type="button" variant="ghost" size="sm" aria-label="Remove" onClick={() => setInst(inst.filter((_, j) => j !== n))}><Trash2 className="size-4 text-danger" /></Button></div>)}
        <Button type="button" variant="secondary" size="sm" onClick={() => setInst([...inst, { label: "", dueDate: "", amount: "" }])}><Plus className="size-3" />Installment</Button><Button type="submit" className="w-full" loading={busy} disabled={!sf.classIds.length}>Save structure</Button></form></Modal>
      <Modal open={!!gen} onOpenChange={(o) => !o && setGen(null)} title="Generate fees" description="Creates fees for every active student in the selected classes. Running it again never double-charges."><form className="space-y-3" onSubmit={async (e) => { e.preventDefault(); const r = await run(() => api<{ created: number; skippedExisting: number }>("/api/fees/generate", { method: "POST", json: { structureId: gen, defaultDueDate: due || undefined } })); if (r) { setGen(null); alert(`${r.created} fee(s) created, ${r.skippedExisting} already existed.`); } }}>
        {data.structures.find((s) => s.id === gen)?.installments.length === 0 && <Field label="Due date (single payment)"><Input type="date" value={due} onChange={(e) => setDue(e.target.value)} required /></Field>}<Button type="submit" className="w-full" loading={busy}>Generate</Button></form></Modal>
    </div>
  );
}
