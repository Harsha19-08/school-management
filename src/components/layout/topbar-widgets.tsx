"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Bell, LogOut, Search } from "lucide-react";
import { toast } from "sonner";
import { api, qs } from "@/lib/api/client";
import { Select } from "@/components/ui/primitives";

export function LogoutButton() {
  const r = useRouter();
  return (
    <button onClick={async () => { try { await api("/api/auth/logout", { method: "POST", json: {} }); } finally { r.replace("/login"); r.refresh(); } }} className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-muted hover:bg-canvas hover:text-ink">
      <LogOut className="size-4" aria-hidden /> Sign out
    </button>
  );
}

export function SchoolSwitcher({ schools, current }: { schools: { id: string; name: string }[]; current: string }) {
  const r = useRouter();
  return (
    <Select aria-label="Switch school" value={current} className="h-9 w-auto max-w-56" onChange={async (e) => {
      try { await api("/api/auth/switch-school", { method: "POST", json: { schoolId: e.target.value } }); window.location.assign("/admin"); } catch (er) { toast.error((er as Error).message); r.refresh(); }
    }}>
      {schools.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
    </Select>
  );
}

interface Note { id: string; title: string; body?: string; link?: string; read: boolean; createdAt: string }
export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<{ unread: number; items: Note[] }>({ unread: 0, items: [] });
  const ref = useRef<HTMLDivElement>(null);
  const load = () => api<{ unread: number; items: Note[] }>("/api/notifications").then(setData).catch(() => {});
  useEffect(() => { load(); const t = setInterval(load, 60_000); return () => clearInterval(t); }, []);
  useEffect(() => { const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); }; document.addEventListener("mousedown", h); return () => document.removeEventListener("mousedown", h); }, []);
  return (
    <div className="relative" ref={ref}>
      <button aria-label={`Notifications${data.unread ? `, ${data.unread} unread` : ""}`} aria-expanded={open} onClick={() => setOpen((o) => !o)} className="relative rounded-xl p-2 text-muted hover:bg-canvas">
        <Bell className="size-5" />
        {data.unread > 0 && <span className="absolute right-1 top-1 grid size-4 place-items-center rounded-full bg-danger text-[10px] font-bold text-white">{data.unread > 9 ? "9+" : data.unread}</span>}
      </button>
      {open && (
        <div className="absolute right-0 z-40 mt-2 w-80 max-w-[calc(100vw-2rem)] rounded-[14px] border border-line bg-surface p-2 shadow-lg">
          <div className="flex items-center justify-between px-2 py-1">
            <p className="text-sm font-semibold">Notifications</p>
            {data.unread > 0 && <button className="text-xs text-interactive" onClick={async () => { await api("/api/notifications", { method: "POST", json: {} }); load(); }}>Mark all read</button>}
          </div>
          <ul className="max-h-80 overflow-y-auto">
            {data.items.length === 0 && <li className="px-2 py-6 text-center text-sm text-muted">You&apos;re all caught up.</li>}
            {data.items.map((n) => (
              <li key={n.id} className={`rounded-lg px-2 py-2 text-sm ${n.read ? "" : "bg-soft/60"}`}>
                {n.link ? <Link href={n.link} onClick={() => setOpen(false)} className="font-semibold text-primary">{n.title}</Link> : <p className="font-semibold">{n.title}</p>}
                {n.body && <p className="text-xs text-muted">{n.body}</p>}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export function GlobalSearch() {
  const r = useRouter();
  const [q, setQ] = useState(""); const [hits, setHits] = useState<{ id: string; label: string; sub?: string; href: string; type: string }[]>([]);
  const active = q.trim().length >= 2;
  useEffect(() => { if (!active) return; const t = setTimeout(() => api<typeof hits>(`/api/search${qs({ q })}`).then(setHits).catch(() => setHits([])), 250); return () => clearTimeout(t); }, [q, active]);
  const shown = active ? hits : [];
  return (
    <div className="relative hidden w-72 md:block">
      <Search className="pointer-events-none absolute left-3 top-2.5 size-4 text-muted" aria-hidden />
      <input aria-label="Search students and teachers" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search students, teachers…" className="h-10 w-full rounded-xl border border-line bg-surface pl-9 pr-3 text-sm" />
      {shown.length > 0 && (
        <ul className="absolute z-40 mt-1 w-full overflow-hidden rounded-[14px] border border-line bg-surface shadow-lg">
          {shown.map((h) => <li key={h.type + h.id}><button className="flex w-full flex-col px-3 py-2 text-left text-sm hover:bg-soft" onClick={() => { setQ(""); setHits([]); r.push(h.href); }}><span className="font-semibold">{h.label}</span><span className="font-mono text-xs text-muted">{h.type} · {h.sub}</span></button></li>)}
        </ul>
      )}
    </div>
  );
}
