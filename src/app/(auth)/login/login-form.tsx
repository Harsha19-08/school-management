"use client";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { api, errMsg } from "@/lib/api/client";
import { Button, ErrorNote, Field, Input } from "@/components/ui/primitives";

const schema = z.object({ identifier: z.string().trim().min(1, "Enter your email or username"), password: z.string().min(1, "Enter your password"), remember: z.boolean().optional() });
type V = z.infer<typeof schema>;

export function LoginForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<V>({ resolver: zodResolver(schema) });
  return (
    <form className="space-y-4" noValidate onSubmit={handleSubmit(async (v) => {
      setError(null);
      try {
        const r = await api<{ redirect: string }>("/api/auth/login", {
          method: "POST",
          json: v,
          redirectOnUnauthorized: false,
        });
        router.replace(r.redirect);
        router.refresh();
      } catch (e) { setError(errMsg(e)); }
    })}>
      {error && <ErrorNote message={error} />}
      <Field label="Email or username" error={errors.identifier?.message}><Input autoComplete="username" autoFocus {...register("identifier")} /></Field>
      <Field label="Password" error={errors.password?.message}><Input type="password" autoComplete="current-password" {...register("password")} /></Field>
      <div className="flex items-center justify-between text-sm">
        <label className="flex items-center gap-2"><input type="checkbox" {...register("remember")} /> Remember me</label>
        <Link href="/forgot-password" className="text-interactive hover:underline">Forgot password?</Link>
      </div>
      <Button type="submit" className="w-full" loading={isSubmitting}>Sign in</Button>
    </form>
  );
}
