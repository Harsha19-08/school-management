import { body, route } from "@/lib/api/route";
import { notFound } from "@/lib/api/errors";
import { scoped } from "@/lib/authorization/context";
import { Guardian, Student } from "@/models";
import { accountSchema } from "@/features/students/schemas";
import { createAccount } from "@/services/accounts";
import { audit } from "@/lib/audit";

/** Creates a portal login for the student, or for a guardian (parent) linked to them. Returns a one-time activation link. */
export const POST = route<{ id: string }>({ perm: "user.manage" }, async ({ req, ctx, params }) => {
  const d = await body(req, accountSchema);
  const s = await Student.findOne({ _id: params.id, ...scoped(ctx) });
  if (!s) throw notFound("Student");
  if (d.role === "student") {
    const acc = await createAccount({ schoolId: ctx.schoolId, role: "student", name: `${s.firstName} ${s.lastName}`, email: d.email, link: { studentId: String(s._id) } });
    s.userId = acc.userId as never; await s.save();
    await audit(ctx, "student.account", "Student", s._id, { role: "student" });
    return { activationPath: acc.activationPath };
  }
  const g = await Guardian.findOne({ ...scoped(ctx), studentIds: s._id });
  if (!g) throw notFound("Guardian");
  const acc = await createAccount({ schoolId: ctx.schoolId, role: "parent", name: g.name, email: d.email, link: { guardianId: String(g._id) } });
  g.userId = acc.userId as never; if (!g.email) g.email = d.email; await g.save();
  await audit(ctx, "student.account", "Student", s._id, { role: "parent" });
  return { activationPath: acc.activationPath };
});
