import { requirePage } from "@/lib/authorization/context";
import { ParentHome } from "@/features/portal/parent-pages";

export const metadata = { title: "Home" };
export default async function Page() { await requirePage({ roles: ["parent"] }); return (<><h1 className="mb-3 text-3xl text-primary">Home</h1><ParentHome /></>); }
