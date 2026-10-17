import { can, requirePage } from "@/lib/authorization/context";
import { PageHeader } from "@/components/ui/primitives";
import { AttendanceManager } from "@/features/attendance/components/attendance-manager";

export const metadata = { title: "Attendance" };
export default async function Page() {
  const ctx = await requirePage({ perm: "attendance.read" });
  return (<><PageHeader title="Attendance" accent="register" /><AttendanceManager canMark={can(ctx, "attendance.mark")} /></>);
}
