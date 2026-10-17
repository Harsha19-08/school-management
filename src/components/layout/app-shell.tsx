import { NAV, type NavItem } from "@/config/navigation";
import { can, type Ctx } from "@/lib/authorization/context";
import { themeFor } from "@/config/schools";
import { School } from "@/models";
import { BottomNav, SidebarNav } from "./nav-links";
import { GlobalSearch, LogoutButton, NotificationBell, SchoolSwitcher } from "./topbar-widgets";

const allowed = (ctx: Ctx, i: NavItem) => (!i.roles || i.roles.includes(ctx.role)) && (!i.perm || can(ctx, i.perm));

export async function AppShell({ ctx, area, children }: { ctx: Ctx; area: keyof typeof NAV; children: React.ReactNode }) {
  const theme = themeFor(ctx.schoolSlug);
  const items = NAV[area].filter((i) => allowed(ctx, i));
  const schools = ctx.isSuper ? (await School.find({ active: true }).select("name").sort({ name: 1 }).lean()).map((s) => ({ id: String(s._id), name: s.name })) : [];
  return (
    <div data-school={ctx.schoolSlug} className="min-h-dvh bg-canvas">
      <aside className="fixed inset-y-0 left-0 hidden w-60 flex-col border-r border-line bg-surface p-4 md:flex">
          <div className="mb-6 px-2">
            <p className="font-display text-xl leading-tight text-primary">{theme.name}</p>
            <p className="mt-0.5 text-xs italic text-muted">{theme.tagline}</p>
          </div>
          <div className="flex-1 overflow-y-auto"><SidebarNav items={items} /></div>
          <div className="border-t border-line pt-3"><LogoutButton /></div>
      </aside>
      <div className="md:pl-60">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between gap-3 border-b border-line bg-canvas/90 px-4 backdrop-blur md:px-8">
          <div className="min-w-0 md:hidden"><p className="truncate font-display text-lg text-primary">{theme.shortName}</p></div>
          <div className="hidden md:block">{ctx.role !== "student" && ctx.role !== "parent" && ctx.role !== "teacher" ? <GlobalSearch /> : null}</div>
          <div className="flex items-center gap-2">
            {ctx.isSuper && schools.length > 0 && <SchoolSwitcher schools={schools} current={ctx.schoolId} />}
            <NotificationBell />
            <div className="hidden text-right text-xs leading-tight sm:block"><p className="font-semibold">{ctx.name}</p><p className="capitalize text-muted">{ctx.role.replace("_", " ")}</p></div>
            <div className="md:hidden"><LogoutButton /></div>
          </div>
        </header>
        <main className={`mx-auto max-w-6xl px-4 py-6 md:px-8 pb-24 md:pb-8`}>{children}</main>
      </div>
      <BottomNav items={items.slice(0, 5)} />
    </div>
  );
}
