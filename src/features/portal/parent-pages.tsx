"use client";
import { AttendanceMonth } from "@/features/attendance/components/attendance-month";
import { FeePanel } from "@/features/fees/components/fee-panel";
import { NoticesView } from "@/features/notices/components/notices-view";
import { PortalHome } from "./home";
import { ResultsView } from "./results-view";
import { useChild } from "./child-context";

/** `key` forces a clean refetch when the parent switches child. */
export const ParentHome = () => { const { childId } = useChild(); return childId ? <PortalHome key={childId} base="/parent" studentId={childId} /> : null; };
export const ParentAttendance = () => { const { childId } = useChild(); return childId ? <AttendanceMonth key={childId} studentId={childId} /> : null; };
export const ParentResults = () => { const { childId } = useChild(); return childId ? <ResultsView key={childId} studentId={childId} /> : null; };
export const ParentFees = () => { const { childId } = useChild(); return childId ? <FeePanel key={childId} studentId={childId} /> : null; };
export const ParentNotices = () => <NoticesView canWrite={false} />;
