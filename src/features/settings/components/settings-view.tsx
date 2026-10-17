"use client";
import { useState } from "react";
import { Badge, Button, Card, Field, Input, Skeleton, Tabs } from "@/components/ui/primitives";
import { Modal } from "@/components/ui/modal";
import { useFetch } from "@/hooks/use-fetch";
import { useAction } from "@/hooks/use-action";
import { api } from "@/lib/api/client";

type Tab = "school" | "roles" | "users" | "audit";
export function SettingsView({ can }: { can: { school: boolean; roles: boolean; users: boolean; audit: boolean } }) {
  const tabs = ([["school", "School", can.school], ["roles", "Roles", can.roles], ["users", "Users", can.users], ["audit", "Audit log", can.audit]] as const).filter((t) => t[2]).map((t) => ({ id: t[0] as Tab, label: t[1] }));
  const [tab, setTab] = useState<Tab>(tabs[0]?.id ?? "school");
  return (<><Tabs tabs={tabs} value={tab} onChange={setTab} />{tab === "school" && <SchoolTab />}{tab === "roles" && <RolesTab />}{tab === "users" && <UsersTab />}{tab === "audit" && <AuditTab />}</>);
}

interface S { name: string; address?: string; phone?: string; email?: string; settings: { attendance: { allowTeacherEditDays: number; lowAttendanceThresholdPct: number }; fees: { lateFeeFlatPaise: number; lateFeeGraceDays: number; lateFeePeriodDays: number; receiptPrefix: string }; exams: { passingPercent: number; showRank: boolean }; portal: { studentCanEditContact: boolean } }; notifications: { inApp: string; email: string; sms: string } }
function SchoolTab() {
  const { data, loading, reload } = useFetch<S>("/api/settings/school"); const { busy, run } = useAction();
  const [f, setF] = useState<Record<string, string | boolean> | null>(null);
  if (loading || !data) return <Skeleton className="h-64" />;
  const v = f ?? { address: data.address ?? "", phone: data.phone ?? "", email: data.email ?? "", edit: String(data.settings.attendance.allowTeacherEditDays), low: String(data.settings.attendance.lowAttendanceThresholdPct), late: String(data.settings.fees.lateFeeFlatPaise / 100), grace: String(data.settings.fees.lateFeeGraceDays), period: String(data.settings.fees.lateFeePeriodDays), prefix: data.settings.fees.receiptPrefix, pass: String(data.settings.exams.passingPercent), rank: data.settings.exams.showRank };
  const set = (k: string) => (e: { target: { value: string } }) => setF({ ...v, [k]: e.target.value });
  return (
    <form className="grid gap-4 md:grid-cols-2" onSubmit={async (e) => { e.preventDefault(); if (await run(() => api("/api/settings/school", { method: "PATCH", json: { address: v.address, phone: v.phone, email: v.email, attendance: { allowTeacherEditDays: Number(v.edit), lowAttendanceThresholdPct: Number(v.low) }, fees: { lateFeeFlat: String(v.late), lateFeeGraceDays: Number(v.grace), lateFeePeriodDays: Number(v.period), receiptPrefix: v.prefix }, exams: { passingPercent: Number(v.pass), showRank: !!v.rank }, portal: { studentCanEditContact: data.settings.portal.studentCanEditContact } } }), "Settings saved")) { setF(null); reload(); } }}>
      <Card className="space-y-3"><h2 className="text-xl text-primary">Contact</h2><Field label="Address"><Input value={String(v.address)} onChange={set("address")} /></Field><Field label="Phone"><Input value={String(v.phone)} onChange={set("phone")} /></Field><Field label="Email"><Input type="email" value={String(v.email)} onChange={set("email")} /></Field></Card>
      <Card className="space-y-3"><h2 className="text-xl text-primary">Attendance</h2><Field label="Teacher edit window (days)"><Input inputMode="numeric" value={String(v.edit)} onChange={set("edit")} /></Field><Field label="Low-attendance threshold (%)"><Input inputMode="numeric" value={String(v.low)} onChange={set("low")} /></Field></Card>
      <Card className="space-y-3"><h2 className="text-xl text-primary">Fees</h2><Field label="Late fee per period (₹)"><Input inputMode="decimal" value={String(v.late)} onChange={set("late")} /></Field><div className="grid grid-cols-2 gap-3"><Field label="Grace days"><Input inputMode="numeric" value={String(v.grace)} onChange={set("grace")} /></Field><Field label="Period (days)"><Input inputMode="numeric" value={String(v.period)} onChange={set("period")} /></Field></div><Field label="Receipt prefix"><Input value={String(v.prefix)} onChange={set("prefix")} maxLength={6} /></Field></Card>
      <Card className="space-y-3"><h2 className="text-xl text-primary">Exams</h2><Field label="Passing percentage"><Input inputMode="numeric" value={String(v.pass)} onChange={set("pass")} /></Field><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={!!v.rank} onChange={(e) => setF({ ...v, rank: e.target.checked })} />Show class rank on report cards</label>
        <h3 className="pt-2 text-sm font-semibold">Notification channels</h3><div className="flex flex-wrap gap-2 text-xs"><Badge tone="success">In-app: enabled</Badge><Badge tone={data.notifications.email === "configured" ? "info" : "neutral"}>Email: {data.notifications.email.replace("_", " ")}</Badge><Badge tone={data.notifications.sms === "configured" ? "info" : "neutral"}>SMS: {data.notifications.sms.replace("_", " ")}</Badge></div></Card>
      <div className="md:col-span-2"><Button type="submit" loading={busy}>Save settings</Button></div>
    </form>
  );
}

