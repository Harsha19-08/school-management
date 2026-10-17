import { can, requirePage } from "@/lib/authorization/context";
import { PageHeader } from "@/components/ui/primitives";
import { ExamsAdmin } from "@/features/examinations/components/exams-admin";

export const metadata = { title: "Exams" };
export default async function Page() {
  const ctx = await requirePage({ perm: "exam.read" });
  return (<><PageHeader title="Exams" accent="& results" /><ExamsAdmin canWrite={can(ctx, "exam.write")} canPublish={can(ctx, "results.publish")} /></>);
}
