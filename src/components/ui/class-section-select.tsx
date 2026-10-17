"use client";
import { Select } from "./primitives";
import { useStructure } from "@/hooks/use-structure";

/** Cascading class → section pickers driven by the school's real structure. */
export function ClassSectionSelect({ classId, sectionId, onChange, sectionOptional, disabled }: { classId: string; sectionId: string; onChange: (v: { classId: string; sectionId: string }) => void; sectionOptional?: boolean; disabled?: boolean }) {
  const { classes, sections, loading } = useStructure();
  const secs = sections.filter((s) => s.classId === classId);
  return (
    <div className="grid grid-cols-2 gap-3">
      <label className="block space-y-1.5"><span className="text-xs font-semibold">Class</span>
        <Select disabled={disabled || loading} value={classId} onChange={(e) => onChange({ classId: e.target.value, sectionId: "" })}>
          <option value="">Select class</option>{classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </Select></label>
      <label className="block space-y-1.5"><span className="text-xs font-semibold">Section</span>
        <Select disabled={disabled || !classId} value={sectionId} onChange={(e) => onChange({ classId, sectionId: e.target.value })}>
          <option value="">{sectionOptional ? "Any" : "Select section"}</option>{secs.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </Select></label>
    </div>
  );
}
