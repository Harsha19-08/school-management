import { can, requirePage } from "@/lib/authorization/context";
import { PageHeader } from "@/components/ui/primitives";
import { FeesAdmin } from "@/features/fees/components/fees-admin";

export const metadata = { title: "Fees" };
export default async function Page() {
  const ctx = await requirePage({ perm: "fee.read" });
  return (<><PageHeader title="Fees" accent="ledger" /><FeesAdmin perms={{ write: can(ctx, "fee.write"), collect: can(ctx, "fee.collect"), reverse: can(ctx, "fee.reverse") }} /></>);
}
