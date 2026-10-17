import { z } from "zod";
import { dobSchema } from "@/features/students/schemas";

const oid = z.string().regex(/^[a-f\d]{24}$/i);
const opt = (n: number) => z.string().trim().max(n).optional().or(z.literal("").transform(() => undefined));
export const admissionSchema = z.object({
  student: z.object({ firstName: z.string().trim().min(1).max(50), lastName: z.string().trim().min(1).max(50), gender: z.enum(["male", "female", "other"]), dob: dobSchema }),
  guardian: z.object({ name: z.string().trim().min(2).max(80), phone: z.string().trim().regex(/^[0-9+\-\s]{7,15}$/, "Enter a valid phone number"), email: z.string().trim().toLowerCase().email().optional().or(z.literal("").transform(() => undefined)) }),
  classId: oid, previousSchool: opt(120), submit: z.boolean().default(false),
});
export const admissionUpdateSchema = admissionSchema.omit({ submit: true }).partial();
export const transitionSchema = z.object({ to: z.enum(["submitted", "under_review", "approved", "rejected"]), note: opt(300) });
export const enrollSchema = z.object({ sectionId: oid });
