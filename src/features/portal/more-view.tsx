"use client";
import { useState } from "react";
import { Tabs } from "@/components/ui/primitives";
import { EventsView } from "@/features/events/components/events-view";
import { NoticesView } from "@/features/notices/components/notices-view";
import { DocumentsView } from "@/features/documents/components/documents-view";
import { ProfileView } from "@/features/teacher/profile-view";
import { LogoutButton } from "@/components/layout/topbar-widgets";

export function MoreView({ me }: { me: { name: string; email: string; role: string; school: string } }) {
  const [tab, setTab] = useState<"notices" | "events" | "documents" | "account">("notices");
  return (<><Tabs value={tab} onChange={setTab} tabs={[{ id: "notices", label: "Notices" }, { id: "events", label: "Events" }, { id: "documents", label: "Documents" }, { id: "account", label: "Account" }]} />
    {tab === "notices" && <NoticesView canWrite={false} />}{tab === "events" && <EventsView canWrite={false} />}{tab === "documents" && <DocumentsView canWrite={false} />}
    {tab === "account" && <div className="space-y-4"><ProfileView {...me} /><LogoutButton /></div>}</>);
}
