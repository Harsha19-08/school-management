import { z } from "zod";

const oid = z.string().regex(/^[a-f\d]{24}$/i, "Invalid id");
const optStr = (max: number) => z.string().trim().max(max).optional().or(z.literal("").transform(() => undefined));
const phone = z.string().trim().regex(/^[0-9+\-\s]{7,15}$/, "Enter a valid phone number");
export const dobSchema = z.coerce.date().refine((d) => d < new Date() && d.getFullYear() > 1990, "Enter a valid date of birth");

export const studentSchema = z.object({
  firstName: z.string().trim().min(1).max(50), lastName: z.string().trim().min(1).max(50),
  gender: z.enum(["male", "female", "other"]), dob: dobSchema,
  classId: oid, sectionId: oid, admissionNo: optStr(20), admissionDate: z.coerce.date().optional(), rollNo: z.coerce.number().int().min(1).max(500).optional(),
  phone: optStr(20), email: z.string().trim().toLowerCase().email().optional().or(z.literal("").transform(() => undefined)), address: optStr(200),
  emergencyContact: z.object({ name: optStr(60), phone: optStr(20), relation: optStr(30) }).optional(),
  guardian: z.object({ name: z.string().trim().min(2).max(80), phone, email: z.string().trim().toLowerCase().email().optional().or(z.literal("").transform(() => undefined)), relation: optStr(20) }).optional(),
});
export const studentUpdateSchema = studentSchema.omit({ classId: true, sectionId: true, admissionNo: true, guardian: true }).partial();
export const statusSchema = z.object({ status: z.enum(["active", "inactive", "transferred", "alumni", "archived"]), note: optStr(200) });
export const transferSchema = z.object({ sectionId: oid, note: optStr(200) });
export const accountSchema = z.object({ email: z.string().trim().toLowerCase().email(), role: z.enum(["student", "parent"]).default("student") });
