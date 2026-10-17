"use client";
/* eslint-disable @next/next/no-html-link-for-pages -- file downloads from API routes, not page navigation */
import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { ColumnDef } from "@tanstack/react-table";
import { Download, Plus, Search } from "lucide-react";
import { Badge, Button, Input, Select } from "@/components/ui/primitives";
import { Modal } from "@/components/ui/modal";
import { DataTable } from "@/components/tables/data-table";
import { useList } from "@/hooks/use-list";
import { useStructure } from "@/hooks/use-structure";
import { StudentForm } from "./student-form";

export interface StudentRow { id: string; name: string; admissionNo: string; classId: string; sectionId: string; rollNo?: number; status: string; hasAccount: boolean }
const tone = { active: "success", inactive: "neutral", transferred: "warning", alumni: "info", archived: "neutral" } as const;

export function StudentList({ canWrite, canExport, basePath }: { canWrite: boolean; canExport: boolean; basePath: string }) {
  const r = useRouter();
  const l = useList<StudentRow>("/api/students", { sort: "name" });
  const st = useStructure();
  const [open, setOpen] = useState(false);
  const cls = useMemo(() => new Map(st.classes.map((c) => [c.id, c.name])), [st.classes]);
  const sec = useMemo(() => new Map(st.sections.map((s) => [s.id, s.name])), [st.sections]);
  const cols = useMemo<ColumnDef<StudentRow, unknown>[]>(() => [
    { id: "name", header: "Student", meta: { sortable: true }, cell: ({ row }) => basePath ? <Link className="font-semibold text-primary hover:underline" href={`${basePath}/${row.original.id}`}>{row.original.name}</Link> : <span className="font-semibold">{row.original.name}</span> },
    { id: "admissionNo", header: "Admission no.", meta: { sortable: true }, cell: ({ row }) => <span className="font-mono text-xs">{row.original.admissionNo}</span> },
    { id: "class", header: "Class", cell: ({ row }) => `${cls.get(row.original.classId) ?? "—"} - ${sec.get(row.original.sectionId) ?? ""}` },
    { id: "rollNo", header: "Roll", meta: { sortable: true }, cell: ({ row }) => row.original.rollNo ?? "—" },
    { id: "status", header: "Status", meta: { sortable: true }, cell: ({ row }) => <Badge tone={tone[row.original.status as keyof typeof tone] ?? "neutral"}>{row.original.status}</Badge> },
  ], [cls, sec, basePath]);
  const sectionsForClass = st.sections.filter((s) => s.classId === l.filters.classId);
  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative min-w-52 flex-1"><Search className="pointer-events-none absolute left-3 top-3 size-4 text-muted" aria-hidden /><Input aria-label="Search students" className="pl-9" placeholder="Search name or admission no." value={l.q} onChange={(e) => l.setQ(e.target.value)} /></div>
        <Select aria-label="Class" className="w-36" value={l.filters.classId ?? ""} onChange={(e) => { l.setFilter("classId", e.target.value || undefined); l.setFilter("sectionId", undefined); }}><option value="">All classes</option>{st.classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</Select>
        <Select aria-label="Section" className="w-32" disabled={!l.filters.classId} value={l.filters.sectionId ?? ""} onChange={(e) => l.setFilter("sectionId", e.target.value || undefined)}><option value="">All sections</option>{sectionsForClass.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</Select>
        <Select aria-label="Status" className="w-36" value={l.filters.status ?? ""} onChange={(e) => l.setFilter("status", e.target.value || undefined)}><option value="">All statuses</option>{["active", "inactive", "transferred", "alumni", "archived"].map((s) => <option key={s} value={s}>{s}</option>)}</Select>
        {canExport && <a href="/api/students/export" download className="inline-flex h-10 items-center gap-2 rounded-xl border border-line bg-surface px-4 text-sm font-semibold hover:bg-soft"><Download className="size-4" aria-hidden />CSV</a>}
        {canWrite && <Button onClick={() => setOpen(true)}><Plus className="size-4" aria-hidden />Add student</Button>}
      </div>
      {l.error && <p role="alert" className="mb-3 text-sm text-danger">{l.error}</p>}
      <DataTable columns={cols} data={l.items} loading={l.loading} state={l.state} onSort={l.onSort} onPage={l.onPage} empty={{ title: "No students found", hint: l.q || Object.values(l.filters).some(Boolean) ? "Try clearing the filters." : "Add the first student to get started." }} />
      <Modal open={open} onOpenChange={setOpen} title="Add student" description="A guardian record is created with the student.">
        <StudentForm onDone={(id) => { setOpen(false); r.push(`${basePath}/${id}`); }} />
      </Modal>
    </>
  );
}
