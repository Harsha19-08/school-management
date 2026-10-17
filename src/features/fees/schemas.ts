import { z } from "zod";
import { toPaise } from "@/lib/money";

const oid = z.string().regex(/^[a-f\d]{24}$/i);
/** Accepts rupees as typed by a human ("1,250.50") and converts to integer paise; never floats. */
export const rupees = z.union([z.string(), z.number()]).transform((v, ctx) => {
  try { const p = toPaise(typeof v === "string" ? v.replace(/[,₹\s]/g, "") : v); if (p < 0) throw new Error(); return p; } catch { ctx.addIssue({ code: "custom", message: "Enter a valid amount" }); return z.NEVER; }
});
export const categorySchema = z.object({ name: z.string().trim().min(2).max(60), frequency: z.enum(["one_time", "monthly", "quarterly", "term", "yearly"]).default("yearly") });
export const structureSchema = z.object({
  academicYearId: oid, categoryId: oid, classIds: z.array(oid).min(1, "Pick at least one class"), amount: rupees,
  installments: z.array(z.object({ label: z.string().trim().min(1).max(40), dueDate: z.coerce.date(), amount: rupees })).max(12).default([]),
}).refine((d) => d.installments.length === 0 || d.installments.reduce((a, i) => a + i.amount, 0) === d.amount, { message: "Installments must add up to the total amount", path: ["installments"] });
export const generateSchema = z.object({ structureId: oid, defaultDueDate: z.coerce.date().optional() });
export const paymentSchema = z.object({ feeId: oid, amount: rupees.refine((n) => n > 0, "Amount must be greater than zero"), mode: z.enum(["cash", "bank_transfer", "cheque"]), reference: z.string().trim().max(60).optional(), idempotencyKey: z.string().trim().min(8).max(80).optional() });
export const reverseSchema = z.object({ reason: z.string().trim().min(3).max(200) });
export const concessionSchema = z.object({ amount: rupees, reason: z.string().trim().min(3).max(200) });
