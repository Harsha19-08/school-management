/* Development seed. Deterministic, explicitly opt-in for remote databases, and clearly synthetic (names are generated, all accounts use @demo.test). */
import mongoose, { Types } from "mongoose";
import { hashPassword } from "../src/lib/security/crypto";
import { configureMongoDns } from "../src/lib/db/dns";
import { SCHOOL_THEMES } from "../src/config/schools";
import { AcademicYear, Admission, Assignment, Attendance, Enrollment, Exam, FeeCategory, FeeStructure, Guardian, Membership, Notice, Payment, Result, School, SchoolClass, SchoolEvent, Section, Student, StudentFee, Subject, SuperAdmin, Teacher, Timetable, User } from "../src/models";
import { dedupeKey } from "../src/features/admissions/logic";
import { recordPayment, statusOf } from "../src/services/fees";

const uri = process.env.MONGODB_URI;
if (!uri) throw new Error("MONGODB_URI is not set (see .env.example).");
if (process.env.NODE_ENV === "production") throw new Error("Refusing to seed in production.");
const isLocalDatabase = /(localhost|127\.0\.0\.1|\[::1\]|\/\/mongo[:/])/.test(uri);
if (!isLocalDatabase && process.env.SEED_ALLOW_REMOTE !== "true") {
  throw new Error("Refusing to seed a non-local database. Set SEED_ALLOW_REMOTE=true to explicitly allow destructive seeding against MongoDB Atlas.");
}
configureMongoDns(uri);

let seedN = 20260101;
const rnd = () => { seedN = (seedN * 1664525 + 1013904223) % 4294967296; return seedN / 4294967296; };
const pick = <T,>(a: T[]) => a[Math.floor(rnd() * a.length)];
const PASSWORD = process.env.SEED_PASSWORD ?? "Demo@12345";
const FIRST_M = ["Aarav", "Vivaan", "Aditya", "Arjun", "Kabir", "Rohan", "Ishaan", "Krish", "Dhruv", "Rahul"];
const FIRST_F = ["Anaya", "Diya", "Meera", "Saanvi", "Kavya", "Riya", "Ira", "Nisha", "Tara", "Pooja"];
const LAST = ["Sharma", "Reddy", "Nair", "Iyer", "Das", "Khan", "Joseph", "D'Souza", "Patel", "Rao", "Menon", "Gupta"];
const SUBJECTS: [string, string][] = [["English", "ENG"], ["Mathematics", "MAT"], ["Science", "SCI"], ["Social Studies", "SOC"], ["Hindi", "HIN"], ["Computer Science", "CSC"]];
const day = (n: number) => new Date(Date.now() + n * 86_400_000);
const key = (d: Date) => d.toISOString().slice(0, 10);

async function user(email: string, name: string, hash: string) { return User.create({ email, name, passwordHash: hash, active: true, activatedAt: new Date() }); }

