import { requirePage } from "@/lib/authorization/context";
import { AppShell } from "@/components/layout/app-shell";

export const dynamic = "force-dynamic";
export default async function Layout({ children }: { children: React.ReactNode }) {
  const ctx = await requirePage({ roles: ["school_admin","super_admin"] });
  return <AppShell ctx={ctx} area="admin">{children}</AppShell>;
}
