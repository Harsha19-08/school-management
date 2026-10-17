import { Card } from "@/components/ui/primitives";

export function KpiCard({ label, value, hint, tone }: { label: string; value: React.ReactNode; hint?: string; tone?: "warn" | "ok" }) {
  return (
    <Card className="p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</p>
      <p className={`mt-1 font-display text-3xl ${tone === "warn" ? "text-warning" : tone === "ok" ? "text-success" : "text-primary"}`}>{value}</p>
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </Card>
  );
}
