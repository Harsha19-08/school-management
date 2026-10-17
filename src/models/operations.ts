import mongoose, { Schema, type Model } from "mongoose";
import { schoolRef } from "./core";

const oid = Schema.Types.ObjectId;
function model<T>(name: string, schema: Schema<T>): Model<T> {
  return (mongoose.models[name] as Model<T>) || mongoose.model<T>(name, schema);
}

/** One record per student per school-local calendar date ("YYYY-MM-DD" in the school's time zone). */
const AttendanceSchema = new Schema(
  {
    schoolId: schoolRef, studentId: { type: oid, ref: "Student", required: true }, sectionId: { type: oid, ref: "Section", required: true, index: true },
    date: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ }, status: { type: String, enum: ["present", "absent", "late", "leave"], required: true },
    remarks: String, markedBy: { type: oid, ref: "User" }, editedBy: { type: oid, ref: "User" },
  },
  { timestamps: true },
);
AttendanceSchema.index({ schoolId: 1, studentId: 1, date: 1 }, { unique: true });
AttendanceSchema.index({ schoolId: 1, sectionId: 1, date: 1 });
export const Attendance = model("Attendance", AttendanceSchema);

const AssignmentSchema = new Schema(
  {
    schoolId: schoolRef, sectionId: { type: oid, ref: "Section", required: true, index: true }, subjectId: { type: oid, ref: "Subject", required: true }, teacherId: { type: oid, ref: "Teacher", required: true },
    title: { type: String, required: true }, instructions: String, kind: { type: String, enum: ["assignment", "resource"], default: "assignment" },
    attachmentIds: [{ type: oid, ref: "DocumentMeta" }], dueAt: Date, allowResubmission: { type: Boolean, default: false }, allowLate: { type: Boolean, default: false }, maxMarks: Number, published: { type: Boolean, default: true },
  },
  { timestamps: true },
);
export const Assignment = model("Assignment", AssignmentSchema);

const SubmissionSchema = new Schema(
  {
    schoolId: schoolRef, assignmentId: { type: oid, ref: "Assignment", required: true }, studentId: { type: oid, ref: "Student", required: true },
    text: String, attachmentIds: [{ type: oid, ref: "DocumentMeta" }], submittedAt: { type: Date, default: Date.now }, late: Boolean, attempt: { type: Number, default: 1 },
    feedback: String, marks: Number, gradedBy: { type: oid, ref: "User" },
  },
  { timestamps: true },
);
SubmissionSchema.index({ schoolId: 1, assignmentId: 1, studentId: 1 }, { unique: true });
export const Submission = model("Submission", SubmissionSchema);

const ExamSchema = new Schema(
  {
    schoolId: schoolRef, name: { type: String, required: true }, type: { type: String, enum: ["unit_test", "midterm", "final", "practical", "other"], default: "unit_test" },
    academicYearId: { type: oid, ref: "AcademicYear", required: true }, term: { type: String, required: true }, classId: { type: oid, ref: "Class", required: true, index: true },
    status: { type: String, enum: ["draft", "scheduled", "marks_open", "published"], default: "draft" }, publishedAt: Date, publishedBy: { type: oid, ref: "User" },
    subjects: [{ subjectId: { type: oid, ref: "Subject", required: true }, maxMarks: { type: Number, required: true, min: 1 }, passMarks: { type: Number, required: true, min: 0 }, date: Date, start: String, end: String, room: String }],
  },
  { timestamps: true },
);
export const Exam = model("Exam", ExamSchema);

const ResultSchema = new Schema(
  {
    schoolId: schoolRef, examId: { type: oid, ref: "Exam", required: true, index: true }, studentId: { type: oid, ref: "Student", required: true, index: true }, subjectId: { type: oid, ref: "Subject", required: true },
    marks: { type: Number, min: 0 }, absent: { type: Boolean, default: false }, enteredBy: { type: oid, ref: "User" },
    corrections: [{ at: Date, by: oid, from: Number, to: Number, reason: String }],
  },
  { timestamps: true },
);
ResultSchema.index({ schoolId: 1, examId: 1, studentId: 1, subjectId: 1 }, { unique: true });
export const Result = model("Result", ResultSchema);

const FeeCategorySchema = new Schema({ schoolId: schoolRef, name: { type: String, required: true }, frequency: { type: String, enum: ["one_time", "monthly", "quarterly", "term", "yearly"], default: "yearly" } }, { timestamps: true });
FeeCategorySchema.index({ schoolId: 1, name: 1 }, { unique: true });
export const FeeCategory = model("FeeCategory", FeeCategorySchema);

const FeeStructureSchema = new Schema(
  {
    schoolId: schoolRef, academicYearId: { type: oid, ref: "AcademicYear", required: true }, categoryId: { type: oid, ref: "FeeCategory", required: true }, classIds: [{ type: oid, ref: "Class" }],
    amountPaise: { type: Number, required: true, min: 0, validate: Number.isInteger },
    installments: [{ label: String, dueDate: Date, amountPaise: { type: Number, validate: Number.isInteger } }],
  },
  { timestamps: true },
);
FeeStructureSchema.index({ schoolId: 1, academicYearId: 1, categoryId: 1 });
export const FeeStructure = model("FeeStructure", FeeStructureSchema);

