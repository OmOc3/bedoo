"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { createUserAccountAction, type UserActionResult } from "@/app/actions/users";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";
import { roleLabels } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { createUserSchema, type CreateUserValues } from "@/lib/validation/users";
import type { UserRole } from "@/types";

const accessCodeAlphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function toFormData(values: CreateUserValues): FormData {
  const formData = new FormData();

  formData.set("displayName", values.displayName);
  formData.set("email", values.email);
  formData.set("password", values.password);
  formData.set("role", values.role);
  if (values.image) {
    formData.set("image", values.image);
  }

  return formData;
}

function getFieldError(result: UserActionResult | null, fieldName: keyof CreateUserValues): string | undefined {
  return result?.fieldErrors?.[fieldName]?.[0];
}

function generateAccessCode(length = 10): string {
  const values = new Uint32Array(length);
  crypto.getRandomValues(values);

  return Array.from(values, (value) => accessCodeAlphabet[value % accessCodeAlphabet.length]).join("");
}

export function CreateUserForm({ embedded = false }: { embedded?: boolean } = {}) {
  const [result, setResult] = useState<UserActionResult | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
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

    let imageUrl = values.image;
    if (imageFile) {
      const fileForm = new FormData();
      fileForm.set("image", imageFile);
      // We don't send uid because the user doesn't exist yet! We need to upload the image without uid, 
      // or we can wait, the backend might require uid.
      // Wait, in app/api/upload-profile-image/route.ts, if there's no uid, it uses session.user.id!
      // This means the image will be uploaded to the admin's folder if we don't provide uid. That's fine, it's just a cloudinary path.
      
      const res = await fetch("/api/upload-profile-image", { method: "POST", body: fileForm });
      if (res.ok) {
        const { url } = await res.json();
        imageUrl = url;
      }
    }

    const finalValues = { ...values, image: imageUrl };
    const actionResult = await createUserAccountAction(toFormData(finalValues));

    setResult(actionResult);

    if (actionResult.success) {
      form.reset({
        displayName: "",
        email: "",
        password: "",
        role: "technician",
      });
      setImageFile(null);
    }
  }

  return (
    <form
      className={cn(
        "grid gap-4 sm:grid-cols-2",
        embedded ? null : "rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-card",
      )}
      dir="rtl"
      onSubmit={form.handleSubmit(onSubmit)}
    >
      <div className="sm:col-span-2">
        <h2 className="section-heading text-base">إنشاء مستخدم جديد</h2>
        <p className="mt-1 text-sm leading-6 text-[var(--muted)]">إنشاء مستخدم جديد في قاعدة البيانات.</p>
      </div>

      {result?.error ? <p className="rounded-lg border border-[var(--danger-muted)] bg-[var(--danger-soft)] px-4 py-3 text-sm font-medium text-[var(--danger)] sm:col-span-2">{result.error}</p> : null}
      {result?.success ? (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-900/30 dark:text-emerald-300 sm:col-span-2">
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

      <div className="space-y-2">
        <label className="block text-sm font-semibold text-[var(--foreground)]" htmlFor="image">
          الصورة الشخصية (اختياري)
        </label>
        <input
          accept="image/*"
          className="block w-full text-sm text-[var(--muted)] file:mr-4 file:rounded-full file:border-0 file:bg-teal-50 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-teal-700 hover:file:bg-teal-100 dark:file:bg-teal-900/30 dark:file:text-teal-300"
          id="image"
          onChange={(e) => setImageFile(e.target.files?.[0] ?? null)}
          type="file"
        />
      </div>

      <TextField
        autoComplete="email"
        error={form.formState.errors.email?.message ?? getFieldError(result, "email")}
        id="email"
        label="البريد الإلكتروني"
        placeholder="user@company.com"
        type="email"
        {...form.register("email")}
      />

      <div className="space-y-2">
        <TextField
          autoComplete="off"
          error={form.formState.errors.password?.message ?? getFieldError(result, "password")}
          id="password"
          label="كود الدخول"
          placeholder="مثال: A7K9P2M4"
          {...form.register("password")}
        />
        <Button
          className="w-full sm:w-auto"
          onClick={() => form.setValue("password", generateAccessCode(), { shouldDirty: true, shouldValidate: true })}
          type="button"
          variant="secondary"
        >
          توليد كود
        </Button>
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-semibold text-[var(--foreground)]" htmlFor="role">
          الدور
        </label>
        <select
          className="min-h-11 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 text-sm text-[var(--foreground)] shadow-control transition-colors hover:border-[color-mix(in_srgb,var(--border)_50%,var(--foreground)_50%)] focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
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
