import { requirePage } from "@/lib/authorization/context";
import { PlatformView } from "./view";

export const metadata = { title: "Platform" };
export default async function Page() { await requirePage({ roles: ["super_admin"] }); return <PlatformView />; }
