"use client";
import { createContext, useContext, useState } from "react";
import { useFetch } from "@/hooks/use-fetch";
import { Select, Skeleton } from "@/components/ui/primitives";

interface Child { id: string; name: string; class: string; admissionNo: string }
const Ctx = createContext<{ childId: string | undefined; children: Child[]; ready: boolean }>({ childId: undefined, children: [], ready: false });
export const useChild = () => useContext(Ctx);

/** Parent child switcher. The selection is only a hint — the server re-checks every request against the guardian's linked children. */
export function ChildProvider({ children }: { children: React.ReactNode }) {
  const { data, loading } = useFetch<Child[]>("/api/parent/children");
  const [picked, setPicked] = useState<string | null>(null);
  const kids = data ?? []; const childId = picked && kids.some((k) => k.id === picked) ? picked : kids[0]?.id;
  return (
    <Ctx.Provider value={{ childId, children: kids, ready: !loading }}>
      {loading ? <Skeleton className="h-10 w-60" /> : kids.length === 0 ? <p className="rounded-xl bg-warning/10 p-3 text-sm text-warning">No student is linked to your account yet. Please contact the school office.</p> : (
        <>
          {kids.length > 1 && <div className="mb-5 max-w-xs"><Select aria-label="Choose child" value={childId} onChange={(e) => setPicked(e.target.value)}>{kids.map((k) => <option key={k.id} value={k.id}>{k.name} · {k.class}</option>)}</Select></div>}
          {kids.length === 1 && <p className="mb-4 text-sm text-muted">{kids[0].name} · {kids[0].class}</p>}
          {children}
        </>
      )}
    </Ctx.Provider>
  );
}
