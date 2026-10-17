"use client";
import { Skeleton } from "@/components/ui/primitives";
import { TimetableGrid } from "@/features/academics/components/timetable-grid";
import { useFetch } from "@/hooks/use-fetch";
import { qs } from "@/lib/api/client";
import type { TimetableSlot } from "@/features/academics/timetable";

/** Own timetable for teachers; own/child's section timetable for student/parent. */
export function MyTimetable({ studentId, teacher }: { studentId?: string; teacher?: boolean }) {
  const { data, loading, error } = useFetch<TimetableSlot[]>(`/api/timetable${qs({ studentId, mine: teacher ? "1" : undefined })}`);
  if (error) return <p role="alert" className="text-sm text-danger">{error}</p>;
  if (loading || !data) return <Skeleton className="h-64" />;
  if (!data.length) return <p className="text-sm text-muted">No timetable has been set up yet.</p>;
  return <TimetableGrid slots={data} showSection={teacher} />;
}
