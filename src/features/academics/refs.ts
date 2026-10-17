import { Types, type Model } from "mongoose";
import { notFound } from "@/lib/api/errors";
import { scoped, type Ctx } from "@/lib/authorization/context";
import { AcademicYear, SchoolClass, Section, Subject, Teacher } from "@/models";

/** Every referenced id must belong to the caller's school — foreign ids look like missing records. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function assertOwned(ctx: Pick<Ctx, "schoolId">, model: Model<any>, id: string | undefined | null, what: string) {
  if (!id) return;
  if (!Types.ObjectId.isValid(id) || !(await model.exists({ _id: id, ...scoped(ctx) }))) throw notFound(what);
}
export const assertClass = (c: Pick<Ctx, "schoolId">, id?: string | null) => assertOwned(c, SchoolClass, id, "Class");
export const assertSection = (c: Pick<Ctx, "schoolId">, id?: string | null) => assertOwned(c, Section, id, "Section");
export const assertSubject = (c: Pick<Ctx, "schoolId">, id?: string | null) => assertOwned(c, Subject, id, "Subject");
export const assertTeacher = (c: Pick<Ctx, "schoolId">, id?: string | null) => assertOwned(c, Teacher, id, "Teacher");
export const assertYear = (c: Pick<Ctx, "schoolId">, id?: string | null) => assertOwned(c, AcademicYear, id, "Academic year");

/** Verifies the section really belongs to the given class (used by student/admission forms). */
export async function assertSectionInClass(ctx: Pick<Ctx, "schoolId">, classId: string, sectionId: string) {
  await assertClass(ctx, classId);
  if (!Types.ObjectId.isValid(sectionId) || !(await Section.exists({ _id: sectionId, classId, ...scoped(ctx) }))) throw notFound("Section");
}
