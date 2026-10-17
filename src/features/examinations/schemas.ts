import { z } from "zod";

const oid = z.string().regex(/^[a-f\d]{24}$/i);
const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).optional().or(z.literal("").transform(() => undefined));
export const examSubjectSchema = z.object({ subjectId: oid, maxMarks: z.coerce.number().min(1).max(1000), passMarks: z.coerce.number().min(0), date: z.coerce.date().optional().or(z.literal("").transform(() => undefined)), start: time, end: time, room: z.string().trim().max(20).optional() })
  .refine((s) => s.passMarks <= s.maxMarks, { message: "Pass marks cannot exceed max marks", path: ["passMarks"] });
export const examSchema = z.object({
  name: z.string().trim().min(2).max(80), type: z.enum(["unit_test", "midterm", "final", "practical", "other"]).default("unit_test"),
  academicYearId: oid, term: z.string().trim().min(1).max(30), classId: oid,
  subjects: z.array(examSubjectSchema).min(1, "Add at least one subject").max(20)
    .refine((a) => new Set(a.map((s) => s.subjectId)).size === a.length, "Each subject can appear only once"),
});
export const examUpdateSchema = z.object({ name: z.string().trim().min(2).max(80).optional(), term: z.string().trim().min(1).max(30).optional(), status: z.enum(["draft", "scheduled", "marks_open"]).optional(), subjects: examSchema.shape.subjects.optional() });
export const marksSchema = z.object({
  sectionId: oid, subjectId: oid,
  entries: z.array(z.object({ studentId: oid, marks: z.number().min(0).nullable().optional(), absent: z.boolean().optional() })).min(1).max(300),
});
export const correctSchema = z.object({ studentId: oid, subjectId: oid, marks: z.number().min(0), reason: z.string().trim().min(3).max(200) });
