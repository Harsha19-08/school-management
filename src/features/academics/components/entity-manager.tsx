"use client";
import { useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { Badge, Button, EmptyState, ErrorNote, Field, Input, Select, Skeleton } from "@/components/ui/primitives";
import { Modal, ConfirmModal } from "@/components/ui/modal";
import { useFetch } from "@/hooks/use-fetch";
import { useAction } from "@/hooks/use-action";
import { api } from "@/lib/api/client";

export interface FieldDef { key: string; label: string; type?: "text" | "number" | "date" | "checkbox" | "select"; options?: { value: string; label: string }[]; required?: boolean; editLocked?: boolean }
type Rec = Record<string, unknown> & { id: string };

/** Generic list + add/edit/delete for the simple academic entities (years, classes, sections, subjects). */
export function EntityManager({ entity, title, fields, columns, canWrite }: { entity: string; title: string; fields: FieldDef[]; columns: { header: string; render: (r: Rec) => React.ReactNode }[]; canWrite: boolean }) {
  const { data, error, loading, reload } = useFetch<Rec[]>(`/api/academics/${entity}`);
  const [edit, setEdit] = useState<Rec | "new" | null>(null); const [del, setDel] = useState<Rec | null>(null);
  const [vals, setVals] = useState<Record<string, unknown>>({}); const { busy, run } = useAction();
  const openEdit = (r: Rec | "new") => { setVals(r === "new" ? Object.fromEntries(fields.map((f) => [f.key, f.type === "checkbox" ? false : ""])) : Object.fromEntries(fields.map((f) => [f.key, f.type === "date" && r[f.key] ? String(r[f.key]).slice(0, 10) : r[f.key] ?? (f.type === "checkbox" ? false : "")]))); setEdit(r); };
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between"><h2 className="text-xl text-primary">{title}</h2>{canWrite && <Button size="sm" onClick={() => openEdit("new")}><Plus className="size-4" />Add</Button>}</div>
      {error && <ErrorNote message={error} />}
      {loading ? <Skeleton className="h-32" /> : !data?.length ? <EmptyState title={`No ${title.toLowerCase()} yet`} /> : (
        <div className="overflow-x-auto rounded-[14px] border border-line bg-surface"><table className="w-full text-sm"><thead className="border-b border-line bg-canvas text-left text-xs uppercase text-muted"><tr>{columns.map((c) => <th key={c.header} className="px-4 py-3">{c.header}</th>)}{canWrite && <th />}</tr></thead>
          <tbody>{data.map((r) => <tr key={r.id} className="border-b border-line last:border-0">{columns.map((c) => <td key={c.header} className="px-4 py-3">{c.render(r)}</td>)}{canWrite && <td className="space-x-1 px-4 py-3 text-right"><Button size="sm" variant="ghost" aria-label="Edit" onClick={() => openEdit(r)}><Pencil className="size-3" /></Button><Button size="sm" variant="ghost" aria-label="Delete" onClick={() => setDel(r)}><Trash2 className="size-3 text-danger" /></Button></td>}</tr>)}</tbody></table></div>
      )}
      <Modal open={!!edit} onOpenChange={(o) => !o && setEdit(null)} title={edit === "new" ? `Add ${title.toLowerCase()}` : `Edit ${title.toLowerCase()}`}>
        <form className="space-y-3" onSubmit={async (e) => { e.preventDefault(); const isNew = edit === "new"; const payload = Object.fromEntries(fields.filter((f) => isNew || !f.editLocked).map((f) => [f.key, f.type === "number" ? Number(vals[f.key]) : vals[f.key]]));
          const r = await run(() => isNew ? api(`/api/academics/${entity}`, { method: "POST", json: { ...payload } }) : api(`/api/academics/${entity}/${(edit as Rec).id}`, { method: "PATCH", json: payload }), "Saved"); if (r) { setEdit(null); reload(); } }}>
          {fields.map((f) => (f.type === "checkbox"
            ? <label key={f.key} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={!!vals[f.key]} onChange={(e) => setVals({ ...vals, [f.key]: e.target.checked })} />{f.label}</label>
            : <Field key={f.key} label={f.label}>{f.type === "select"
              ? <Select disabled={f.editLocked && edit !== "new"} value={String(vals[f.key] ?? "")} onChange={(e) => setVals({ ...vals, [f.key]: e.target.value })} required={f.required}><option value="">Select</option>{f.options?.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</Select>
              : <Input disabled={f.editLocked && edit !== "new"} type={f.type ?? "text"} value={String(vals[f.key] ?? "")} onChange={(e) => setVals({ ...vals, [f.key]: e.target.value })} required={f.required} />}</Field>))}
          <Button type="submit" className="w-full" loading={busy}>Save</Button>
        </form>
      </Modal>
      <ConfirmModal open={!!del} onOpenChange={(o) => !o && setDel(null)} title="Delete?" description="This can't be undone. If anything still depends on it, you'll be told what." danger confirmLabel="Delete" loading={busy} onConfirm={async () => { if (del && (await run(() => api(`/api/academics/${entity}/${del.id}`, { method: "DELETE" }), "Deleted"))) { setDel(null); reload(); } }} />
    </div>
  );
}
export { Badge };
