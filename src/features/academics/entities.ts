import { z } from "zod";
import type { Model } from "mongoose";
import { conflict } from "@/lib/api/errors";
import { scoped, type Ctx } from "@/lib/authorization/context";
import { AcademicYear, Admission, Exam, SchoolClass, Section, Student, Subject, Teacher, Timetable } from "@/models";
import { assertClass, assertTeacher } from "./refs";

const oid = z.string().regex(/^[a-f\d]{24}$/i, "Invalid id");
const optOid = oid.optional().or(z.literal("").transform(() => undefined));

export interface Entity {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  model: Model<any>; label: string; schema: z.ZodObject<z.ZodRawShape>; sort: Record<string, 1 | -1>;
  before?: (ctx: Ctx, data: Record<string, unknown>) => Promise<void>;
  after?: (ctx: Ctx, doc: { _id: unknown }, data: Record<string, unknown>) => Promise<void>;
  guardDelete?: (ctx: Ctx, id: string) => Promise<void>;
}

const dateStr = z.coerce.date();

export const ENTITIES: Record<string, Entity> = {
  years: {
    model: AcademicYear, label: "Academic year", sort: { startDate: -1 },
    schema: z.object({ label: z.string().trim().min(3).max(20), startDate: dateStr, endDate: dateStr, current: z.boolean().default(false) })
      .refine((d) => d.endDate > d.startDate, { message: "End date must be after start date", path: ["endDate"] }) as unknown as z.ZodObject<z.ZodRawShape>,
    after: async (ctx, doc, data) => { if (data.current) await AcademicYear.updateMany({ ...scoped(ctx), _id: { $ne: doc._id } }, { current: false }); },
    guardDelete: async (ctx, id) => {
      const y = await AcademicYear.findOne({ _id: id, ...scoped(ctx) }).lean();
      if (y?.current) throw conflict("You cannot delete the current academic year.");
      if (await Exam.exists({ ...scoped(ctx), academicYearId: id })) throw conflict("This year has exams and cannot be deleted.");
    },
  },
  classes: {
    model: SchoolClass, label: "Class", sort: { grade: 1 },
    schema: z.object({ name: z.string().trim().min(1).max(40), grade: z.coerce.number().int().min(0).max(14), classTeacherId: optOid }),
    before: async (ctx, d) => { await assertTeacher(ctx, d.classTeacherId as string | undefined); },
    guardDelete: async (ctx, id) => {
      if (await Section.exists({ ...scoped(ctx), classId: id })) throw conflict("Remove this class's sections first.");
      if (await Student.exists({ ...scoped(ctx), classId: id })) throw conflict("Students are enrolled in this class.");
    },
  },
  sections: {
    model: Section, label: "Section", sort: { classId: 1, name: 1 },
    schema: z.object({ classId: oid, name: z.string().trim().min(1).max(10), capacity: z.coerce.number().int().min(1).max(200).default(40), classTeacherId: optOid, room: z.string().trim().max(30).optional() }),
    before: async (ctx, d) => { await assertClass(ctx, d.classId as string | undefined); await assertTeacher(ctx, d.classTeacherId as string | undefined); },
    guardDelete: async (ctx, id) => {
      if (await Student.exists({ ...scoped(ctx), sectionId: id })) throw conflict("Students are assigned to this section.");
      await Timetable.deleteMany({ ...scoped(ctx), sectionId: id });
    },
  },
  subjects: {
    model: Subject, label: "Subject", sort: { name: 1 },
    schema: z.object({ name: z.string().trim().min(2).max(60), code: z.string().trim().min(1).max(12).transform((s) => s.toUpperCase()) }),
    guardDelete: async (ctx, id) => {
      if (await Teacher.exists({ ...scoped(ctx), "assignments.subjectId": id })) throw conflict("A teacher is assigned to this subject.");
      if (await Timetable.exists({ ...scoped(ctx), subjectId: id })) throw conflict("This subject is on a timetable.");
      if (await Exam.exists({ ...scoped(ctx), "subjects.subjectId": id })) throw conflict("This subject is used in an exam.");
    },
  },
};

export const guardAdmissionsForClass = async (ctx: Ctx, classId: string) => { if (await Admission.exists({ ...scoped(ctx), classId })) throw conflict("Admission applications reference this class."); };
