import { can, requirePage } from "@/lib/authorization/context";
import { AssignmentsStudent } from "@/features/assignments/components/assignments-student";

export const metadata = { title: "Work" };
export default async function Page() { const c = await requirePage({ roles: ["student"], perm: "assignment.read" }); return (<><h1 className="mb-4 text-3xl text-primary">Assignments</h1><AssignmentsStudent canSubmit={can(c, "assignment.submit")} /></>); }
