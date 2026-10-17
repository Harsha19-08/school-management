import mongoose, { Schema, type Model } from "mongoose";
import { schoolRef } from "./core";

const oid = Schema.Types.ObjectId;
function model<T>(name: string, schema: Schema<T>): Model<T> {
  return (mongoose.models[name] as Model<T>) || mongoose.model<T>(name, schema);
}

const AcademicYearSchema = new Schema({ schoolId: schoolRef, label: { type: String, required: true }, startDate: { type: Date, required: true }, endDate: { type: Date, required: true }, current: { type: Boolean, default: false } }, { timestamps: true });
AcademicYearSchema.index({ schoolId: 1, label: 1 }, { unique: true });
export const AcademicYear = model("AcademicYear", AcademicYearSchema);

const ClassSchema = new Schema({ schoolId: schoolRef, name: { type: String, required: true }, grade: { type: Number, required: true }, classTeacherId: { type: oid, ref: "Teacher" } }, { timestamps: true });
ClassSchema.index({ schoolId: 1, grade: 1 }, { unique: true });
export const SchoolClass = model("Class", ClassSchema);

const SectionSchema = new Schema({ schoolId: schoolRef, classId: { type: oid, ref: "Class", required: true, index: true }, name: { type: String, required: true }, capacity: { type: Number, default: 40 }, classTeacherId: { type: oid, ref: "Teacher" }, room: String }, { timestamps: true });
SectionSchema.index({ schoolId: 1, classId: 1, name: 1 }, { unique: true });
export const Section = model("Section", SectionSchema);

const SubjectSchema = new Schema({ schoolId: schoolRef, name: { type: String, required: true }, code: { type: String, required: true } }, { timestamps: true });
SubjectSchema.index({ schoolId: 1, code: 1 }, { unique: true });
export const Subject = model("Subject", SubjectSchema);

const TeacherSchema = new Schema(
  {
    schoolId: schoolRef, userId: { type: oid, ref: "User", index: true },
    employeeNo: { type: String, required: true }, name: { type: String, required: true }, phone: String, email: String, qualification: String, joinedOn: Date,
    status: { type: String, enum: ["active", "inactive"], default: "active" },
    assignments: [{ subjectId: { type: oid, ref: "Subject", required: true }, sectionId: { type: oid, ref: "Section", required: true } }],
  },
  { timestamps: true },
);
TeacherSchema.index({ schoolId: 1, employeeNo: 1 }, { unique: true });
export const Teacher = model("Teacher", TeacherSchema);

const StudentSchema = new Schema(
  {
    schoolId: schoolRef, userId: { type: oid, ref: "User", index: true },
    admissionNo: { type: String, required: true },
    firstName: { type: String, required: true, trim: true }, lastName: { type: String, required: true, trim: true },
    gender: { type: String, enum: ["male", "female", "other"], required: true }, dob: { type: Date, required: true },
    photoKey: String, phone: String, email: String, address: String,
    emergencyContact: { name: String, phone: String, relation: String },
    classId: { type: oid, ref: "Class", required: true, index: true }, sectionId: { type: oid, ref: "Section", required: true, index: true },
    rollNo: Number, admissionDate: { type: Date, required: true },
    status: { type: String, enum: ["active", "inactive", "transferred", "alumni", "archived"], default: "active", index: true },
    history: [{ at: { type: Date, default: Date.now }, by: { type: oid, ref: "User" }, action: String, fromSectionId: oid, toSectionId: oid, note: String }],
  },
  { timestamps: true },
);
StudentSchema.index({ schoolId: 1, admissionNo: 1 }, { unique: true });
StudentSchema.index({ schoolId: 1, firstName: 1, lastName: 1 });
StudentSchema.index({ schoolId: 1, sectionId: 1, rollNo: 1 });
export const Student = model("Student", StudentSchema);

const GuardianSchema = new Schema(
  {
    schoolId: schoolRef, userId: { type: oid, ref: "User", index: true }, name: { type: String, required: true }, phone: String, email: String, occupation: String,
    /** Only these students are visible to this guardian — enforced server side. */
    studentIds: [{ type: oid, ref: "Student" }], relation: { type: String, default: "parent" },
  },
  { timestamps: true },
);
export const Guardian = model("Guardian", GuardianSchema);

const EnrollmentSchema = new Schema({ schoolId: schoolRef, studentId: { type: oid, ref: "Student", required: true }, academicYearId: { type: oid, ref: "AcademicYear", required: true }, classId: { type: oid, ref: "Class", required: true }, sectionId: { type: oid, ref: "Section", required: true }, rollNo: Number }, { timestamps: true });
EnrollmentSchema.index({ schoolId: 1, studentId: 1, academicYearId: 1 }, { unique: true });
export const Enrollment = model("Enrollment", EnrollmentSchema);

const AdmissionSchema = new Schema(
  {
    schoolId: schoolRef, applicationNo: { type: String, required: true },
    status: { type: String, enum: ["draft", "submitted", "under_review", "approved", "rejected", "enrolled"], default: "draft", index: true },
    student: { firstName: { type: String, required: true }, lastName: { type: String, required: true }, gender: { type: String, enum: ["male", "female", "other"], required: true }, dob: { type: Date, required: true } },
    guardian: { name: { type: String, required: true }, phone: { type: String, required: true }, email: String },
    classId: { type: oid, ref: "Class", required: true }, sectionId: { type: oid, ref: "Section" }, previousSchool: String,
    documentIds: [{ type: oid, ref: "DocumentMeta" }], decisionNote: String, decidedBy: { type: oid, ref: "User" }, enrolledStudentId: { type: oid, ref: "Student" },
    /** Normalised key used for duplicate-application detection. */
    dedupeKey: { type: String, required: true },
    history: [{ at: { type: Date, default: Date.now }, by: oid, from: String, to: String, note: String }],
  },
  { timestamps: true },
);
AdmissionSchema.index({ schoolId: 1, applicationNo: 1 }, { unique: true });
AdmissionSchema.index({ schoolId: 1, dedupeKey: 1 }, { unique: true, partialFilterExpression: { status: { $in: ["draft", "submitted", "under_review", "approved", "enrolled"] } } });
export const Admission = model("Admission", AdmissionSchema);

const TimetableSchema = new Schema(
  {
    schoolId: schoolRef, sectionId: { type: oid, ref: "Section", required: true, index: true },
    day: { type: Number, min: 1, max: 6, required: true }, period: { type: Number, required: true },
    start: { type: String, required: true }, end: { type: String, required: true },
    subjectId: { type: oid, ref: "Subject", required: true }, teacherId: { type: oid, ref: "Teacher" }, room: String,
  },
  { timestamps: true },
);
TimetableSchema.index({ schoolId: 1, sectionId: 1, day: 1, period: 1 }, { unique: true });
export const Timetable = model("Timetable", TimetableSchema);
