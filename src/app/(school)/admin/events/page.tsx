import { can, requirePage } from "@/lib/authorization/context";
import { PageHeader } from "@/components/ui/primitives";
import { EventsView } from "@/features/events/components/events-view";

export const metadata = { title: "Events" };
export default async function Page() {
  const ctx = await requirePage({ perm: "event.read" });
  return (<><PageHeader title="Events" accent="calendar" /><EventsView canWrite={can(ctx, "event.write")} /></>);
}