/** A concrete charge (one installment / one-off) against one student. */
const StudentFeeSchema = new Schema(
  {
    schoolId: schoolRef, studentId: { type: oid, ref: "Student", required: true, index: true }, academicYearId: { type: oid, ref: "AcademicYear", required: true },
    categoryId: { type: oid, ref: "FeeCategory", required: true }, structureId: { type: oid, ref: "FeeStructure" }, label: { type: String, required: true },
    amountPaise: { type: Number, required: true, min: 0, validate: Number.isInteger }, concessionPaise: { type: Number, default: 0, min: 0, validate: Number.isInteger },
    /** Atomic running total of successful payments minus reversals; the gate against overpayment. */
    paidPaise: { type: Number, default: 0, min: 0, validate: Number.isInteger },
    concessionReason: String, concessionBy: { type: oid, ref: "User" }, dueDate: { type: Date, required: true },
    status: { type: String, enum: ["pending", "partial", "paid", "waived"], default: "pending", index: true },
    /** Idempotency key so re-running fee generation never double-charges. */
    genKey: String,
  },
  { timestamps: true },
);
StudentFeeSchema.index({ schoolId: 1, genKey: 1 }, { unique: true, partialFilterExpression: { genKey: { $type: "string" } } });
export const StudentFee = model("StudentFee", StudentFeeSchema);

/** Append-only ledger. Completed payments are never edited; mistakes get a reversal entry. */
const PaymentSchema = new Schema(
  {
    schoolId: schoolRef, studentId: { type: oid, ref: "Student", required: true, index: true }, feeId: { type: oid, ref: "StudentFee", required: true, index: true },
    kind: { type: String, enum: ["payment", "reversal"], default: "payment" }, reversesId: { type: oid, ref: "Payment" },
    amountPaise: { type: Number, required: true, min: 1, validate: Number.isInteger },
    mode: { type: String, enum: ["cash", "bank_transfer", "cheque", "online"], required: true }, reference: String,
    status: { type: String, enum: ["pending", "success", "failed"], default: "success" }, receiptNo: String, paidOn: { type: Date, default: Date.now },
    recordedBy: { type: oid, ref: "User" }, reason: String,
    /** Online only: success is set only after server-side signature verification. */
    provider: { name: String, orderId: String, paymentId: String }, idempotencyKey: String,
  },
  { timestamps: true },
);
PaymentSchema.index({ schoolId: 1, receiptNo: 1 }, { unique: true, partialFilterExpression: { receiptNo: { $type: "string" } } });
PaymentSchema.index({ schoolId: 1, idempotencyKey: 1 }, { unique: true, partialFilterExpression: { idempotencyKey: { $type: "string" } } });
PaymentSchema.index({ reversesId: 1 }, { unique: true, partialFilterExpression: { reversesId: { $type: "objectId" } } });
export const Payment = model("Payment", PaymentSchema);

const EventSchema = new Schema(
  {
    schoolId: schoolRef, title: { type: String, required: true }, description: String, category: { type: String, default: "general" }, venue: String, organizer: String,
    startsAt: { type: Date, required: true, index: true }, endsAt: Date, posterKey: String, status: { type: String, enum: ["draft", "published", "cancelled"], default: "draft" },
    audience: { type: [String], enum: ["all", "students", "parents", "teachers"], default: ["all"] }, createdBy: { type: oid, ref: "User" },
  },
  { timestamps: true },
);
export const SchoolEvent = model("Event", EventSchema);

const NoticeSchema = new Schema(
  {
    schoolId: schoolRef, title: { type: String, required: true }, body: { type: String, required: true },
    audience: { type: [String], enum: ["all", "students", "parents", "teachers"], default: ["all"] },
    classIds: [{ type: oid, ref: "Class" }], sectionIds: [{ type: oid, ref: "Section" }], studentIds: [{ type: oid, ref: "Student" }],
    kind: { type: String, enum: ["announcement", "fee_reminder", "exam_reminder", "event_reminder", "document"], default: "announcement" },
    pinned: Boolean, createdBy: { type: oid, ref: "User" }, expiresAt: Date,
  },
  { timestamps: true },
);
NoticeSchema.index({ schoolId: 1, createdAt: -1 });
export const Notice = model("Notice", NoticeSchema);

const NotificationSchema = new Schema(
  {
    schoolId: schoolRef, userId: { type: oid, ref: "User", required: true, index: true }, title: { type: String, required: true }, body: String, link: String, kind: String, read: { type: Boolean, default: false },
    /** Honest delivery state per channel: in_app is real; email/sms are "not_configured" unless a provider exists. */
    delivery: { inApp: { type: String, default: "delivered" }, email: { type: String, default: "not_configured" }, sms: { type: String, default: "not_configured" } },
  },
  { timestamps: true },
);
NotificationSchema.index({ userId: 1, read: 1, createdAt: -1 });
export const Notification = model("Notification", NotificationSchema);

const DocumentMetaSchema = new Schema(
  {
    schoolId: schoolRef, title: { type: String, required: true },
    category: { type: String, enum: ["admission", "certificate", "report_card", "receipt", "circular", "exam_timetable", "id_proof", "other"], default: "other" },
    academicYearId: { type: oid, ref: "AcademicYear" },
    /** Generated key, never user-supplied; maps to private storage. */
    storageKey: { type: String, required: true, unique: true }, originalName: String, mime: { type: String, required: true }, size: { type: Number, required: true },
    ownerStudentId: { type: oid, ref: "Student", index: true }, audience: { type: [String], enum: ["staff", "teachers", "students", "parents"], default: ["staff"] },
    sectionIds: [{ type: oid, ref: "Section" }], uploadedBy: { type: oid, ref: "User" }, version: { type: Number, default: 1 },
    previousVersions: [{ storageKey: String, version: Number, replacedAt: Date, by: oid }], deleted: { type: Boolean, default: false },
  },
  { timestamps: true },
);
DocumentMetaSchema.index({ schoolId: 1, category: 1, createdAt: -1 });
export const DocumentMeta = model("DocumentMeta", DocumentMetaSchema);
