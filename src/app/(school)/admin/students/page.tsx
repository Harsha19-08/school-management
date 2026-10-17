import { can, requirePage } from "@/lib/authorization/context";
import { PageHeader } from "@/components/ui/primitives";
import { StudentList } from "@/features/students/components/student-list";

export const metadata = { title: "Students" };
export default async function Page() {
  const ctx = await requirePage({ perm: "student.read" });
  return (<><PageHeader title="Students" accent="directory" /><StudentList canWrite={can(ctx, "student.write")} canExport={can(ctx, "student.export")} basePath="/admin/students" /></>);
}
