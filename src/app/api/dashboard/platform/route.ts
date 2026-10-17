import { route } from "@/lib/api/route";
import { Admission, School, Student, StudentFee, Teacher } from "@/models";

/** Super-admin only: per-school comparison. Each number is a database aggregate. */
export const GET = route({ roles: ["super_admin"] }, async () => {
  const schools = await School.find({ active: true }).sort({ name: 1 }).lean();
  const rows = await Promise.all(schools.map(async (s) => {
    const [students, teachers, apps, fee] = await Promise.all([
      Student.countDocuments({ schoolId: s._id, status: "active" }), Teacher.countDocuments({ schoolId: s._id, status: "active" }),
      Admission.countDocuments({ schoolId: s._id, status: { $in: ["submitted", "under_review", "approved"] } }),
      StudentFee.aggregate([{ $match: { schoolId: s._id } }, { $group: { _id: null, net: { $sum: { $subtract: ["$amountPaise", "$concessionPaise"] } }, paid: { $sum: "$paidPaise" } } }]),
    ]);
    return { id: String(s._id), slug: s.slug, name: s.name, students, teachers, pendingAdmissions: apps, feeTotalPaise: fee[0]?.net ?? 0, feePaidPaise: fee[0]?.paid ?? 0 };
  }));
  return { schools: rows };
});
