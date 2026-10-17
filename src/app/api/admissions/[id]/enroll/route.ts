import { Types } from "mongoose";
import { body, route } from "@/lib/api/route";
import { conflict, notFound } from "@/lib/api/errors";
import { scoped } from "@/lib/authorization/context";
import { AcademicYear, Admission, Enrollment, Guardian, Student } from "@/models";
import { enrollSchema } from "@/features/admissions/schemas";
import { assertSectionInClass } from "@/features/academics/refs";
import { nextAdmissionNo, nextRollNo } from "@/features/students/queries";
import { audit } from "@/lib/audit";

/**
 * Approved → enrolled. The application is claimed first (atomic CAS) with a pre-generated student id, so a double-click or
 * concurrent request can never create two students. Anything created is cleaned up if a later step fails.
 */
export const POST = route<{ id: string }>({ perm: "admission.decide" }, async ({ req, ctx, params }) => {
  const { sectionId } = await body(req, enrollSchema);
  const app = await Admission.findOne({ _id: params.id, ...scoped(ctx) }).lean();
  if (!app) throw notFound("Application");
  await assertSectionInClass(ctx, String(app.classId), sectionId);
  const studentId = new Types.ObjectId();
  const claimed = await Admission.findOneAndUpdate({ _id: params.id, ...scoped(ctx), status: "approved" }, { status: "enrolled", enrolledStudentId: studentId, $push: { history: { by: ctx.userId, from: "approved", to: "enrolled" } } }, { returnDocument: "after" });
  if (!claimed) throw conflict("Only approved applications that are not yet enrolled can be enrolled.");
  let student = false; let guardianId: Types.ObjectId | undefined;
  try {
    const admissionNo = await nextAdmissionNo(ctx.schoolId, ctx.schoolSlug);
    await Student.create({ _id: studentId, ...scoped(ctx), admissionNo, firstName: app.student.firstName, lastName: app.student.lastName, gender: app.student.gender, dob: app.student.dob, classId: app.classId, sectionId, rollNo: await nextRollNo(ctx.schoolId, sectionId), admissionDate: new Date(), history: [{ by: ctx.userId, action: `enrolled from ${app.applicationNo}` }] });
    student = true;
    const g = await Guardian.create({ ...scoped(ctx), name: app.guardian.name, phone: app.guardian.phone, email: app.guardian.email, studentIds: [studentId] });
    guardianId = g._id as Types.ObjectId;
    const year = await AcademicYear.findOne({ ...scoped(ctx), current: true }).select("_id").lean();
    if (year) await Enrollment.create({ ...scoped(ctx), studentId, academicYearId: year._id, classId: app.classId, sectionId, rollNo: undefined });
    await audit(ctx, "admission.enroll", "Admission", app._id, { studentId: String(studentId) });
    return { studentId: String(studentId) };
  } catch (e) {
    if (guardianId) await Guardian.deleteOne({ _id: guardianId });
    if (student) await Student.deleteOne({ _id: studentId });
    await Enrollment.deleteMany({ studentId, ...scoped(ctx) });
    await Admission.updateOne({ _id: params.id, ...scoped(ctx) }, { status: "approved", $unset: { enrolledStudentId: 1 } });
    throw e;
  }
});
