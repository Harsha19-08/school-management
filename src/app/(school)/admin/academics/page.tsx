import { can, requirePage } from "@/lib/authorization/context";
import { PageHeader } from "@/components/ui/primitives";
import { AcademicsTabs } from "@/features/academics/components/academics-tabs";

export const metadata = { title: "Academics" };
export default async function Page() {
  const ctx = await requirePage({ perm: "academics.read" });
  return (<><PageHeader title="Academics" accent="structure" /><AcademicsTabs canWrite={can(ctx, "academics.write")} canTeachers={can(ctx, "teacher.read")} /></>);
}
