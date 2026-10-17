"use client";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { api, errMsg } from "@/lib/api/client";
import { Button, ErrorNote, Field, Input } from "@/components/ui/primitives";

export function ResetForm() {
  const token = useSearchParams().get("token") ?? "";
  const [pw, setPw] = useState(""); const [pw2, setPw2] = useState(""); const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null); const [done, setDone] = useState(false);
  return (
    <div className="flex min-h-dvh items-center justify-center p-6">
      <form className="w-full max-w-sm space-y-4" onSubmit={async (e) => {
        e.preventDefault(); setErr(null);
        if (pw !== pw2) return setErr("Passwords do not match.");
        setBusy(true);
        try { await api("/api/auth/reset-password", { method: "POST", json: { token, password: pw } }); setDone(true); } catch (x) { setErr(errMsg(x)); } finally { setBusy(false); }
      }}>
        <h1 className="text-4xl text-primary">Set your <span className="accent-italic">password</span></h1>
        {!token && <ErrorNote message="This link is missing its token." />}
        {err && <ErrorNote message={err} />}
        {done ? <p className="rounded-[14px] border border-line bg-surface p-4 text-sm">Password saved. <Link className="font-semibold text-interactive" href="/login">Sign in</Link></p> : (
          <>
            <Field label="New password" hint="At least 10 characters with upper, lower case and a number."><Input type="password" autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} required /></Field>
            <Field label="Confirm password"><Input type="password" autoComplete="new-password" value={pw2} onChange={(e) => setPw2(e.target.value)} required /></Field>
            <Button type="submit" className="w-full" loading={busy} disabled={!token}>Save password</Button>
          </>
        )}
      </form>
    </div>
  );
}
