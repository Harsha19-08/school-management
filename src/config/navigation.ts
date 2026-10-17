import type { Permission, Role } from "@/lib/authorization/permissions";

export interface NavItem { href: string; label: string; icon: string; perm?: Permission; roles?: Role[] }

/** Only real, built pages are listed here — there are no placeholder routes. */
export const NAV: Record<"admin" | "teacher" | "student" | "parent", NavItem[]> = {
  admin: [
    { href: "/admin", label: "Dashboard", icon: "layout-dashboard" },
    { href: "/admin/platform", label: "Platform", icon: "building-2", roles: ["super_admin"] },
    { href: "/admin/students", label: "Students", icon: "graduation-cap", perm: "student.read" },
    { href: "/admin/admissions", label: "Admissions", icon: "user-plus", perm: "admission.read" },
    { href: "/admin/academics", label: "Academics", icon: "book-open", perm: "academics.read" },
    { href: "/admin/attendance", label: "Attendance", icon: "calendar-check", perm: "attendance.read" },
    { href: "/admin/exams", label: "Exams", icon: "clipboard-list", perm: "exam.read" },
    { href: "/admin/fees", label: "Fees", icon: "indian-rupee", perm: "fee.read" },
    { href: "/admin/events", label: "Events", icon: "party-popper", perm: "event.read" },
    { href: "/admin/communication", label: "Communication", icon: "megaphone", perm: "notice.read" },
    { href: "/admin/documents", label: "Documents", icon: "folder", perm: "document.read" },
    { href: "/admin/reports", label: "Reports", icon: "bar-chart-3", perm: "report.read" },
    { href: "/admin/settings", label: "Settings", icon: "settings", perm: "school.settings" },
  ],
  teacher: [
    { href: "/teacher", label: "Dashboard", icon: "layout-dashboard" },
    { href: "/teacher/classes", label: "My classes", icon: "users" },
    { href: "/teacher/attendance", label: "Attendance", icon: "calendar-check" },
    { href: "/teacher/assignments", label: "Assignments", icon: "file-text" },
    { href: "/teacher/marks", label: "Marks", icon: "clipboard-list" },
    { href: "/teacher/timetable", label: "Timetable", icon: "clock" },
    { href: "/teacher/notices", label: "Notices", icon: "megaphone" },
    { href: "/teacher/profile", label: "Profile", icon: "user" },
  ],
  student: [
    { href: "/student", label: "Home", icon: "home" },
    { href: "/student/attendance", label: "Attendance", icon: "calendar-check" },
    { href: "/student/timetable", label: "Timetable", icon: "clock" },
    { href: "/student/assignments", label: "Work", icon: "file-text" },
    { href: "/student/results", label: "Results", icon: "award" },
    { href: "/student/fees", label: "Fees", icon: "indian-rupee" },
    { href: "/student/more", label: "More", icon: "menu" },
  ],
  parent: [
    { href: "/parent", label: "Home", icon: "home" },
    { href: "/parent/attendance", label: "Attendance", icon: "calendar-check" },
    { href: "/parent/results", label: "Results", icon: "award" },
    { href: "/parent/fees", label: "Fees", icon: "indian-rupee" },
    { href: "/parent/notices", label: "Notices", icon: "megaphone" },
  ],
};
