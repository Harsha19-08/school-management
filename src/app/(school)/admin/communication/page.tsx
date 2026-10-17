import { can, requirePage } from "@/lib/authorization/context";
import { PageHeader } from "@/components/ui/primitives";
import { NoticesView } from "@/features/notices/components/notices-view";

export const metadata = { title: "Communication" };
export default async function Page() {
  const ctx = await requirePage({ perm: "notice.read" });
  return (<><PageHeader title="Communication" accent="notices" /><NoticesView canWrite={can(ctx, "notice.write")} /></>);
}
