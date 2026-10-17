import { body, route } from "@/lib/api/route";
import { reverseSchema } from "@/features/fees/schemas";
import { reversePayment } from "@/services/fees";
import { audit } from "@/lib/audit";

export const POST = route<{ id: string }>({ perm: "fee.reverse" }, async ({ req, ctx, params }) => {
  const { reason } = await body(req, reverseSchema);
  const r = await reversePayment({ schoolId: ctx.schoolId, paymentId: params.id, reason, by: ctx.userId });
  await audit(ctx, "fee.reverse", "Payment", params.id, { reason });
  return { id: String(r._id) };
});
