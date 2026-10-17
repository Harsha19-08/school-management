"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { api, qs } from "@/lib/api/client";
import type { TableState } from "@/components/tables/data-table";

interface Paged<T> { items: T[]; total: number; page: number; pageSize: number; pages: number }

/** Fetches a server-paginated list with search, sort, filters. Stale responses are discarded. */
export function useList<T>(url: string, initial: { pageSize?: number; sort?: string; dir?: "asc" | "desc"; filters?: Record<string, string | undefined> } = {}) {
  const [items, setItems] = useState<T[]>([]);
  const [doneKey, setDoneKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [filters, setFilters] = useState<Record<string, string | undefined>>(initial.filters ?? {});
  const [state, setState] = useState<TableState>({ page: 1, pageSize: initial.pageSize ?? 20, total: 0, pages: 1, sort: initial.sort, dir: initial.dir ?? "asc" });
  const [tick, setTick] = useState(0);
  const seq = useRef(0);

  useEffect(() => { const t = setTimeout(() => { setDebouncedQ(q); setState((s) => ({ ...s, page: 1 })); }, 300); return () => clearTimeout(t); }, [q]);

  const { page, pageSize, sort, dir } = state;
  const filterKey = JSON.stringify(filters);
  const reqUrl = `${url}${qs({ page, pageSize, sort, dir, q: debouncedQ, ...filters })}`;
  const reqKey = `${reqUrl}#${tick}`;
  const loading = doneKey !== reqKey;
  useEffect(() => {
    const my = ++seq.current;
    api<Paged<T>>(reqUrl)
      .then((r) => { if (my !== seq.current) return; setItems(r.items); setError(null); setState((s) => ({ ...s, total: r.total, pages: r.pages })); })
      .catch((e: Error) => { if (my === seq.current) setError(e.message); })
      .finally(() => { if (my === seq.current) setDoneKey(reqKey); });
  }, [reqUrl, reqKey, filterKey]);

  const setFilter = useCallback((k: string, v: string | undefined) => { setFilters((f) => ({ ...f, [k]: v })); setState((s) => ({ ...s, page: 1 })); }, []);
  const onSort = useCallback((id: string) => setState((s) => ({ ...s, sort: id, dir: s.sort === id && s.dir === "asc" ? "desc" : "asc", page: 1 })), []);
  const onPage = useCallback((p: number) => setState((s) => ({ ...s, page: p })), []);
  const reload = useCallback(() => setTick((t) => t + 1), []);
  return { items, loading, error, q, setQ, filters, setFilter, state, onSort, onPage, reload };
}
