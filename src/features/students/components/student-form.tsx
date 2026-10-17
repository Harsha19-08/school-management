"use client";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { api, fieldErrors, errMsg } from "@/lib/api/client";
import { Button, ErrorNote, Field, Input, Select } from "@/components/ui/primitives";
import { ClassSectionSelect } from "@/components/ui/class-section-select";

const schema = z.object({
  firstName: z.string().trim().min(1, "Required"), lastName: z.string().trim().min(1, "Required"), gender: z.enum(["male", "female", "other"]), dob: z.string().min(1, "Required"),
  classId: z.string().min(1, "Pick a class"), sectionId: z.string().min(1, "Pick a section"),
  guardianName: z.string().trim().min(2, "Required"), guardianPhone: z.string().trim().regex(/^[0-9+\-\s]{7,15}$/, "Enter a valid phone"), guardianEmail: z.string().trim().email("Invalid email").optional().or(z.literal("")),
});
type V = z.infer<typeof schema>;

export function StudentForm({ onDone }: { onDone: (id: string) => void }) {
  const { register, handleSubmit, setValue, watch, setError, formState: { errors, isSubmitting } } = useForm<V>({ resolver: zodResolver(schema), defaultValues: { gender: "male", classId: "", sectionId: "" } });
  const [err, setErr] = useState<string | null>(null);
  return (
    <form noValidate className="space-y-4" onSubmit={handleSubmit(async (v) => {
      setErr(null);
      try {
        const r = await api<{ id: string }>("/api/students", { method: "POST", json: { firstName: v.firstName, lastName: v.lastName, gender: v.gender, dob: v.dob, classId: v.classId, sectionId: v.sectionId, guardian: { name: v.guardianName, phone: v.guardianPhone, email: v.guardianEmail || undefined } } });
        onDone(r.id);
      } catch (e) { setErr(errMsg(e)); for (const [k, m] of Object.entries(fieldErrors(e))) setError(k as keyof V, { message: m }); }
    })}>
      {err && <ErrorNote message={err} />}
      <div className="grid grid-cols-2 gap-3">
        <Field label="First name" error={errors.firstName?.message}><Input {...register("firstName")} /></Field>
        <Field label="Last name" error={errors.lastName?.message}><Input {...register("lastName")} /></Field>
        <Field label="Gender"><Select {...register("gender")}><option value="male">Male</option><option value="female">Female</option><option value="other">Other</option></Select></Field>
        <Field label="Date of birth" error={errors.dob?.message}><Input type="date" {...register("dob")} /></Field>
      </div>
      <ClassSectionSelect classId={watch("classId")} sectionId={watch("sectionId")} onChange={(v) => { setValue("classId", v.classId, { shouldValidate: true }); setValue("sectionId", v.sectionId, { shouldValidate: true }); }} />
      {(errors.classId || errors.sectionId) && <p className="text-xs text-danger">{errors.classId?.message ?? errors.sectionId?.message}</p>}
      <p className="pt-1 text-xs font-semibold uppercase tracking-wide text-muted">Guardian</p>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Name" error={errors.guardianName?.message}><Input {...register("guardianName")} /></Field>
        <Field label="Phone" error={errors.guardianPhone?.message}><Input inputMode="tel" {...register("guardianPhone")} /></Field>
        <Field label="Email (optional)" error={errors.guardianEmail?.message} className="col-span-2"><Input type="email" {...register("guardianEmail")} /></Field>
      </div>
      <Button type="submit" className="w-full" loading={isSubmitting}>Add student</Button>
    </form>
  );
}
