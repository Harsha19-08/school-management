"use client";
import { useState } from "react";
import { Button, Card, Field, Input } from "@/components/ui/primitives";
import { useAction } from "@/hooks/use-action";
import { api } from "@/lib/api/client";

export function ProfileView({ name, email, role, school }: { name: string; email: string; role: string; school: string }) {
  const [f, setF] = useState({ current: "", next: "", again: "" }); const { busy, run } = useAction();
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card><h2 className="mb-3 text-xl text-primary">Account</h2><dl className="space-y-2 text-sm"><div><dt className="text-muted">Name</dt><dd className="font-semibold">{name}</dd></div><div><dt className="text-muted">Email</dt><dd>{email}</dd></div><div><dt className="text-muted">Role</dt><dd className="capitalize">{role.replace("_", " ")}</dd></div><div><dt className="text-muted">School</dt><dd>{school}</dd></div></dl></Card>
      <Card><h2 className="mb-3 text-xl text-primary">Change password</h2>
        <form className="space-y-3" onSubmit={async (e) => { e.preventDefault(); if (f.next !== f.again) return alert("New passwords do not match."); if (await run(() => api("/api/auth/change-password", { method: "POST", json: { current: f.current, next: f.next } }), "Password changed. Other devices were signed out.")) setF({ current: "", next: "", again: "" }); }}>
          <Field label="Current password"><Input type="password" autoComplete="current-password" value={f.current} onChange={(e) => setF({ ...f, current: e.target.value })} required /></Field>
          <Field label="New password" hint="10+ characters with upper, lower case and a number."><Input type="password" autoComplete="new-password" value={f.next} onChange={(e) => setF({ ...f, next: e.target.value })} required /></Field>
          <Field label="Repeat new password"><Input type="password" autoComplete="new-password" value={f.again} onChange={(e) => setF({ ...f, again: e.target.value })} required /></Field>
          <Button type="submit" loading={busy}>Update password</Button></form></Card>
    </div>
  );
}
