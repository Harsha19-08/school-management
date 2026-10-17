import { can, requirePage } from "@/lib/authorization/context";
import { PageHeader } from "@/components/ui/primitives";
import { NoticesView } from "@/features/notices/components/notices-view";

export const metadata = { title: "Notices" };
export default async function Page() { const ctx = await requirePage({ roles: ["teacher"], perm: "notice.read" }); return (<><PageHeader title="Notices" accent="board" /><NoticesView canWrite={can(ctx, "notice.write")} canTarget={false} /></>); }
