import { requirePage } from "@/lib/authorization/context";
import { PageHeader } from "@/components/ui/primitives";
import { MarksEntry } from "@/features/examinations/components/marks-entry";

export const metadata = { title: "Marks" };
export default async function Page() {
  await requirePage({ roles: ["teacher"], perm: "marks.enter" });
  return (<><PageHeader title="Marks" accent="entry" subtitle="Only your assigned subjects and sections will save." /><MarksEntry /></>);
}
