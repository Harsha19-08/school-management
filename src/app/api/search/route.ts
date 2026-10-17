import { escapeRegex, query, route } from "@/lib/api/route";
import { z } from "zod";
import { can, scoped } from "@/lib/authorization/context";
import { Student, Teacher } from "@/models";

/** Global search, limited to what the caller may already read, always within their own school. */
export const GET = route({ roles: ["super_admin", "school_admin", "teacher"] }, async ({ req, ctx }) => {
  const { q } = query(req, z.object({ q: z.string().trim().min(2).max(60) }));
  const rx = new RegExp(escapeRegex(q), "i");
  const out: { type: string; id: string; label: string; sub?: string; href: string }[] = [];
  if (can(ctx, "student.read") && ctx.role !== "teacher") {
    const s = await Student.find({ ...scoped(ctx), $or: [{ firstName: rx }, { lastName: rx }, { admissionNo: rx }] }).limit(6).select("firstName lastName admissionNo").lean();
    out.push(...s.map((x) => ({ type: "student", id: String(x._id), label: `${x.firstName} ${x.lastName}`, sub: x.admissionNo, href: `/admin/students/${x._id}` })));
  }
  if (can(ctx, "teacher.read") && ctx.role !== "teacher") {
    const t = await Teacher.find({ ...scoped(ctx), $or: [{ name: rx }, { employeeNo: rx }] }).limit(4).select("name employeeNo").lean();
    out.push(...t.map((x) => ({ type: "teacher", id: String(x._id), label: x.name, sub: x.employeeNo, href: "/admin/academics?tab=teachers" })));
  }
  return out;
});
