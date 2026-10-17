import { requirePage } from "@/lib/authorization/context";
import { PageHeader } from "@/components/ui/primitives";
import { ReportsView } from "@/features/reporting/reports-view";

export const metadata = { title: "Reports" };
export default async function Page() { await requirePage({ perm: "report.read" }); return (<><PageHeader title="Reports" accent="& exports" subtitle="CSV files are generated from live data for your school only." /><ReportsView /></>); }
