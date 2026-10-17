import { can, requirePage } from "@/lib/authorization/context";
import { PageHeader } from "@/components/ui/primitives";
import { AdmissionsView } from "@/features/admissions/components/admissions-view";

export const metadata = { title: "Admissions" };
export default async function Page() {
  const ctx = await requirePage({ perm: "admission.read" });
  return (<><PageHeader title="Admissions" accent="pipeline" /><AdmissionsView canWrite={can(ctx, "admission.write")} canDecide={can(ctx, "admission.decide")} /></>);
}
