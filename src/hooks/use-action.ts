"use client";
import { useState } from "react";
import { toast } from "sonner";
import { errMsg } from "@/lib/api/client";

/** Runs an async mutation with a busy flag and toast feedback. Returns the result, or undefined on failure. */
export function useAction() {
  const [busy, setBusy] = useState(false);
  async function run<T>(fn: () => Promise<T>, success?: string): Promise<T | undefined> {
    setBusy(true);
    try { const r = await fn(); if (success) toast.success(success); return r; } catch (e) { toast.error(errMsg(e)); return undefined; } finally { setBusy(false); }
  }
  return { busy, run };
}
