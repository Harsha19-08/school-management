import { route } from "@/lib/api/route";
import { conflict, notFound } from "@/lib/api/errors";
import { scoped } from "@/lib/authorization/context";
import { Exam, Result, Student, Guardian, Membership } from "@/models";
import { notify } from "@/services/notify";
import { audit } from "@/lib/audit";

/** Publishing is atomic and one-way. It refuses while any active student in the class still lacks a mark/absence. */
export const POST = route<{ id: string }>({ perm: "results.publish" }, async ({ ctx, params }) => {
  const exam = await Exam.findOne({ _id: params.id, ...scoped(ctx) }).lean();
  if (!exam) throw notFound("Exam");
  if (exam.status === "published") throw conflict("Already published.");
  const students = await Student.find({ ...scoped(ctx), classId: exam.classId, status: "active" }).select("_id userId").lean();
  const expected = students.length * exam.subjects.length;
  const have = await Result.countDocuments({ ...scoped(ctx), examId: exam._id, studentId: { $in: students.map((s) => s._id) } });
  if (students.length === 0) throw conflict("This class has no active students.");
  if (have < expected) throw conflict(`${expected - have} mark(s) are still missing. Enter marks or mark students absent before publishing.`);
  const done = await Exam.findOneAndUpdate({ _id: exam._id, ...scoped(ctx), status: { $ne: "published" } }, { status: "published", publishedAt: new Date(), publishedBy: ctx.userId }, { returnDocument: "after" });
  if (!done) throw conflict("Already published.");
  const ids = students.map((s) => s._id);
  const guardians = await Guardian.find({ ...scoped(ctx), studentIds: { $in: ids } }).select("userId").lean();
  const users = [...students.map((s) => s.userId), ...guardians.map((g) => g.userId)].filter(Boolean).map(String);
  await notify({ schoolId: ctx.schoolId, userIds: users, title: `Results published: ${exam.name}`, link: "/student/results", kind: "results" });
  void Membership;
  await audit(ctx, "exam.publish", "Exam", exam._id);
  return { id: String(exam._id), status: "published" };
});
