import { redirect } from "next/navigation";
import { getCtx, homeFor } from "@/lib/authorization/context";
import { SCHOOL_THEMES } from "@/config/schools";
import { LoginForm } from "./login-form";

export const dynamic = "force-dynamic";
export const metadata = { title: "Sign in" };

export default async function LoginPage() {
  const ctx = await getCtx();
  if (ctx) redirect(homeFor(ctx.role));
  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      <section className="hidden flex-col justify-between bg-primary p-12 text-white lg:flex">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-white/70">School Platform</p>
        <div>
          <h1 className="text-6xl leading-[1.05]">One place for <span className="font-display italic text-accent">every</span> classroom.</h1>
          <p className="mt-6 max-w-md text-white/75">Admissions, attendance, results and fees for {SCHOOL_THEMES.das.name} and {SCHOOL_THEMES.stmarys.name} — each school fully separate.</p>
        </div>
        <p className="text-xs text-white/50">Access is limited to authorised staff, students and guardians.</p>
      </section>
      <section className="flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <h2 className="text-4xl text-primary">Welcome <span className="accent-italic">back</span></h2>
          <p className="mb-6 mt-2 text-sm text-muted">Sign in with your school email or username.</p>
          <LoginForm />
        </div>
      </section>
    </div>
  );
}
