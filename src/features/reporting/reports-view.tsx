"use client";
/* eslint-disable @next/next/no-html-link-for-pages -- file downloads from API routes, not page navigation */
import { useState } from "react";
import { Download } from "lucide-react";
import { Card, Field, Input, Select } from "@/components/ui/primitives";
import { useStructure } from "@/hooks/use-structure";

const A = "inline-flex h-10 items-center gap-2 rounded-xl bg-interactive px-4 text-sm font-semibold text-white hover:bg-hover";
export function ReportsView() {
  const st = useStructure(); const [from, setFrom] = useState(() => new Date(Date.now() - 29 * 86400000).toISOString().slice(0, 10)); const [to, setTo] = useState(() => new Date().toISOString().slice(0, 10)); const [classId, setClassId] = useState("");
  const p = new URLSearchParams({ from, to, ...(classId ? { classId } : {}) }).toString();
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card className="space-y-3 md:col-span-2"><div className="grid grid-cols-3 gap-3"><Field label="From"><Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></Field><Field label="To"><Input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></Field><Field label="Class (attendance)"><Select value={classId} onChange={(e) => setClassId(e.target.value)}><option value="">All</option>{st.classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</Select></Field></div></Card>
      <Card className="space-y-3"><h2 className="text-xl text-primary">Attendance</h2><p className="text-sm text-muted">Per-student present/late/absent/leave and percentage for the range.</p><a className={A} href={`/api/reports/attendance?${p}`}><Download className="size-4" />Download CSV</a></Card>
      <Card className="space-y-3"><h2 className="text-xl text-primary">Fees outstanding</h2><p className="text-sm text-muted">Every unpaid or partly paid fee, with due dates.</p><a className={A} href="/api/reports/fees-outstanding"><Download className="size-4" />Download CSV</a></Card>
      <Card className="space-y-3"><h2 className="text-xl text-primary">Collections</h2><p className="text-sm text-muted">Payments and reversals in the date range, with receipt numbers.</p><a className={A} href={`/api/reports/collections?from=${from}&to=${to}`}><Download className="size-4" />Download CSV</a></Card>
      <Card className="space-y-3"><h2 className="text-xl text-primary">Student list</h2><p className="text-sm text-muted">All students with class, section and status.</p><a className={A} href="/api/students/export"><Download className="size-4" />Download CSV</a></Card>
    </div>
  );
}
