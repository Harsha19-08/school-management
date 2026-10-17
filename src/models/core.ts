import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";
import { ROLES } from "@/lib/authorization/permissions";

const oid = Schema.Types.ObjectId;
function model<T>(name: string, schema: Schema<T>): Model<T> {
  return (mongoose.models[name] as Model<T>) || mongoose.model<T>(name, schema);
}
/** Immutable school ownership field used by every school-owned collection. */
export const schoolRef = { type: oid, ref: "School", required: true, immutable: true, index: true } as const;

const SchoolSchema = new Schema(
  {
    slug: { type: String, enum: ["das", "stmarys"], required: true, unique: true, immutable: true },
    name: { type: String, required: true, trim: true },
    tagline: String,
    active: { type: Boolean, default: true },
    logoKey: String, address: String, phone: String, email: String,
    timeZone: { type: String, default: "Asia/Kolkata" },
    settings: {
      attendance: { lateAfterMinutes: { type: Number, default: 15 }, allowTeacherEditDays: { type: Number, default: 2 }, lowAttendanceThresholdPct: { type: Number, default: 75 } },
      fees: { lateFeeFlatPaise: { type: Number, default: 0 }, lateFeeGraceDays: { type: Number, default: 0 }, lateFeePeriodDays: { type: Number, default: 30 }, lateFeeCapPaise: Number, receiptPrefix: { type: String, default: "RCT" }, onlinePaymentsEnabled: { type: Boolean, default: false } },
      exams: {
        passingPercent: { type: Number, default: 35 }, showRank: { type: Boolean, default: false },
        gradeScale: { type: [{ min: Number, grade: String }], default: [{ min: 90, grade: "A+" }, { min: 80, grade: "A" }, { min: 70, grade: "B+" }, { min: 60, grade: "B" }, { min: 50, grade: "C" }, { min: 35, grade: "D" }, { min: 0, grade: "F" }] },
      },
      portal: { studentCanEditContact: { type: Boolean, default: true } },
      notifications: { emailConfigured: { type: Boolean, default: false }, smsConfigured: { type: Boolean, default: false } },
    },
    counters: { admission: { type: Number, default: 0 }, receipt: { type: Number, default: 0 } },
  },
  { timestamps: true },
);
export const School = model("School", SchoolSchema);

const UserSchema = new Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    username: { type: String, unique: true, sparse: true, lowercase: true, trim: true },
    name: { type: String, required: true, trim: true },
    passwordHash: { type: String, select: false },
    active: { type: Boolean, default: true },
    activatedAt: Date,
    /** Bumped on password change / deactivation to invalidate sessions. */
    tokenVersion: { type: Number, default: 0 },
    failedLogins: { type: Number, default: 0 },
    lockedUntil: Date,
    resetTokenHash: { type: String, select: false },
    resetTokenExpires: { type: Date, select: false },
    activationTokenHash: { type: String, select: false },
    activationTokenExpires: { type: Date, select: false },
    lastLoginAt: Date,
  },
  { timestamps: true },
);
export const User = model("User", UserSchema);

const MembershipSchema = new Schema(
  {
    userId: { type: oid, ref: "User", required: true, index: true },
    schoolId: schoolRef,
    role: { type: String, enum: ROLES.filter((r) => r !== "super_admin"), required: true },
    active: { type: Boolean, default: true },
    studentId: { type: oid, ref: "Student" }, teacherId: { type: oid, ref: "Teacher" }, guardianId: { type: oid, ref: "Guardian" },
  },
  { timestamps: true },
);
MembershipSchema.index({ userId: 1, schoolId: 1, role: 1 }, { unique: true });
export const Membership = model("Membership", MembershipSchema);

/** Super admins are global; there is deliberately no public path to create one. */
const SuperAdminSchema = new Schema({ userId: { type: oid, ref: "User", required: true, unique: true }, active: { type: Boolean, default: true } }, { timestamps: true });
export const SuperAdmin = model("SuperAdmin", SuperAdminSchema);

const RoleSchema = new Schema(
  { schoolId: schoolRef, role: { type: String, enum: ["school_admin", "teacher", "student", "parent"], required: true }, description: String, permissions: [String] },
  { timestamps: true },
);
RoleSchema.index({ schoolId: 1, role: 1 }, { unique: true });
export const RoleConfig = model("RoleConfig", RoleSchema);

const AuditSchema = new Schema(
  {
    schoolId: { type: oid, ref: "School", index: true }, actorId: { type: oid, ref: "User", index: true }, actorRole: String,
    action: { type: String, required: true, index: true }, entity: String, entityId: String, meta: Schema.Types.Mixed, ip: String,
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);
AuditSchema.index({ schoolId: 1, createdAt: -1 });
export const AuditLog = model("AuditLog", AuditSchema);

export type SchoolDoc = InferSchemaType<typeof SchoolSchema>;
