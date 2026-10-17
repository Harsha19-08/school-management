import { z } from "zod";
import { Types } from "mongoose";
import { body, route } from "@/lib/api/route";
import { notFound } from "@/lib/api/errors";
import { School, User } from "@/models";
import { setSessionCookie } from "@/lib/auth/session";
import { audit } from "@/lib/audit";

/** Super-admin only: re-signs the session cookie for another school. Everyone else is bound to their memberships. */
export const POST = route({ roles: ["super_admin"] }, async ({ req, ctx }) => {
  const { schoolId } = await body(req, z.object({ schoolId: z.string().refine(Types.ObjectId.isValid) }));
  const school = await School.findOne({ _id: schoolId, active: true }).lean();
  if (!school) throw notFound("School");
  const user = await User.findById(ctx.userId).select("tokenVersion").lean();
  await setSessionCookie({ uid: ctx.userId, tv: user?.tokenVersion ?? 0, sid: String(school._id) }, false);
  await audit(ctx, "auth.switch_school", "School", school._id, { to: school.slug });
  return { redirect: "/admin" };
});
