import { requirePage } from "@/lib/authorization/context";
import { ResultsView } from "@/features/portal/results-view";

export const metadata = { title: "Results" };
export default async function Page() { await requirePage({ roles: ["student"], perm: "results.read_published" }); return (<><h1 className="mb-4 text-3xl text-primary">Results</h1><ResultsView /></>); }
