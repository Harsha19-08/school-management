import { route } from "@/lib/api/route";
import { Student } from "@/models";
import { studentScope } from "@/features/students/queries";
import { csvResponse, toCsv } from "@/features/reporting/csv";
import { audit } from "@/lib/audit";

export const GET = route({ perm: "student.export" }, async ({ ctx }) => {
  const rows = await Student.find(await studentScope(ctx)).sort({ firstName: 1 }).populate("classId", "name").populate("sectionId", "name").lean();
  await audit(ctx, "student.export", "Student", undefined, { count: rows.length });
  return csvResponse(`students-${ctx.schoolSlug}.csv`, toCsv(
    ["Admission No", "First name", "Last name", "Gender", "DOB", "Class", "Section", "Roll", "Status", "Phone"],
    rows.map((s) => [s.admissionNo, s.firstName, s.lastName, s.gender, s.dob, (s.classId as unknown as { name?: string })?.name, (s.sectionId as unknown as { name?: string })?.name, s.rollNo, s.status, s.phone]),
  ));
});
