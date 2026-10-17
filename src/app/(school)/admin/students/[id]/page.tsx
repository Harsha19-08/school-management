import { can, requirePage } from "@/lib/authorization/context";
import { StudentProfile } from "@/features/students/components/profile";

export const metadata = { title: "Student" };
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await requirePage({ perm: "student.read" });
  const { id } = await params;
  return <StudentProfile id={id} perms={{ write: can(ctx, "student.write"), account: can(ctx, "user.manage"), collect: can(ctx, "fee.collect"), reverse: can(ctx, "fee.reverse"), fee: can(ctx, "fee.read"), concede: can(ctx, "fee.write"), attendance: can(ctx, "attendance.read") }} />;
}
