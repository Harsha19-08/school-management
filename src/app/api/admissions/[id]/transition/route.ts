import { body, route } from "@/lib/api/route";
import { conflict, notFound } from "@/lib/api/errors";
import { can, scoped } from "@/lib/authorization/context";
import { forbidden } from "@/lib/api/errors";
import { Admission } from "@/models";
import { TRANSITIONS, type AdmissionStatus } from "@/features/admissions/logic";
import { transitionSchema } from "@/features/admissions/schemas";
import { audit } from "@/lib/audit";

/** State machine with atomic compare-and-set: two reviewers racing cannot both apply a transition. */
export const POST = route<{ id: string }>({ perm: "admission.write" }, async ({ req, ctx, params }) => {
  const { to, note } = await body(req, transitionSchema);
  if ((to === "approved" || to === "rejected") && !can(ctx, "admission.decide")) throw forbidden();
  const cur = await Admission.findOne({ _id: params.id, ...scoped(ctx) }).select("status").lean();
  if (!cur) throw notFound("Application");
  const from = cur.status as AdmissionStatus;
  if (!TRANSITIONS[from].includes(to)) throw conflict(`Cannot move an application from ${from.replace("_", " ")} to ${to.replace("_", " ")}.`);
  const upd = await Admission.findOneAndUpdate(
    { _id: params.id, ...scoped(ctx), status: from },
    { status: to, ...(to === "approved" || to === "rejected" ? { decisionNote: note, decidedBy: ctx.userId } : {}), $push: { history: { by: ctx.userId, from, to, note } } }, { returnDocument: "after" },
  );
  if (!upd) throw conflict("This application was just updated by someone else. Refresh and try again.");
  await audit(ctx, "admission.transition", "Admission", upd._id, { from, to });
  return { id: String(upd._id), status: upd.status };
});
