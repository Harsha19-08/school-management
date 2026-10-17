import { can, requirePage } from "@/lib/authorization/context";
import { PageHeader } from "@/components/ui/primitives";
import { DocumentsView } from "@/features/documents/components/documents-view";

export const metadata = { title: "Documents" };
export default async function Page() {
  const ctx = await requirePage({ perm: "document.read" });
  return (<><PageHeader title="Documents" accent="vault" /><DocumentsView canWrite={can(ctx, "document.write")} /></>);
}
