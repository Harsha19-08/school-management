import { redirect } from "next/navigation";
import { getCtx, homeFor } from "@/lib/authorization/context";

export const dynamic = "force-dynamic";
export default async function Home() {
  const ctx = await getCtx();
  redirect(ctx ? homeFor(ctx.role) : "/login");
}
