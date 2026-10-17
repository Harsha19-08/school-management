import { requirePage } from "@/lib/authorization/context";
import { ParentResults } from "@/features/portal/parent-pages";

export const metadata = { title: "Results" };
export default async function Page() { await requirePage({ roles: ["parent"], perm: "results.read_published" }); return (<><h1 className="mb-3 text-3xl text-primary">Results</h1><ParentResults /></>); }
