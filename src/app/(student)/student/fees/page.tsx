import { requirePage } from "@/lib/authorization/context";
import { FeePanel } from "@/features/fees/components/fee-panel";

export const metadata = { title: "Fees" };
export default async function Page() { await requirePage({ roles: ["student"], perm: "fee.read_own" }); return (<><h1 className="mb-1 text-3xl text-primary">Fees</h1><p className="mb-4 text-sm text-muted">Payments are made at the school office; they appear here once recorded.</p><FeePanel /></>); }
