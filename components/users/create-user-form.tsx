"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { createUserAccountAction, type UserActionResult } from "@/app/actions/users";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";
import { roleLabels } from "@/lib/i18n";
import { createUserSchema, type CreateUserValues } from "@/lib/validation/users";
import type { UserRole } from "@/types";

function toFormData(values: CreateUserValues): FormData {
  const formData = new FormData();

  formData.set("displayName", values.displayName);
  formData.set("email", values.email);
  formData.set("password", values.password);
  formData.set("role", values.role);

  return formData;
}

function getFieldError(result: UserActionResult | null, fieldName: keyof CreateUserValues): string | undefined {
  return result?.fieldErrors?.[fieldName]?.[0];
}

export function CreateUserForm() {
  const [result, setResult] = useState<UserActionResult | null>(null);
  const form = useForm<CreateUserValues>({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      displayName: "",
      email: "",
      password: "",
      role: "technician",
    },
  });

  async function onSubmit(values: CreateUserValues): Promise<void> {
    setResult(null);
    const actionResult = await createUserAccountAction(toFormData(values));

    setResult(actionResult);

    if (actionResult.success) {
      form.reset({
        displayName: "",
        email: "",
        password: "",
        role: "technician",
      });
    }
  }

  return (
    <form className="grid gap-4 rounded-xl border border-slate-200 bg-white p-5 sm:grid-cols-2" dir="rtl" onSubmit={form.handleSubmit(onSubmit)}>
      <div className="sm:col-span-2">
        <h2 className="text-lg font-semibold text-slate-800">إنشاء مستخدم جديد</h2>
        <p className="mt-1 text-sm leading-6 text-slate-500">ينشئ حساب Firebase Auth ويضيف وثيقة المستخدم في Firestore.</p>
      </div>

      {result?.error ? <p className="rounded-lg bg-red-100 px-4 py-3 text-sm font-medium text-red-700 sm:col-span-2">{result.error}</p> : null}
      {result?.success ? (
        <p className="rounded-lg bg-green-100 px-4 py-3 text-sm font-medium text-green-700 sm:col-span-2">
          تم إنشاء المستخدم بنجاح.
        </p>
      ) : null}

      <TextField
        autoComplete="name"
        error={form.formState.errors.displayName?.message ?? getFieldError(result, "displayName")}
        id="displayName"
        label="الاسم"
        placeholder="مثال: أحمد علي"
        {...form.register("displayName")}
      />

      <TextField
        autoComplete="email"
        error={form.formState.errors.email?.message ?? getFieldError(result, "email")}
        id="email"
        label="البريد الإلكتروني"
        placeholder="user@company.com"
        type="email"
        {...form.register("email")}
      />

      <TextField
        autoComplete="new-password"
        error={form.formState.errors.password?.message ?? getFieldError(result, "password")}
        id="password"
        label="كلمة المرور"
        placeholder="8 أحرف أو أكثر"
        type="password"
        {...form.register("password")}
      />

      <div className="space-y-2">
        <label className="block text-sm font-bold text-[var(--foreground)]" htmlFor="role">
          الدور
        </label>
        <select
          className="min-h-11 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-base text-[var(--foreground)] shadow-control transition focus:border-[var(--focus)]"
          id="role"
          {...form.register("role")}
        >
          {(Object.keys(roleLabels) as UserRole[]).map((role) => (
            <option key={role} value={role}>
              {roleLabels[role]}
            </option>
          ))}
        </select>
      </div>

      <div className="sm:col-span-2">
        <Button className="sm:w-auto" disabled={form.formState.isSubmitting} isLoading={form.formState.isSubmitting} type="submit">
          إنشاء المستخدم
        </Button>
      </div>
    </form>
  );
}
