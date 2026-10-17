import { requirePage } from "@/lib/authorization/context";
import { PageHeader } from "@/components/ui/primitives";
import { MyTimetable } from "@/features/teacher/timetable-view";

export const metadata = { title: "Timetable" };
export default async function Page() { await requirePage({ roles: ["teacher"] }); return (<><PageHeader title="My timetable" accent="week" /><MyTimetable teacher /></>); }
