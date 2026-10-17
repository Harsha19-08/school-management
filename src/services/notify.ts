import { Types } from "mongoose";
import { Notification, School } from "@/models";

export interface NotifyInput { schoolId: string; userIds: string[]; title: string; body?: string; link?: string; kind?: string }

/**
 * In-app notifications are real. Email/SMS are recorded honestly as "not_configured" unless a provider is wired up;
 * we never claim a message was sent.
 */
export async function notify(i: NotifyInput) {
  const ids = [...new Set(i.userIds)].filter((x) => Types.ObjectId.isValid(x));
  if (!ids.length) return { created: 0, email: "not_configured" as const, sms: "not_configured" as const };
  const school = await School.findById(i.schoolId).select("settings.notifications").lean();
  const emailOn = !!school?.settings?.notifications?.emailConfigured && !!process.env.SMTP_URL;
  const smsOn = !!school?.settings?.notifications?.smsConfigured && !!process.env.SMS_API_KEY;
  // No provider integration ships in this build, so even when flags are set the state stays truthful.
  const email = emailOn ? "queued_unsupported" : "not_configured";
  const sms = smsOn ? "queued_unsupported" : "not_configured";
  await Notification.insertMany(ids.map((u) => ({ schoolId: i.schoolId, userId: u, title: i.title, body: i.body, link: i.link, kind: i.kind, delivery: { inApp: "delivered", email, sms } })));
  return { created: ids.length, email, sms };
}
