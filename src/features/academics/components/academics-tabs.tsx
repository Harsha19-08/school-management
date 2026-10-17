"use client";
import { useState } from "react";
import { Badge, Tabs } from "@/components/ui/primitives";
import { useStructure } from "@/hooks/use-structure";
import { EntityManager } from "./entity-manager";
import { TeachersTab } from "./teachers-tab";
import { TimetableEditor } from "./timetable-editor";

type Tab = "years" | "classes" | "sections" | "subjects" | "teachers" | "timetable";
const d = (v: unknown) => new Date(String(v)).toLocaleDateString("en-IN");

export function AcademicsTabs({ canWrite, canTeachers }: { canWrite: boolean; canTeachers: boolean }) {
  const [tab, setTab] = useState<Tab>("classes");
  const st = useStructure();
  return (
    <>
      <Tabs value={tab} onChange={setTab} tabs={[{ id: "years", label: "Academic years" }, { id: "classes", label: "Classes" }, { id: "sections", label: "Sections" }, { id: "subjects", label: "Subjects" }, ...(canTeachers ? [{ id: "teachers" as Tab, label: "Teachers" }] : []), { id: "timetable", label: "Timetable" }]} />
      {tab === "years" && <EntityManager entity="years" title="Academic years" canWrite={canWrite} fields={[{ key: "label", label: "Label (e.g. 2026-27)", required: true }, { key: "startDate", label: "Starts", type: "date", required: true }, { key: "endDate", label: "Ends", type: "date", required: true }, { key: "current", label: "Current year", type: "checkbox" }]} columns={[{ header: "Year", render: (r) => <b>{String(r.label)}</b> }, { header: "Dates", render: (r) => `${d(r.startDate)} – ${d(r.endDate)}` }, { header: "", render: (r) => r.current ? <Badge tone="success">current</Badge> : null }]} />}
      {tab === "classes" && <EntityManager entity="classes" title="Classes" canWrite={canWrite} fields={[{ key: "name", label: "Name", required: true }, { key: "grade", label: "Grade (number)", type: "number", required: true }]} columns={[{ header: "Class", render: (r) => <b>{String(r.name)}</b> }, { header: "Grade", render: (r) => String(r.grade) }]} />}
      {tab === "sections" && <EntityManager entity="sections" title="Sections" canWrite={canWrite} fields={[{ key: "classId", label: "Class", type: "select", required: true, editLocked: true, options: st.classes.map((c) => ({ value: c.id, label: c.name })) }, { key: "name", label: "Section name", required: true }, { key: "capacity", label: "Capacity", type: "number" }, { key: "room", label: "Room" }]} columns={[{ header: "Class", render: (r) => st.classes.find((c) => c.id === String(r.classId))?.name ?? "—" }, { header: "Section", render: (r) => <b>{String(r.name)}</b> }, { header: "Capacity", render: (r) => String(r.capacity) }]} />}
      {tab === "subjects" && <EntityManager entity="subjects" title="Subjects" canWrite={canWrite} fields={[{ key: "name", label: "Name", required: true }, { key: "code", label: "Code", required: true }]} columns={[{ header: "Subject", render: (r) => <b>{String(r.name)}</b> }, { header: "Code", render: (r) => <span className="font-mono text-xs">{String(r.code)}</span> }]} />}
      {tab === "teachers" && <TeachersTab canWrite={canWrite} />}
      {tab === "timetable" && <TimetableEditor canWrite={canWrite} />}
    </>
  );
}