interface R { permissions: string[]; roles: { role: string; permissions: string[]; customised: boolean }[] }
function RolesTab() {
  const { data, loading, reload } = useFetch<R>("/api/settings/roles"); const { busy, run } = useAction(); const [role, setRole] = useState("teacher"); const [sel, setSel] = useState<string[] | null>(null);
  if (loading || !data) return <Skeleton className="h-64" />;
  const cur = data.roles.find((r) => r.role === role)!; const perms = sel ?? cur.permissions;
  return (
    <div className="space-y-4"><div className="flex flex-wrap gap-2">{data.roles.map((r) => <Button key={r.role} size="sm" variant={r.role === role ? "primary" : "secondary"} onClick={() => { setRole(r.role); setSel(null); }}>{r.role.replace("_", " ")}{r.customised && " •"}</Button>)}</div>
      <p className="text-sm text-muted">Staff-only powers (writing students, fees, publishing results, user and role management) can never be granted to teachers, students or parents; the server enforces this.</p>
      <Card><div className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3">{data.permissions.map((p) => <label key={p} className="flex items-center gap-2 font-mono text-xs"><input type="checkbox" checked={perms.includes(p)} onChange={(e) => setSel(e.target.checked ? [...perms, p] : perms.filter((x) => x !== p))} />{p}</label>)}</div></Card>
      <div className="flex gap-2"><Button loading={busy} onClick={async () => { if (await run(() => api("/api/settings/roles", { method: "PUT", json: { role, permissions: perms } }), "Role updated")) { setSel(null); reload(); } }}>Save role</Button><Button variant="secondary" loading={busy} onClick={async () => { if (await run(() => api("/api/settings/roles", { method: "PUT", json: { role, permissions: [], reset: true } }), "Reset to defaults")) { setSel(null); reload(); } }}>Reset to defaults</Button></div></div>
  );
}

