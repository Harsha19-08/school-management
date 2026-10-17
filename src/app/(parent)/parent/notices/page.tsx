import { requirePage } from "@/lib/authorization/context";
import { ParentNotices } from "@/features/portal/parent-pages";

export const metadata = { title: "Notices" };
export default async function Page() { await requirePage({ roles: ["parent"] }); return (<><h1 className="mb-3 text-3xl text-primary">Notices</h1><ParentNotices /></>); }
