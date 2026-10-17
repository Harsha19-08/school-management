/**
 * Database-backed integration tests. They need a real MongoDB and are SKIPPED unless MONGODB_URI_TEST is set.
 * Point it at a throwaway database (the tests wipe it).  e.g.  MONGODB_URI_TEST=mongodb://127.0.0.1:27017/school_test
 */
import mongoose, { Types } from "mongoose";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const uri = process.env.MONGODB_URI_TEST;
describe.skipIf(!uri)("integration (requires MongoDB)", () => {
  beforeAll(async () => { await mongoose.connect(uri!); await mongoose.connection.dropDatabase(); });
  afterAll(async () => { await mongoose.disconnect(); });

  it("ledger: concurrent payments can never exceed the fee, and receipts are unique", async () => {
    const { School, Student, StudentFee, Payment } = await import("@/models");
    const { recordPayment } = await import("@/services/fees");
    const school = await School.create({ slug: "das", name: "D.A.S" });
    const sid = new Types.ObjectId();
    const fee = await StudentFee.create({ schoolId: school._id, studentId: sid, academicYearId: new Types.ObjectId(), categoryId: new Types.ObjectId(), label: "T", amountPaise: 10000, dueDate: new Date() });
    const results = await Promise.allSettled(Array.from({ length: 5 }, () => recordPayment({ schoolId: String(school._id), feeId: String(fee._id), amountPaise: 4000, mode: "cash" })));
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(2);
    const pays = await Payment.find({ feeId: fee._id }).lean();
    expect(new Set(pays.map((p) => p.receiptNo)).size).toBe(pays.length);
    void Student;
  });

  it("ledger: a payment can be reversed once, and only once", async () => {
    const { School, StudentFee, Payment } = await import("@/models");
    const { recordPayment, reversePayment } = await import("@/services/fees");
    const school = await School.create({ slug: "stmarys", name: "St Mary's" });
    const fee = await StudentFee.create({ schoolId: school._id, studentId: new Types.ObjectId(), academicYearId: new Types.ObjectId(), categoryId: new Types.ObjectId(), label: "T", amountPaise: 5000, dueDate: new Date() });
    const { payment } = await recordPayment({ schoolId: String(school._id), feeId: String(fee._id), amountPaise: 5000, mode: "cash" });
    await reversePayment({ schoolId: String(school._id), paymentId: String(payment._id), reason: "entered twice", by: String(new Types.ObjectId()) });
    await expect(reversePayment({ schoolId: String(school._id), paymentId: String(payment._id), reason: "again", by: String(new Types.ObjectId()) })).rejects.toThrow();
    expect((await StudentFee.findById(fee._id).lean())?.paidPaise).toBe(0);
    expect(await Payment.countDocuments({ feeId: fee._id, kind: "reversal" })).toBe(1);
  });

  it("idempotency key makes a retried payment a no-op", async () => {
    const { School, StudentFee } = await import("@/models");
    const { recordPayment } = await import("@/services/fees");
    const school = await School.create({ slug: "das", name: "dup" }).catch(() => School.findOne({ slug: "das" }));
    const fee = await StudentFee.create({ schoolId: school!._id, studentId: new Types.ObjectId(), academicYearId: new Types.ObjectId(), categoryId: new Types.ObjectId(), label: "T", amountPaise: 9000, dueDate: new Date() });
    const a = await recordPayment({ schoolId: String(school!._id), feeId: String(fee._id), amountPaise: 3000, mode: "cash", idempotencyKey: "retry-key-12345" });
    const b = await recordPayment({ schoolId: String(school!._id), feeId: String(fee._id), amountPaise: 3000, mode: "cash", idempotencyKey: "retry-key-12345" });
    expect(b.duplicate).toBe(true); expect(String(b.payment._id)).toBe(String(a.payment._id));
    expect((await StudentFee.findById(fee._id).lean())?.paidPaise).toBe(3000);
  });
});
