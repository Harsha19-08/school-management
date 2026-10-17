"use client";
import Link from "next/link";
import { useState } from "react";
import { api, errMsg } from "@/lib/api/client";
import { Button, ErrorNote, Field, Input } from "@/components/ui/primitives";

export default function ForgotPassword() {
  const [id, setId] = useState(""); const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null); const [dev, setDev] = useState<string | undefined>(); const [err, setErr] = useState<string | null>(null);
  return (
    <div className="flex min-h-dvh items-center justify-center p-6">
      <form className="w-full max-w-sm space-y-4" onSubmit={async (e) => {
        e.preventDefault(); setBusy(true); setErr(null);
        try { const r = await api<{ message: string; devResetPath?: string }>("/api/auth/forgot-password", { method: "POST", json: { identifier: id } }); setMsg(r.message); setDev(r.devResetPath); } catch (x) { setErr(errMsg(x)); } finally { setBusy(false); }
      }}>
        <h1 className="text-4xl text-primary">Reset <span className="accent-italic">password</span></h1>
        {err && <ErrorNote message={err} />}
        {msg ? (
          <div className="space-y-3 rounded-[14px] border border-line bg-surface p-4 text-sm">
            <p>{msg}</p>
            {dev && <p className="rounded-lg bg-soft p-2 text-xs">Development only: <Link className="font-semibold text-interactive underline" href={dev}>open reset link</Link></p>}
          </div>
        ) : (
          <>
            <Field label="Email or username"><Input value={id} onChange={(e) => setId(e.target.value)} required autoFocus /></Field>
            <Button type="submit" className="w-full" loading={busy}>Prepare reset link</Button>
          </>
        )}
        <Link href="/login" className="block text-center text-sm text-interactive hover:underline">Back to sign in</Link>
      </form>
    </div>
  );
}
