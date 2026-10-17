import { requirePage } from "@/lib/authorization/context";
import { MyTimetable } from "@/features/teacher/timetable-view";

export const metadata = { title: "Timetable" };
export default async function Page() { await requirePage({ roles: ["student"] }); return (<><h1 className="mb-4 text-3xl text-primary">Timetable</h1><MyTimetable /></>); }
