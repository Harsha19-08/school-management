import { body, route } from "@/lib/api/route";
import { notFound } from "@/lib/api/errors";
import { assertTeacherSection, scoped } from "@/lib/authorization/context";
import { Guardian, Student } from "@/models";
import { studentUpdateSchema } from "@/features/students/schemas";
import { studentDto } from "@/features/students/queries";
import { audit } from "@/lib/audit";

export const GET = route<{ id: string }>({ perm: "student.read" }, async ({ ctx, params }) => {
  const s = await Student.findOne({ _id: params.id, ...scoped(ctx) }).lean();
  if (!s) throw notFound("Student");
  await assertTeacherSection(ctx, String(s.sectionId));
  const guardians = await Guardian.find({ ...scoped(ctx), studentIds: s._id }).lean();
  return { ...studentDto(s), address: s.address, admissionDate: s.admissionDate, emergencyContact: s.emergencyContact, history: s.history,
    guardians: guardians.map((g) => ({ id: String(g._id), name: g.name, phone: g.phone, email: g.email, relation: g.relation, hasAccount: !!g.userId })) };
});

export const PATCH = route<{ id: string }>({ perm: "student.write" }, async ({ req, ctx, params }) => {
  const d = await body(req, studentUpdateSchema);
  const s = await Student.findOneAndUpdate({ _id: params.id, ...scoped(ctx) }, { $set: d, $push: { history: { by: ctx.userId, action: "updated" } } }, { returnDocument: "after" });
  if (!s) throw notFound("Student");
  await audit(ctx, "student.update", "Student", s._id, { fields: Object.keys(d) });
  return { id: String(s._id) };
});
