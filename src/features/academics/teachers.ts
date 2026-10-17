import { z } from "zod";

const oid = z.string().regex(/^[a-f\d]{24}$/i);
export const teacherSchema = z.object({
  name: z.string().trim().min(2).max(80), employeeNo: z.string().trim().min(1).max(20),
  email: z.string().trim().toLowerCase().email().optional().or(z.literal("").transform(() => undefined)),
  phone: z.string().trim().max(20).optional(), qualification: z.string().trim().max(80).optional(),
  createAccount: z.boolean().default(false),
  assignments: z.array(z.object({ subjectId: oid, sectionId: oid })).max(60).default([]),
});
export const teacherUpdateSchema = teacherSchema.omit({ createAccount: true, employeeNo: true }).partial().extend({ status: z.enum(["active", "inactive"]).optional() });