async function main() {
  await mongoose.connect(uri!);
  console.log("Resetting collections…");
  await Promise.all(Object.values(mongoose.models).map((m) => m.deleteMany({})));
  const hash = await hashPassword(PASSWORD);
  const sup = await user("super@demo.test", "Platform Admin", hash);
  await SuperAdmin.create({ userId: sup._id });
  const summary: string[] = ["super@demo.test (super admin)"];

  for (const slug of ["das", "stmarys"] as const) {
    const th = SCHOOL_THEMES[slug]; const tag = slug === "das" ? "das" : "stm";
    const school = await School.create({ slug, name: th.name, tagline: th.tagline, address: slug === "das" ? "Hyderabad, Telangana" : "Visakhapatnam, Andhra Pradesh" });
    const sc = { schoolId: school._id };
    const year = await AcademicYear.create({ ...sc, label: "2026-27", startDate: new Date("2026-06-01"), endDate: new Date("2027-03-31"), current: true });
    const subjects = await Subject.insertMany(SUBJECTS.map(([name, code]) => ({ ...sc, name, code })));
    const classes = await SchoolClass.insertMany([6, 7, 8].map((g) => ({ ...sc, name: `Class ${g}`, grade: g })));
    const sections = await Section.insertMany(classes.flatMap((c) => ["A", "B"].map((n) => ({ ...sc, classId: c._id, name: n, capacity: 40 }))));

    // Teachers: 1 per subject per section group, with logins.
    const teachers: InstanceType<typeof Teacher>[] = [];
    for (let i = 0; i < 8; i++) {
      const name = `${pick(FIRST_M.concat(FIRST_F))} ${pick(LAST)}`;
      const u = await user(`teacher${i + 1}@${tag}.demo.test`, name, hash);
      const t = await Teacher.create({ ...sc, userId: u._id, employeeNo: `T${String(i + 1).padStart(3, "0")}`, name, email: u.email, assignments: [] });
      await Membership.create({ userId: u._id, schoolId: school._id, role: "teacher", teacherId: t._id });
      teachers.push(t);
    }
    sections.forEach((sec, si) => subjects.forEach((sub, sj) => { const t = teachers[(si + sj) % teachers.length]; t.assignments.push({ subjectId: sub._id, sectionId: sec._id } as never); }));
    await Promise.all(teachers.map((t) => t.save()));
    await Section.updateMany({ _id: { $in: sections.map((s) => s._id) } }, {});
    sections.forEach((s, i) => { s.classTeacherId = teachers[i % teachers.length]._id; });
    await Promise.all(sections.map((s) => s.save()));

    // Admin
    const admin = await user(`admin@${tag}.demo.test`, `${th.shortName} Administrator`, hash);
    await Membership.create({ userId: admin._id, schoolId: school._id, role: "school_admin" });

    // Timetable (period 1-5, Mon-Sat subset)
    const slots = [];
    for (const [si, sec] of sections.entries()) for (let d = 1; d <= 5; d++) for (let p = 1; p <= 5; p++) {
      const sub = subjects[(d + p + si) % subjects.length]; const t = teachers[(si + subjects.indexOf(sub)) % teachers.length];
      slots.push({ ...sc, sectionId: sec._id, day: d, period: p, start: `${String(8 + p).padStart(2, "0")}:00`, end: `${String(8 + p).padStart(2, "0")}:45`, subjectId: sub._id, teacherId: t._id });
    }
    // avoid teacher clashes by dropping later duplicates
    const seen = new Set<string>(); await Timetable.insertMany(slots.filter((s) => { const k = `${s.teacherId}-${s.day}-${s.period}`; if (seen.has(k)) return false; seen.add(k); return true; }));

    // Students + guardians
    const students = []; let n = 0;
    for (const [si, sec] of sections.entries()) for (let r = 1; r <= 10; r++) {
      n++; const female = rnd() > 0.5; const first = pick(female ? FIRST_F : FIRST_M); const last = pick(LAST);
      const cls = classes.find((c) => String(c._id) === String(sec.classId))!;
      const s = await Student.create({ ...sc, admissionNo: `${tag.toUpperCase()}-2026-${String(n).padStart(4, "0")}`, firstName: first, lastName: last, gender: female ? "female" : "male", dob: new Date(2026 - (cls.grade + 6), Math.floor(rnd() * 12), 1 + Math.floor(rnd() * 27)), classId: cls._id, sectionId: sec._id, rollNo: r, admissionDate: new Date("2026-06-01") });
      await Guardian.create({ ...sc, name: `${pick(FIRST_M)} ${last}`, phone: `9${String(Math.floor(rnd() * 1e9)).padStart(9, "0")}`, studentIds: [s._id] });
      await Enrollment.create({ ...sc, studentId: s._id, academicYearId: year._id, classId: cls._id, sectionId: sec._id, rollNo: r });
      students.push({ s, si, cls });
    }
    // Demo logins for the first student of the first section + their guardian
    const first = students[0].s;
    const su = await user(`student1@${tag}.demo.test`, `${first.firstName} ${first.lastName}`, hash);
    first.userId = su._id as never; await first.save();
    await Membership.create({ userId: su._id, schoolId: school._id, role: "student", studentId: first._id });
    const g = await Guardian.findOne({ ...sc, studentIds: first._id });
    const pu = await user(`parent1@${tag}.demo.test`, g!.name, hash);
    g!.userId = pu._id as never; g!.email = pu.email; await g!.save();
    await Membership.create({ userId: pu._id, schoolId: school._id, role: "parent", guardianId: g!._id });

    // Attendance: last 30 weekdays; first student ~ fixed pattern
    const att = [];
    for (let d = 1; d <= 30; d++) { const dt = day(-d); if ([0, 6].includes(dt.getUTCDay())) continue; for (const { s } of students) { const x = rnd(); att.push({ ...sc, studentId: s._id, sectionId: s.sectionId, date: key(dt), status: x < 0.88 ? "present" : x < 0.93 ? "late" : x < 0.98 ? "absent" : "leave", markedBy: admin._id }); } }
    await Attendance.insertMany(att);

    // Exams: one published (everyone has all marks), one marks_open (no results yet)
    const examSubs = subjects.slice(0, 4).map((s) => ({ subjectId: s._id, maxMarks: 100, passMarks: 35 }));
    for (const c of classes) {
      const done = await Exam.create({ ...sc, name: "Unit Test 1", type: "unit_test", academicYearId: year._id, term: "Term 1", classId: c._id, status: "published", publishedAt: day(-10), publishedBy: admin._id, subjects: examSubs });
      await Exam.create({ ...sc, name: "Mid-Term", type: "midterm", academicYearId: year._id, term: "Term 1", classId: c._id, status: "marks_open", subjects: examSubs });
      await Result.insertMany(students.filter((x) => String(x.cls._id) === String(c._id)).flatMap(({ s }) => examSubs.map((es) => ({ ...sc, examId: done._id, studentId: s._id, subjectId: es.subjectId, marks: Math.round(35 + rnd() * 62), enteredBy: admin._id }))));
    }

    // Fees
    const tuition = await FeeCategory.create({ ...sc, name: "Tuition", frequency: "term" });
    const struct = await FeeStructure.create({ ...sc, academicYearId: year._id, categoryId: tuition._id, classIds: classes.map((c) => c._id), amountPaise: 3_000_000, installments: [{ label: "Term 1", dueDate: day(-20), amountPaise: 1_500_000 }, { label: "Term 2", dueDate: day(60), amountPaise: 1_500_000 }] });
    const fees = [];
    for (const { s } of students) for (const [idx, i] of struct.installments.entries()) fees.push({ ...sc, studentId: s._id, academicYearId: year._id, categoryId: tuition._id, structureId: struct._id, label: `Tuition – ${i.label}`, amountPaise: i.amountPaise!, dueDate: i.dueDate!, status: "pending", genKey: `${struct._id}:${s._id}:${idx}` });
    const created = await StudentFee.insertMany(fees);
    // Payments go through the real service (receipt counter, overpayment gate)
    let k = 0;
    for (const f of created.filter((c) => c.label.endsWith("Term 1"))) { k++; if (k % 4 === 0) continue; const amt = k % 5 === 0 ? 700_000 : 1_500_000; await recordPayment({ schoolId: String(school._id), feeId: String(f._id), amountPaise: amt, mode: k % 2 ? "cash" : "bank_transfer", recordedBy: String(admin._id), idempotencyKey: `seed-${slug}-${k}` }); }
    void Payment; void statusOf;

    // Assignments, events, notices, admissions
    for (const sec of sections.slice(0, 2)) await Assignment.create({ ...sc, sectionId: sec._id, subjectId: subjects[1]._id, teacherId: teachers[0]._id, title: "Chapter 3 practice set", instructions: "Solve all exercise questions and write your answers.", dueAt: day(5), allowLate: false });
    await SchoolEvent.insertMany([{ ...sc, title: "Annual Sports Day", venue: "School Ground", startsAt: day(14), status: "published", audience: ["all"] }, { ...sc, title: "Parent–Teacher Meeting", venue: "Classrooms", startsAt: day(7), status: "published", audience: ["parents", "teachers"] }, { ...sc, title: "Staff retreat (draft)", startsAt: day(30), status: "draft", audience: ["teachers"] }]);
    await Notice.insertMany([{ ...sc, title: "Term 1 fee due date reminder", body: "Please clear Term 1 dues at the school office.", audience: ["parents", "students"], kind: "fee_reminder", pinned: true, createdBy: admin._id }, { ...sc, title: "Staff meeting on Friday", body: "All teachers to attend the briefing at 3 pm.", audience: ["teachers"], createdBy: admin._id }]);
    const appl = [["Mahi", "Verma", "submitted"], ["Neel", "Kapoor", "under_review"], ["Zoya", "Ali", "approved"]] as const;
    for (const [i, [f, l, st]] of appl.entries()) { const gname = `${pick(FIRST_M)} ${l}`; await Admission.create({ ...sc, applicationNo: `APP-2026-${String(i + 1).padStart(4, "0")}`, status: st, student: { firstName: f, lastName: l, gender: i % 2 ? "male" : "female", dob: new Date("2015-04-10") }, guardian: { name: gname, phone: "9876543210" }, classId: classes[0]._id, dedupeKey: dedupeKey({ firstName: f, lastName: l, dob: "2015-04-10", guardianName: gname }), history: [{ to: st }] }); }
    summary.push(`admin@${tag}.demo.test, teacher1@${tag}.demo.test, student1@${tag}.demo.test, parent1@${tag}.demo.test  (${th.name})`);
    console.log(`Seeded ${th.name}: ${students.length} students, ${teachers.length} teachers.`);
  }
  console.log(`\nAll demo accounts use password: ${PASSWORD}\n  ${summary.join("\n  ")}`);
  await mongoose.disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
