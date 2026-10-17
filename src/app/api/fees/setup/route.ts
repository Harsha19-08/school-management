import { body, route } from "@/lib/api/route";
import { scoped } from "@/lib/authorization/context";
import { FeeCategory, FeeStructure } from "@/models";
import { categorySchema, structureSchema } from "@/features/fees/schemas";
import { assertClass, assertYear } from "@/features/academics/refs";
import { assertOwned } from "@/features/academics/refs";
import { audit } from "@/lib/audit";
import { z } from "zod";

export const GET = route({ perm: "fee.read" }, async ({ ctx }) => {
  const [categories, structures] = await Promise.all([FeeCategory.find(scoped(ctx)).sort({ name: 1 }).lean(), FeeStructure.find(scoped(ctx)).sort({ createdAt: -1 }).lean()]);
  return {
    categories: categories.map((c) => ({ id: String(c._id), name: c.name, frequency: c.frequency })),
    structures: structures.map((s) => ({ id: String(s._id), academicYearId: String(s.academicYearId), categoryId: String(s.categoryId), classIds: s.classIds.map(String), amountPaise: s.amountPaise, installments: s.installments.map((i: { label?: string | null; dueDate?: Date | null; amountPaise?: number | null }) => ({ label: i.label, dueDate: i.dueDate, amountPaise: i.amountPaise })) })),
  };
});

const wrap = z.discriminatedUnion("kind", [z.object({ kind: z.literal("category"), data: categorySchema }), z.object({ kind: z.literal("structure"), data: structureSchema })]);
export const POST = route({ perm: "fee.write" }, async ({ req, ctx }) => {
  const b = await body(req, wrap);
  if (b.kind === "category") { const c = await FeeCategory.create({ ...scoped(ctx), ...b.data }); await audit(ctx, "fee.category.create", "FeeCategory", c._id); return { id: String(c._id) }; }
  const d = b.data;
  await assertYear(ctx, d.academicYearId); await assertOwned(ctx, FeeCategory, d.categoryId, "Fee category");
  for (const c of d.classIds) await assertClass(ctx, c);
  const s = await FeeStructure.create({ ...scoped(ctx), academicYearId: d.academicYearId, categoryId: d.categoryId, classIds: d.classIds, amountPaise: d.amount, installments: d.installments.map((i) => ({ label: i.label, dueDate: i.dueDate, amountPaise: i.amount })) });
  await audit(ctx, "fee.structure.create", "FeeStructure", s._id);
  return { id: String(s._id) };
});
