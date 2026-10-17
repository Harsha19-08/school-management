import { requirePage } from "@/lib/authorization/context";
import { ParentFees } from "@/features/portal/parent-pages";

export const metadata = { title: "Fees" };
export default async function Page() { await requirePage({ roles: ["parent"], perm: "fee.read_own" }); return (<><h1 className="mb-3 text-3xl text-primary">Fees</h1><ParentFees /></>); }
