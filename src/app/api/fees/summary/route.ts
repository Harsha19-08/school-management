import { z } from "zod";
import { query, route } from "@/lib/api/route";
import { resolveStudentScope } from "@/lib/authorization/context";
import { feeSummary } from "@/services/fees";

/** The single FeeSummary contract used by admin profile, student and parent views. */
export const GET = route({}, async ({ req, ctx }) => {
  const { studentId } = query(req, z.object({ studentId: z.string().optional() }));
  return feeSummary(ctx.schoolId, await resolveStudentScope(ctx, studentId));
});
