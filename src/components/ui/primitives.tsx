"use client";
import * as React from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type BtnProps = React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "ghost" | "danger"; size?: "sm" | "md"; loading?: boolean };
export const Button = React.forwardRef<HTMLButtonElement, BtnProps>(function Button({ variant = "primary", size = "md", loading, className, children, disabled, ...p }, ref) {
  const v = { primary: "bg-interactive text-white hover:bg-hover", secondary: "bg-surface text-ink border border-line hover:bg-soft", ghost: "text-ink hover:bg-soft", danger: "bg-danger text-white hover:opacity-90" }[variant];
  return (
    <button ref={ref} disabled={disabled || loading} className={cn("inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed", size === "sm" ? "h-8 px-3 text-xs" : "h-10 px-4 text-sm", v, className)} {...p}>
      {loading && <Loader2 className="size-4 animate-spin" aria-hidden />}{children}
    </button>
  );
});

const field = "w-full rounded-xl border border-line bg-surface px-3 text-sm text-ink placeholder:text-muted focus:border-interactive disabled:bg-canvas";
export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(function Input({ className, ...p }, ref) { return <input ref={ref} className={cn(field, "h-10", className)} {...p} />; });
export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(function Textarea({ className, ...p }, ref) { return <textarea ref={ref} className={cn(field, "py-2 min-h-24", className)} {...p} />; });
export const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(function Select({ className, children, ...p }, ref) { return <select ref={ref} className={cn(field, "h-10", className)} {...p}>{children}</select>; });

export function Field({ label, error, hint, children, className }: { label: string; error?: string; hint?: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={cn("block space-y-1.5", className)}>
      <span className="text-xs font-semibold text-ink">{label}</span>
      {children}
      {hint && !error && <span className="block text-xs text-muted">{hint}</span>}
      {error && <span role="alert" className="block text-xs text-danger">{error}</span>}
    </label>
  );
}

export function Card({ className, ...p }: React.HTMLAttributes<HTMLDivElement>) { return <div className={cn("rounded-[14px] border border-line bg-surface p-5", className)} {...p} />; }

const tones = { neutral: "bg-canvas text-muted border-line", success: "bg-success/10 text-success border-success/20", warning: "bg-warning/10 text-warning border-warning/20", danger: "bg-danger/10 text-danger border-danger/20", info: "bg-soft text-primary border-transparent" } as const;
export function Badge({ tone = "neutral", className, ...p }: React.HTMLAttributes<HTMLSpanElement> & { tone?: keyof typeof tones }) { return <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold capitalize", tones[tone], className)} {...p} />; }

export function PageHeader({ title, accent, subtitle, actions }: { title: string; accent?: string; subtitle?: string; actions?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-3xl text-primary">{title}{accent && <> <span className="accent-italic">{accent}</span></>}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function EmptyState({ title, hint, action }: { title: string; hint?: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-[14px] border border-dashed border-line bg-surface px-6 py-12 text-center">
      <p className="font-display text-xl text-primary">{title}</p>
      {hint && <p className="max-w-sm text-sm text-muted">{hint}</p>}
      {action}
    </div>
  );
}

export const Skeleton = ({ className }: { className?: string }) => <div className={cn("animate-pulse rounded-lg bg-line/70", className)} />;
export function ErrorNote({ message }: { message: string }) { return <p role="alert" className="rounded-xl border border-danger/20 bg-danger/5 px-3 py-2 text-sm text-danger">{message}</p>; }

export function Tabs<T extends string>({ tabs, value, onChange }: { tabs: { id: T; label: string }[]; value: T; onChange: (v: T) => void }) {
  return (
    <div role="tablist" className="mb-5 flex gap-1 overflow-x-auto border-b border-line">
      {tabs.map((t) => (
        <button key={t.id} role="tab" aria-selected={value === t.id} onClick={() => onChange(t.id)} className={cn("whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-semibold transition", value === t.id ? "border-interactive text-primary" : "border-transparent text-muted hover:text-ink")}>{t.label}</button>
      ))}
    </div>
  );
}
