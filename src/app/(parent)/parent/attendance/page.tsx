import { requirePage } from "@/lib/authorization/context";
import { ParentAttendance } from "@/features/portal/parent-pages";

export const metadata = { title: "Attendance" };
export default async function Page() { await requirePage({ roles: ["parent"] }); return (<><h1 className="mb-3 text-3xl text-primary">Attendance</h1><ParentAttendance /></>); }
