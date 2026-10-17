"use client";
import { useState } from "react";
import { ArrowRightLeft, KeyRound } from "lucide-react";
import { Badge, Button, Card, ErrorNote, Field, Input, PageHeader, Select, Skeleton, Tabs } from "@/components/ui/primitives";
import { Modal } from "@/components/ui/modal";
import { ClassSectionSelect } from "@/components/ui/class-section-select";
import { FeePanel } from "@/features/fees/components/fee-panel";
import { AttendanceMonth } from "@/features/attendance/components/attendance-month";
import { useFetch } from "@/hooks/use-fetch";
import { useAction } from "@/hooks/use-action";
import { useStructure } from "@/hooks/use-structure";
import { api } from "@/lib/api/client";

interface P { id: string; name: string; admissionNo: string; gender: string; dob: string; status: string; classId: string; sectionId: string; rollNo?: number; phone?: string; address?: string; admissionDate: string; hasAccount: boolean; guardians: { id: string; name: string; phone?: string; email?: string; relation?: string; hasAccount: boolean }[]; history: { at: string; action: string; note?: string }[] }
type Tab = "overview" | "attendance" | "fees" | "history";

export function StudentProfile({ id, perms }: { id: string; perms: { write: boolean; account: boolean; collect: boolean; reverse: boolean; fee: boolean; concede: boolean; attendance: boolean } }) {
  const { data, error, loading, reload } = useFetch<P>(`/api/students/${id}`);
  const st = useStructure();
  const [tab, setTab] = useState<Tab>("overview");
  const [modal, setModal] = useState<"status" | "transfer" | "account" | null>(null);
  const [status, setStatus] = useState("inactive"); const [note, setNote] = useState(""); const [email, setEmail] = useState(""); const [who, setWho] = useState<"student" | "parent">("student");
  const [target, setTarget] = useState({ classId: "", sectionId: "" }); const [link, setLink] = useState<string | null>(null);
  const { busy, run } = useAction();
  if (error) return <ErrorNote message={error} />;
  if (loading || !data) return <Skeleton className="h-64" />;
  const cname = st.classes.find((c) => c.id === data.classId)?.name; const sname = st.sections.find((s) => s.id === data.sectionId)?.name;
  const tabs: { id: Tab; label: string }[] = [{ id: "overview", label: "Overview" }, ...(perms.attendance ? [{ id: "attendance" as Tab, label: "Attendance" }] : []), ...(perms.fee ? [{ id: "fees" as Tab, label: "Fees" }] : []), { id: "history", label: "History" }];
  return (
    <>
      <PageHeader title={data.name} subtitle={`${data.admissionNo} · ${cname ?? ""} ${sname ?? ""}${data.rollNo ? ` · Roll ${data.rollNo}` : ""}`}
        actions={<>
          <Badge tone={data.status === "active" ? "success" : "warning"}>{data.status}</Badge>
          {perms.write && <Button variant="secondary" size="sm" onClick={() => setModal("transfer")}><ArrowRightLeft className="size-3" />Move section</Button>}
          {perms.write && <Button variant="secondary" size="sm" onClick={() => { setStatus(data.status === "active" ? "inactive" : "active"); setModal("status"); }}>Change status</Button>}
          {perms.account && <Button variant="secondary" size="sm" onClick={() => { setLink(null); setModal("account"); }}><KeyRound className="size-3" />Portal login</Button>}
        </>} />
      <Tabs tabs={tabs} value={tab} onChange={setTab} />
      {tab === "overview" && (
        <div className="grid gap-4 md:grid-cols-2">
          <Card><h2 className="mb-3 text-xl text-primary">Details</h2>
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <div><dt className="text-muted">Gender</dt><dd className="capitalize">{data.gender}</dd></div><div><dt className="text-muted">Date of birth</dt><dd>{new Date(data.dob).toLocaleDateString("en-IN")}</dd></div>
              <div><dt className="text-muted">Admitted</dt><dd>{new Date(data.admissionDate).toLocaleDateString("en-IN")}</dd></div><div><dt className="text-muted">Portal login</dt><dd>{data.hasAccount ? "Active" : "Not created"}</dd></div>
              {data.phone && <div><dt className="text-muted">Phone</dt><dd>{data.phone}</dd></div>}{data.address && <div className="col-span-2"><dt className="text-muted">Address</dt><dd>{data.address}</dd></div>}
            </dl></Card>
          <Card><h2 className="mb-3 text-xl text-primary">Guardians</h2>
            {data.guardians.length === 0 ? <p className="text-sm text-muted">No guardian on record.</p> : <ul className="space-y-3 text-sm">{data.guardians.map((g) => <li key={g.id}><p className="font-semibold">{g.name} <span className="font-normal capitalize text-muted">· {g.relation}</span></p><p className="text-muted">{g.phone}{g.email ? ` · ${g.email}` : ""}</p><p className="text-xs text-muted">Parent login: {g.hasAccount ? "active" : "not created"}</p></li>)}</ul>}</Card>
        </div>
      )}
      {tab === "attendance" && <AttendanceMonth studentId={id} />}
      {tab === "fees" && <FeePanel studentId={id} canCollect={perms.collect} canReverse={perms.reverse} canConcede={perms.concede} />}
      {tab === "history" && <Card><ul className="space-y-2 text-sm">{[...data.history].reverse().map((h, i) => <li key={i} className="flex justify-between gap-4"><span>{h.action}{h.note ? ` — ${h.note}` : ""}</span><span className="text-muted">{new Date(h.at).toLocaleDateString("en-IN")}</span></li>)}</ul></Card>}

      <Modal open={modal === "status"} onOpenChange={(o) => !o && setModal(null)} title="Change status" description="Students are never deleted. Inactive students lose portal access.">
        <form className="space-y-3" onSubmit={async (e) => { e.preventDefault(); const r = await run(() => api(`/api/students/${id}/status`, { method: "POST", json: { status, note: note || undefined } }), "Status updated"); if (r) { setModal(null); reload(); } }}>
          <Field label="Status"><Select value={status} onChange={(e) => setStatus(e.target.value)}>{["active", "inactive", "transferred", "alumni", "archived"].map((s) => <option key={s}>{s}</option>)}</Select></Field>
          <Field label="Note (optional)"><Input value={note} onChange={(e) => setNote(e.target.value)} /></Field>
          <Button type="submit" className="w-full" loading={busy}>Save</Button>
        </form>
      </Modal>
      <Modal open={modal === "transfer"} onOpenChange={(o) => !o && setModal(null)} title="Move to another section" description="Roll number is reassigned in the new section.">
        <form className="space-y-3" onSubmit={async (e) => { e.preventDefault(); const r = await run(() => api(`/api/students/${id}/transfer`, { method: "POST", json: { sectionId: target.sectionId } }), "Student moved"); if (r) { setModal(null); reload(); } }}>
          <ClassSectionSelect classId={target.classId} sectionId={target.sectionId} onChange={setTarget} />
          <Button type="submit" className="w-full" loading={busy} disabled={!target.sectionId}>Move student</Button>
        </form>
      </Modal>
      <Modal open={modal === "account"} onOpenChange={(o) => !o && setModal(null)} title="Create portal login" description="Email delivery isn't configured, so you'll get a one-time link to hand over.">
        {link ? (
          <div className="space-y-2 text-sm"><p>Share this activation link securely. It is shown once and expires in 72 hours.</p><p className="break-all rounded-xl bg-soft p-3 font-mono text-xs">{typeof window !== "undefined" ? window.location.origin : ""}{link}</p></div>
        ) : (
          <form className="space-y-3" onSubmit={async (e) => { e.preventDefault(); const r = await run(() => api<{ activationPath: string | null }>(`/api/students/${id}/account`, { method: "POST", json: { email, role: who } })); if (r) { setLink(r.activationPath ?? "(existing user — they can sign in with their current password)"); reload(); } }}>
            <Field label="Login for"><Select value={who} onChange={(e) => setWho(e.target.value as "student" | "parent")}><option value="student">Student</option><option value="parent">Parent / guardian</option></Select></Field>
            <Field label="Email"><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></Field>
            <Button type="submit" className="w-full" loading={busy}>Create login</Button>
          </form>
        )}
      </Modal>
    </>
  );
}
