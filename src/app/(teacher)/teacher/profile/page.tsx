import { requirePage } from "@/lib/authorization/context";
import { PageHeader } from "@/components/ui/primitives";
import { ProfileView } from "@/features/teacher/profile-view";

export const metadata = { title: "Profile" };
export default async function Page() { const c = await requirePage({ roles: ["teacher"] }); return (<><PageHeader title="Profile" accent="& security" /><ProfileView name={c.name} email={c.email} role={c.role} school={c.schoolName} /></>); }
