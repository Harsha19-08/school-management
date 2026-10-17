import { requirePage } from "@/lib/authorization/context";
import { PortalHome } from "@/features/portal/home";

export const metadata = { title: "Home" };
export default async function Page() { const c = await requirePage({ roles: ["student"] }); return <PortalHome base="/student" name={c.name.split(" ")[0]} />; }
