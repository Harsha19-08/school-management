import { requirePage } from "@/lib/authorization/context";
import { PageHeader } from "@/components/ui/primitives";
import { AttendanceManager } from "@/features/attendance/components/attendance-manager";

export const metadata = { title: "Attendance" };
export default async function Page() {
  await requirePage({ roles: ["teacher"], perm: "attendance.mark" });
  return (<><PageHeader title="Attendance" accent="register" subtitle="Your assigned sections" /><AttendanceManager canMark /></>);
}
