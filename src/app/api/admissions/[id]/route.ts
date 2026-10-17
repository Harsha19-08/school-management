import { body, route } from "@/lib/api/route";
import { conflict, notFound } from "@/lib/api/errors";
import { scoped } from "@/lib/authorization/context";
import { Admission } from "@/models";
import { admissionUpdateSchema } from "@/features/admissions/schemas";
import { EDITABLE, dedupeKey, type AdmissionStatus } from "@/features/admissions/logic";
import { assertClass } from "@/features/academics/refs";
import { audit } from "@/lib/audit";

export const GET = route<{ id: string }>({ perm: "admission.read" }, async ({ ctx, params }) => {
  const a = await Admission.findOne({ _id: params.id, ...scoped(ctx) }).lean();
  if (!a) throw notFound("Application");
  return { id: String(a._id), applicationNo: a.applicationNo, status: a.status, student: a.student, guardian: a.guardian, classId: String(a.classId), previousSchool: a.previousSchool, decisionNote: a.decisionNote, enrolledStudentId: a.enrolledStudentId ? String(a.enrolledStudentId) : undefined, history: a.history };
});

export const PATCH = route<{ id: string }>({ perm: "admission.write" }, async ({ req, ctx, params }) => {
  const d = await body(req, admissionUpdateSchema);
  const a = await Admission.findOne({ _id: params.id, ...scoped(ctx) });
  if (!a) throw notFound("Application");
  if (!EDITABLE.includes(a.status as AdmissionStatus)) throw conflict("Only draft or submitted applications can be edited.");
  if (d.classId) { await assertClass(ctx, d.classId); a.classId = d.classId as never; }
  if (d.student) Object.assign(a.student, d.student);
  if (d.guardian) Object.assign(a.guardian, d.guardian);
  if (d.previousSchool !== undefined) a.previousSchool = d.previousSchool;
  a.dedupeKey = dedupeKey({ firstName: a.student.firstName, lastName: a.student.lastName, dob: a.student.dob, guardianName: a.guardian.name });
  await a.save();
  await audit(ctx, "admission.update", "Admission", a._id);
  return { id: String(a._id) };
});
