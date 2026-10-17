import { route } from "@/lib/api/route";
import { scoped } from "@/lib/authorization/context";
import { Admission, Attendance, Exam, Payment, SchoolEvent, Student, StudentFee, Teacher } from "@/models";
import { schoolDate } from "@/lib/dates";
import { Types } from "mongoose";

/** Real aggregates for the active school only. Numbers with no data come back as null/0, never invented. */
export const GET = route({ roles: ["super_admin", "school_admin"] }, async ({ ctx }) => {
  const s = scoped(ctx); const today = schoolDate(new Date(), ctx.timeZone); const sid = new Types.ObjectId(ctx.schoolId);
  const [students, teachers, pendingAdm, attToday, feeAgg, collected, upcoming, openExams] = await Promise.all([
    Student.countDocuments({ ...s, status: "active" }), Teacher.countDocuments({ ...s, status: "active" }), Admission.countDocuments({ ...s, status: { $in: ["submitted", "under_review", "approved"] } }),
    Attendance.aggregate([{ $match: { schoolId: sid, date: today } }, { $group: { _id: "$status", n: { $sum: 1 } } }]),
    StudentFee.aggregate([{ $match: { schoolId: sid } }, { $group: { _id: null, net: { $sum: { $subtract: ["$amountPaise", "$concessionPaise"] } }, paid: { $sum: "$paidPaise" } } }]),
    Payment.aggregate([{ $match: { schoolId: sid, status: "success", paidOn: { $gte: new Date(Date.now() - 30 * 86_400_000) } } }, { $group: { _id: "$kind", n: { $sum: "$amountPaise" } } }]),
    SchoolEvent.find({ ...s, status: "published", startsAt: { $gte: new Date() } }).sort({ startsAt: 1 }).limit(4).select("title startsAt venue").lean(),
    Exam.countDocuments({ ...s, status: { $in: ["scheduled", "marks_open"] } }),
  ]);
  const att = Object.fromEntries(attToday.map((a: { _id: string; n: number }) => [a._id, a.n])) as Record<string, number>;
  const present = (att.present ?? 0) + (att.late ?? 0); const denom = present + (att.absent ?? 0);
  const net = feeAgg[0]?.net ?? 0; const paid = feeAgg[0]?.paid ?? 0;
  const c = Object.fromEntries(collected.map((x: { _id: string; n: number }) => [x._id, x.n])) as Record<string, number>;
  return {
    students, teachers, pendingAdmissions: pendingAdm, openExams,
    attendanceToday: { marked: Object.values(att).reduce((a, b) => a + b, 0), presentPct: denom ? Math.round((present / denom) * 1000) / 10 : null },
    fees: { totalPaise: net, paidPaise: paid, outstandingPaise: Math.max(0, net - paid), collectedLast30Paise: (c.payment ?? 0) - (c.reversal ?? 0) },
    upcomingEvents: upcoming.map((e) => ({ id: String(e._id), title: e.title, startsAt: e.startsAt, venue: e.venue })),
  };
});
