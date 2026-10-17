import { requirePage } from "@/lib/authorization/context";
import { TeacherDashboard } from "@/features/teacher/dashboard";

export const metadata = { title: "Dashboard" };
export default async function Page() { const ctx = await requirePage({ roles: ["teacher"] }); return <TeacherDashboard name={ctx.name.split(" ")[0]} />; }
