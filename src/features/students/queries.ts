import { Types } from "mongoose";
import { can, scoped, type Ctx } from "@/lib/authorization/context";
import { forbidden } from "@/lib/api/errors";
import { SchoolClass, Section, Student, Teacher } from "@/models";

/** Section ids a teacher may see: assigned sections plus any they are class teacher of. */
export async function teacherSectionIds(ctx: Pick<Ctx, "schoolId" | "teacherId">): Promise<Types.ObjectId[]> {
  if (!ctx.teacherId) return [];
  const [t, ct, classTeacherClasses] = await Promise.all([
    Teacher.findOne({ _id: ctx.teacherId, ...scoped(ctx) }).select("assignments").lean(),
    Section.find({ ...scoped(ctx), classTeacherId: ctx.teacherId }).select("_id").lean(),
    SchoolClass.find({ ...scoped(ctx), classTeacherId: ctx.teacherId }).select("_id").lean(),
  ]);
  const ids = new Map<string, Types.ObjectId>();
  for (const a of t?.assignments ?? []) ids.set(String(a.sectionId), a.sectionId as Types.ObjectId);
  for (const s of ct) ids.set(String(s._id), s._id as Types.ObjectId);
  if (classTeacherClasses.length) {
    const sections = await Section.find({ ...scoped(ctx), classId: { $in: classTeacherClasses.map((c) => c._id) } }).select("_id").lean();
    for (const s of sections) ids.set(String(s._id), s._id as Types.ObjectId);
  }
  return [...ids.values()];
}

/** Base Mongo filter for the students this caller may read. Staff: whole school. Teacher: own sections. Others: none. */
export async function studentScope(ctx: Ctx): Promise<Record<string, unknown>> {
  if (!can(ctx, "student.read")) throw forbidden();
  if (ctx.role === "teacher") return { ...scoped(ctx), sectionId: { $in: await teacherSectionIds(ctx) } };
  return scoped(ctx);
}

export async function nextAdmissionNo(schoolId: string, slug: string): Promise<string> {
  const { School } = await import("@/models");
  const prefix = slug === "das" ? "DAS" : "SMH";
  for (;;) {
    const s = await School.findOneAndUpdate({ _id: schoolId }, { $inc: { "counters.admission": 1 } }, { returnDocument: "after" }).select("counters").lean();
    const number = s?.counters?.admission ?? 1;
    const admissionNo = `${prefix}-${new Date().getFullYear()}-${String(number).padStart(4, "0")}`;
    if (!(await Student.exists({ schoolId, admissionNo }))) return admissionNo;
  }
}

export async function nextRollNo(schoolId: string, sectionId: string): Promise<number> {
  const last = await Student.findOne({ schoolId, sectionId }).sort({ rollNo: -1 }).select("rollNo").lean();
  return (last?.rollNo ?? 0) + 1;
}

export const studentDto = (s: { _id: unknown; admissionNo: string; firstName: string; lastName: string; gender: string; dob: Date; classId: unknown; sectionId: unknown; rollNo?: number | null; status: string; phone?: string | null; email?: string | null; userId?: unknown }) => ({
  id: String(s._id), admissionNo: s.admissionNo, firstName: s.firstName, lastName: s.lastName, name: `${s.firstName} ${s.lastName}`, gender: s.gender, dob: s.dob,
  classId: String(s.classId), sectionId: String(s.sectionId), rollNo: s.rollNo ?? undefined, status: s.status, phone: s.phone ?? undefined, email: s.email ?? undefined, hasAccount: !!s.userId,
});
