import { route } from "@/lib/api/route";
import { scoped } from "@/lib/authorization/context";
import { teacherSectionIds } from "@/features/students/queries";
import { AcademicYear, SchoolClass, Section, Subject } from "@/models";

/** Lightweight structure for filters/forms; readable by every signed-in role of the school. */
export const GET = route({ roles: ["super_admin", "school_admin", "teacher"] }, async ({ ctx }) => {
  const s = scoped(ctx);
  const [years, classes, sections, subjects] = await Promise.all([
    AcademicYear.find(s).sort({ startDate: -1 }).lean(), SchoolClass.find(s).sort({ grade: 1 }).lean(),
    Section.find(s).sort({ name: 1 }).lean(), Subject.find(s).sort({ name: 1 }).lean(),
  ]);
  // Teachers only see the sections they are assigned to (and their classes).
  let secs = sections; let cls = classes;
  if (ctx.role === "teacher") { const ids = new Set((await teacherSectionIds(ctx)).map(String)); secs = sections.filter((x) => ids.has(String(x._id))); const cids = new Set(secs.map((x) => String(x.classId))); cls = classes.filter((c) => cids.has(String(c._id))); }
  return {
    years: years.map((y) => ({ id: String(y._id), label: y.label, current: y.current })),
    classes: cls.map((c) => ({ id: String(c._id), name: c.name, grade: c.grade })),
    sections: secs.map((x) => ({ id: String(x._id), classId: String(x.classId), name: x.name })),
    subjects: subjects.map((x) => ({ id: String(x._id), name: x.name, code: x.code })),
  };
});
