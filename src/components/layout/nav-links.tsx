"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, Award, BookOpen, Building2, CalendarCheck, ClipboardList, Clock, FileText, Folder, GraduationCap, Home, IndianRupee, LayoutDashboard, Megaphone, Menu, PartyPopper, Settings, User, UserPlus, Users, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const ICONS: Record<string, LucideIcon> = { "bar-chart-3": BarChart3, award: Award, "book-open": BookOpen, "building-2": Building2, "calendar-check": CalendarCheck, "clipboard-list": ClipboardList, clock: Clock, "file-text": FileText, folder: Folder, "graduation-cap": GraduationCap, home: Home, "indian-rupee": IndianRupee, "layout-dashboard": LayoutDashboard, megaphone: Megaphone, menu: Menu, "party-popper": PartyPopper, settings: Settings, user: User, "user-plus": UserPlus, users: Users };
export interface LinkItem { href: string; label: string; icon: string }

function useActive() {
  const path = usePathname();
  // Dashboard roots (e.g. /admin) only match exactly; deeper sections also match their sub-pages.
  return (href: string) => path === href || (href.split("/").length > 2 && path.startsWith(href + "/"));
}

export function SidebarNav({ items }: { items: LinkItem[] }) {
  const active = useActive();
  return (
    <nav aria-label="Main" className="flex flex-col gap-0.5">
      {items.map((i) => { const Icon = ICONS[i.icon] ?? Home; const a = active(i.href); return (
        <Link key={i.href} href={i.href} aria-current={a ? "page" : undefined} className={cn("flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold transition", a ? "bg-soft text-primary" : "text-muted hover:bg-canvas hover:text-ink")}>
          <Icon className="size-4" aria-hidden />{i.label}
        </Link>); })}
    </nav>
  );
}

export function BottomNav({ items }: { items: LinkItem[] }) {
  const active = useActive();
  return (
    <nav aria-label="Main" className="safe-bottom fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface md:hidden">
      <ul className="flex">
        {items.map((i) => { const Icon = ICONS[i.icon] ?? Home; const a = active(i.href); return (
          <li key={i.href} className="flex-1">
            <Link href={i.href} aria-current={a ? "page" : undefined} className={cn("flex min-h-14 flex-col items-center justify-center gap-0.5 text-[11px] font-semibold", a ? "text-interactive" : "text-muted")}>
              <Icon className="size-5" aria-hidden />{i.label}
            </Link>
          </li>); })}
      </ul>
    </nav>
  );
}
