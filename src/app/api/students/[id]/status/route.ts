import { body, route } from "@/lib/api/route";
import { notFound } from "@/lib/api/errors";
import { scoped } from "@/lib/authorization/context";
import { Membership, Student, User } from "@/models";
import { statusSchema } from "@/features/students/schemas";
import { audit } from "@/lib/audit";

/** Soft state change only — students are never hard-deleted. Non-active students lose portal access. */
export const POST = route<{ id: string }>({ perm: "student.write" }, async ({ req, ctx, params }) => {
  const { status, note } = await body(req, statusSchema);
  const s = await Student.findOneAndUpdate({ _id: params.id, ...scoped(ctx) }, { status, $push: { history: { by: ctx.userId, action: `status:${status}`, note } } }, { returnDocument: "after" });
  if (!s) throw notFound("Student");
  if (s.userId) {
    await Membership.updateOne({ userId: s.userId, schoolId: ctx.schoolId, role: "student" }, { active: status === "active" });
    if (status !== "active") await User.updateOne({ _id: s.userId }, { $inc: { tokenVersion: 1 } });
  }
  await audit(ctx, "student.status", "Student", s._id, { status });
  return { id: String(s._id), status };
});
