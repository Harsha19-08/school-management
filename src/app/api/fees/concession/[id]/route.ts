import { body, route } from "@/lib/api/route";
import { conflict, notFound } from "@/lib/api/errors";
import { scoped } from "@/lib/authorization/context";
import { StudentFee } from "@/models";
import { concessionSchema } from "@/features/fees/schemas";
import { statusOf } from "@/services/fees";
import { audit } from "@/lib/audit";

/** Sets a concession on one fee. It can never push the fee below what has already been paid. */
export const POST = route<{ id: string }>({ perm: "fee.write" }, async ({ req, ctx, params }) => {
  const d = await body(req, concessionSchema);
  const fee = await StudentFee.findOne({ _id: params.id, ...scoped(ctx) });
  if (!fee) throw notFound("Fee");
  if (d.amount > fee.amountPaise) throw conflict("Concession cannot exceed the fee amount.");
  if (fee.amountPaise - d.amount < (fee.paidPaise ?? 0)) throw conflict("This would put the fee below what is already paid. Reverse a payment first.");
  fee.concessionPaise = d.amount; fee.concessionReason = d.reason; fee.concessionBy = ctx.userId as never; fee.status = statusOf(fee);
  await fee.save();
  await audit(ctx, "fee.concession", "StudentFee", fee._id, { amountPaise: d.amount, reason: d.reason });
  return { id: String(fee._id) };
});
