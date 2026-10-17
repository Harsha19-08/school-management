"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api/client";

export interface Structure {
  years: { id: string; label: string; current: boolean }[];
  classes: { id: string; name: string; grade: number }[];
  sections: { id: string; classId: string; name: string }[];
  subjects: { id: string; name: string; code: string }[];
}
const empty: Structure = { years: [], classes: [], sections: [], subjects: [] };

/** Academic structure for the active school, used by filters and forms. */
export function useStructure() {
  const [data, setData] = useState<Structure>(empty);
  const [loading, setLoading] = useState(true);
  useEffect(() => { api<Structure>("/api/academics/structure").then(setData).catch(() => setData(empty)).finally(() => setLoading(false)); }, []);
  return { ...data, loading };
}
