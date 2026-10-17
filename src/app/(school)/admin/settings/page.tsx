import { can, requirePage } from "@/lib/authorization/context";
import { PageHeader } from "@/components/ui/primitives";
import { SettingsView } from "@/features/settings/components/settings-view";

export const metadata = { title: "Settings" };
export default async function Page() {
  const ctx = await requirePage({ perm: "school.settings" });
  return (<><PageHeader title="Settings" accent="& access" /><SettingsView can={{ school: true, roles: can(ctx, "role.manage"), users: can(ctx, "user.manage"), audit: can(ctx, "audit.view") }} /></>);
}
