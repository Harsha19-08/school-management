import { route } from "@/lib/api/route";
import { scoped } from "@/lib/authorization/context";
import { Section, SchoolClass, Student } from "@/models";
import { Types } from "mongoose";

/** Only the guardian's own linked children, resolved from the verified membership. */
export const GET = route({ roles: ["parent"] }, async ({ ctx }) => {
  const kids = await Student.find({ ...scoped(ctx), _id: { $in: ctx.childIds.map((i) => new Types.ObjectId(i)) }, status: "active" }).select("firstName lastName classId sectionId admissionNo").lean();
  const [cls, secs] = await Promise.all([SchoolClass.find(scoped(ctx)).select("name").lean(), Section.find(scoped(ctx)).select("name").lean()]);
  const cn = new Map(cls.map((c) => [String(c._id), c.name])); const sn = new Map(secs.map((s) => [String(s._id), s.name]));
  return kids.map((k) => ({ id: String(k._id), name: `${k.firstName} ${k.lastName}`, admissionNo: k.admissionNo, class: `${cn.get(String(k.classId)) ?? ""} ${sn.get(String(k.sectionId)) ?? ""}`.trim() }));
});