interface U { id: string; name: string; email: string; role: string; active: boolean; activated: boolean; lastLoginAt?: string }
function UsersTab() {
  const [q, setQ] = useState(""); const { data, loading, reload } = useFetch<{ items: U[] }>(`/api/users?pageSize=100${q ? `&q=${encodeURIComponent(q)}` : ""}`); const { busy, run } = useAction();
  const [add, setAdd] = useState(false); const [f, setF] = useState({ name: "", email: "" }); const [link, setLink] = useState<string | null>(null);
  return (<div className="space-y-3"><div className="flex gap-2"><Input aria-label="Search users" placeholder="Search name or email" className="max-w-xs" value={q} onChange={(e) => setQ(e.target.value)} /><Button className="ml-auto" onClick={() => { setAdd(true); setLink(null); }}>Add admin</Button></div>
    {loading || !data ? <Skeleton className="h-40" /> : <div className="overflow-x-auto rounded-[14px] border border-line bg-surface"><table className="w-full text-sm"><thead className="border-b border-line bg-canvas text-left text-xs uppercase text-muted"><tr><th className="px-4 py-3">User</th><th className="px-4 py-3">Role</th><th className="px-4 py-3">Status</th><th /></tr></thead><tbody>{data.items.map((u) => (
      <tr key={u.id + u.role} className="border-b border-line last:border-0"><td className="px-4 py-3"><p className="font-semibold">{u.name}</p><p className="text-xs text-muted">{u.email}</p></td><td className="px-4 py-3 capitalize">{u.role.replace("_", " ")}</td><td className="px-4 py-3"><Badge tone={u.active ? "success" : "danger"}>{u.active ? (u.activated ? "active" : "invited") : "disabled"}</Badge></td>
        <td className="space-x-1 px-4 py-3 text-right"><Button size="sm" variant="secondary" onClick={async () => { const r = await run(() => api<{ resetPath?: string }>(`/api/users/${u.id}`, { method: "PATCH", json: { resetLink: true } })); if (r?.resetPath) { setLink(r.resetPath); setAdd(true); } }}>Reset link</Button><Button size="sm" variant="ghost" onClick={async () => { if (await run(() => api(`/api/users/${u.id}`, { method: "PATCH", json: { active: !u.active } }), u.active ? "Disabled" : "Enabled")) reload(); }}>{u.active ? "Disable" : "Enable"}</Button></td></tr>))}</tbody></table></div>}
    <Modal open={add} onOpenChange={setAdd} title={link ? "Share this link" : "Add school admin"} description="Email isn't configured, so links are shown here once.">{link ? <p className="break-all rounded-xl bg-soft p-3 font-mono text-xs">{window.location.origin}{link}</p> : (
      <form className="space-y-3" onSubmit={async (e) => { e.preventDefault(); const r = await run(() => api<{ activationPath: string | null }>("/api/users", { method: "POST", json: f }), "Admin added"); if (r) { reload(); setLink(r.activationPath ?? "/login"); } }}><Field label="Name"><Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} required /></Field><Field label="Email"><Input type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} required /></Field><Button type="submit" className="w-full" loading={busy}>Create</Button></form>)}</Modal></div>);
}

function AuditTab() {
  const { data, loading } = useFetch<{ items: { id: string; at: string; actor: string; role?: string; action: string; entity?: string }[] }>("/api/settings/audit?pageSize=100");
  if (loading || !data) return <Skeleton className="h-64" />;
  return <div className="overflow-x-auto rounded-[14px] border border-line bg-surface"><table className="w-full text-sm"><thead className="border-b border-line bg-canvas text-left text-xs uppercase text-muted"><tr><th className="px-4 py-3">When</th><th className="px-4 py-3">Who</th><th className="px-4 py-3">Action</th><th className="px-4 py-3">Entity</th></tr></thead><tbody>{data.items.map((a) => <tr key={a.id} className="border-b border-line last:border-0"><td className="px-4 py-2.5 text-xs text-muted">{new Date(a.at).toLocaleString("en-IN")}</td><td className="px-4 py-2.5">{a.actor} <span className="text-xs text-muted">{a.role?.replace("_", " ")}</span></td><td className="px-4 py-2.5 font-mono text-xs">{a.action}</td><td className="px-4 py-2.5 text-xs text-muted">{a.entity}</td></tr>)}</tbody></table></div>;
}
