import { z } from "zod";
import { body, route } from "@/lib/api/route";
import { School } from "@/models";
import { audit } from "@/lib/audit";
import { rupees } from "@/features/fees/schemas";

const schema = z.object({
  address: z.string().trim().max(200).optional(), phone: z.string().trim().max(20).optional(), email: z.string().trim().email().optional().or(z.literal("").transform(() => undefined)),
  attendance: z.object({ allowTeacherEditDays: z.coerce.number().int().min(0).max(30), lowAttendanceThresholdPct: z.coerce.number().min(0).max(100) }).optional(),
  fees: z.object({ lateFeeFlat: rupees, lateFeeGraceDays: z.coerce.number().int().min(0).max(120), lateFeePeriodDays: z.coerce.number().int().min(1).max(365), receiptPrefix: z.string().trim().min(2).max(6).regex(/^[A-Za-z]+$/) }).optional(),
  exams: z.object({ passingPercent: z.coerce.number().min(0).max(100), showRank: z.boolean() }).optional(),
  portal: z.object({ studentCanEditContact: z.boolean() }).optional(),
});

export const GET = route({ perm: "school.settings" }, async ({ ctx }) => {
  const s = await School.findById(ctx.schoolId).lean();
  return { name: s?.name, slug: s?.slug, address: s?.address, phone: s?.phone, email: s?.email, timeZone: s?.timeZone, settings: s?.settings,
    notifications: { inApp: "enabled", email: process.env.SMTP_URL ? "configured" : "not_configured", sms: process.env.SMS_API_KEY ? "configured" : "not_configured" } };
});

export const PATCH = route({ perm: "school.settings" }, async ({ req, ctx }) => {
  const d = await body(req, schema);
  const set: Record<string, unknown> = {};
  for (const k of ["address", "phone", "email"] as const) if (d[k] !== undefined) set[k] = d[k];
  if (d.attendance) { set["settings.attendance.allowTeacherEditDays"] = d.attendance.allowTeacherEditDays; set["settings.attendance.lowAttendanceThresholdPct"] = d.attendance.lowAttendanceThresholdPct; }
  if (d.fees) { set["settings.fees.lateFeeFlatPaise"] = d.fees.lateFeeFlat; set["settings.fees.lateFeeGraceDays"] = d.fees.lateFeeGraceDays; set["settings.fees.lateFeePeriodDays"] = d.fees.lateFeePeriodDays; set["settings.fees.receiptPrefix"] = d.fees.receiptPrefix.toUpperCase(); }
  if (d.exams) { set["settings.exams.passingPercent"] = d.exams.passingPercent; set["settings.exams.showRank"] = d.exams.showRank; }
  if (d.portal) set["settings.portal.studentCanEditContact"] = d.portal.studentCanEditContact;
  await School.updateOne({ _id: ctx.schoolId }, { $set: set });
  await audit(ctx, "settings.update", "School", ctx.schoolId, { keys: Object.keys(set) });
  return { ok: true };
});
