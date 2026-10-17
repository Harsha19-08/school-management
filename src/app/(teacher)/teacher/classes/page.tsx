import { requirePage } from "@/lib/authorization/context";
import { PageHeader } from "@/components/ui/primitives";
import { StudentList } from "@/features/students/components/student-list";

export const metadata = { title: "My classes" };
export default async function Page() { await requirePage({ roles: ["teacher"], perm: "student.read" }); return (<><PageHeader title="My classes" accent="students" subtitle="Only students in sections you teach." /><StudentList canWrite={false} canExport={false} basePath="" /></>); }
