"use client";
import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api/client";

/** Fetch a JSON endpoint; `url=null` skips. Loading is derived from which URL last completed, so no sync setState in effects. */
export function useFetch<T>(url: string | null) {
  const [res, setRes] = useState<{ key: string; data?: T; error?: string } | null>(null);
  const [tick, setTick] = useState(0);
  const key = url ? `${url}#${tick}` : null;
  useEffect(() => {
    if (!url || !key) return;
    let live = true;
    api<T>(url).then((data) => live && setRes({ key, data })).catch((e: Error) => live && setRes({ key, error: e.message }));
    return () => { live = false; };
  }, [url, key]);
  const settled = !!key && res?.key === key;
  return { data: settled ? res?.data : (res?.data as T | undefined), error: settled ? res?.error : undefined, loading: !!key && !settled, reload: useCallback(() => setTick((t) => t + 1), []) };
}
