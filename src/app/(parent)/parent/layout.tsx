import { requirePage } from "@/lib/authorization/context";
import { AppShell } from "@/components/layout/app-shell";
import { ChildProvider } from "@/features/portal/child-context";

export const dynamic = "force-dynamic";
export default async function Layout({ children }: { children: React.ReactNode }) {
  const ctx = await requirePage({ roles: ["parent"] });
  return <AppShell ctx={ctx} area="parent"><ChildProvider>{children}</ChildProvider></AppShell>;
}
