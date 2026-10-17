import { requirePage } from "@/lib/authorization/context";
import { AppShell } from "@/components/layout/app-shell";

export const dynamic = "force-dynamic";
export default async function Layout({ children }: { children: React.ReactNode }) {
  const ctx = await requirePage({ roles: ["student"] });
  return <AppShell ctx={ctx} area="student">{children}</AppShell>;
}
