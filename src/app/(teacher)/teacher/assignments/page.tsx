import { requirePage } from "@/lib/authorization/context";
import { PageHeader } from "@/components/ui/primitives";
import { AssignmentsTeacher } from "@/features/assignments/components/assignments-teacher";

export const metadata = { title: "Assignments" };
export default async function Page() { await requirePage({ roles: ["teacher"], perm: "assignment.write" }); return (<><PageHeader title="Assignments" accent="& resources" /><AssignmentsTeacher /></>); }
