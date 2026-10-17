import { z } from "zod";

export const eventSchema = z.object({
  title: z.string().trim().min(2).max(120), description: z.string().trim().max(2000).optional(), category: z.string().trim().max(30).default("general"),
  venue: z.string().trim().max(80).optional(), organizer: z.string().trim().max(80).optional(), startsAt: z.coerce.date(), endsAt: z.coerce.date().optional().or(z.literal("").transform(() => undefined)),
  status: z.enum(["draft", "published", "cancelled"]).default("draft"), audience: z.array(z.enum(["all", "students", "parents", "teachers"])).min(1).default(["all"]),
}).refine((d) => !d.endsAt || d.endsAt >= d.startsAt, { message: "End must be after start", path: ["endsAt"] });

