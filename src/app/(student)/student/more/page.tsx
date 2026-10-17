import { requirePage } from "@/lib/authorization/context";
import { MoreView } from "@/features/portal/more-view";

export const metadata = { title: "More" };
export default async function Page() { const c = await requirePage({ roles: ["student"] }); return (<><h1 className="mb-4 text-3xl text-primary">More</h1><MoreView me={{ name: c.name, email: c.email, role: c.role, school: c.schoolName }} /></>); }
