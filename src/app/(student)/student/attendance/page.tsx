import { requirePage } from "@/lib/authorization/context";
import { AttendanceMonth } from "@/features/attendance/components/attendance-month";

export const metadata = { title: "Attendance" };
export default async function Page() { await requirePage({ roles: ["student"] }); return (<><h1 className="mb-4 text-3xl text-primary">Attendance</h1><AttendanceMonth /></>); }
