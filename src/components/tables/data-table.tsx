"use client";
import { flexRender, getCoreRowModel, useReactTable, type ColumnDef } from "@tanstack/react-table";
import { ChevronDown, ChevronUp, ChevronLeft, ChevronRight } from "lucide-react";
import { Button, EmptyState, Skeleton } from "@/components/ui/primitives";

export interface TableState { page: number; pageSize: number; total: number; pages: number; sort?: string; dir: "asc" | "desc" }

/** Server-driven table: sorting/paging happen in the API, never by loading everything client side. */
export function DataTable<T>({ columns, data, loading, state, onSort, onPage, empty, onRowClick }: {
  columns: ColumnDef<T, unknown>[]; data: T[]; loading?: boolean; state: TableState;
  onSort?: (id: string) => void; onPage: (p: number) => void; empty?: { title: string; hint?: string; action?: React.ReactNode }; onRowClick?: (row: T) => void;
}) {
  const table = useReactTable({ data, columns, getCoreRowModel: getCoreRowModel(), manualSorting: true, manualPagination: true });
  if (!loading && data.length === 0) return <EmptyState title={empty?.title ?? "Nothing here yet"} hint={empty?.hint} action={empty?.action} />;
  return (
    <div className="overflow-hidden rounded-[14px] border border-line bg-surface">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-line bg-canvas text-xs uppercase tracking-wide text-muted">
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id}>
                {hg.headers.map((h) => {
                  const sortable = h.column.columnDef.meta?.sortable;
                  const active = state.sort === h.column.id;
                  return (
                    <th key={h.id} scope="col" aria-sort={active ? (state.dir === "asc" ? "ascending" : "descending") : undefined} className="px-4 py-3 font-semibold">
                      {sortable && onSort ? (
                        <button onClick={() => onSort(h.column.id)} className="inline-flex items-center gap-1 uppercase hover:text-ink">
                          {flexRender(h.column.columnDef.header, h.getContext())}
                          {active && (state.dir === "asc" ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />)}
                        </button>
                      ) : flexRender(h.column.columnDef.header, h.getContext())}
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>
          <tbody>
            {loading
              ? Array.from({ length: 5 }).map((_, i) => <tr key={i} className="border-b border-line last:border-0"><td colSpan={columns.length} className="px-4 py-3"><Skeleton className="h-5 w-full" /></td></tr>)
              : table.getRowModel().rows.map((r) => (
                <tr key={r.id} onClick={onRowClick ? () => onRowClick(r.original) : undefined} className={`border-b border-line last:border-0 ${onRowClick ? "cursor-pointer hover:bg-soft/60" : ""}`}>
                  {r.getVisibleCells().map((c) => <td key={c.id} className={`px-4 py-3 ${c.column.columnDef.meta?.className ?? ""}`}>{flexRender(c.column.columnDef.cell, c.getContext())}</td>)}
                </tr>
              ))}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between border-t border-line px-4 py-2.5 text-xs text-muted">
        <span>{state.total} total · page {state.page} of {state.pages}</span>
        <div className="flex gap-1">
          <Button size="sm" variant="secondary" aria-label="Previous page" disabled={state.page <= 1} onClick={() => onPage(state.page - 1)}><ChevronLeft className="size-4" /></Button>
          <Button size="sm" variant="secondary" aria-label="Next page" disabled={state.page >= state.pages} onClick={() => onPage(state.page + 1)}><ChevronRight className="size-4" /></Button>
        </div>
      </div>
    </div>
  );
}
