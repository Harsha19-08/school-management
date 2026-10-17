import { requirePage } from "@/lib/authorization/context";
import { AdminDashboard } from "./dashboard";

export const metadata = { title: "Dashboard" };
export default async function Page() {
  const ctx = await requirePage({ roles: ["super_admin", "school_admin"] });
  return <AdminDashboard school={ctx.schoolName} name={ctx.name.split(" ")[0]} />;
}
