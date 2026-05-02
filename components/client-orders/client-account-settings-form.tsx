"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState, type ChangeEvent } from "react";
import { useForm } from "react-hook-form";
import {
  updateClientAccountPasswordAction,
  updateClientAccountProfileAction,
  type ClientOrderActionResult,
} from "@/app/actions/client-orders";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";
import {
  updateClientAccountPasswordSchema,
  updateClientAccountProfileSchema,
  type UpdateClientAccountPasswordValues,
  type UpdateClientAccountProfileValues,
} from "@/lib/validation/client-orders";

interface ClientPortalUser {
  displayName: string;
  email: string;
  image?: string | null;
  passwordChangedAt?: string | null;
  uid: string;
}

interface ClientAccountSettingsFormProps {
  phone?: string;
  user: ClientPortalUser;
}

function toProfileFormData(values: UpdateClientAccountProfileValues, imageUrl?: string): FormData {
  const formData = new FormData();

  formData.set("displayName", values.displayName);
  formData.set("phone", values.phone ?? "");

  if (imageUrl) {
    formData.set("image", imageUrl);
  }

  return formData;
}

function toPasswordFormData(values: UpdateClientAccountPasswordValues): FormData {
  const formData = new FormData();

  formData.set("confirmPassword", values.confirmPassword);
  formData.set("currentPassword", values.currentPassword);
  formData.set("newPassword", values.newPassword);

  return formData;
}

function initials(name: string): string {
  const letters = Array.from(name.trim()).filter((letter) => letter.trim().length > 0);

  return letters.slice(0, 2).join("") || "عم";
}

function formatPasswordDate(value?: string | null): string {
  if (!value) {
    return "لم يتم تسجيل تغيير سابق";
  }

  return new Intl.DateTimeFormat("ar-EG", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function ResultMessage({ result, successText }: { result: ClientOrderActionResult | null; successText: string }) {
  if (!result?.error && !result?.success) {
    return null;
  }

  return (
    <p
      aria-live="polite"
      className={
        result.success
          ? "rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-900/30 dark:text-emerald-300"
          : "rounded-lg border border-[var(--danger-muted)] bg-[var(--danger-soft)] px-3 py-2 text-sm font-medium text-[var(--danger)]"
      }
    >
      {result.success ? successText : result.error}
    </p>
  );
}

export function ClientAccountSettingsForm({ phone, user }: ClientAccountSettingsFormProps) {
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [currentImage, setCurrentImage] = useState<string | null>(user.image ?? null);
  const [profileResult, setProfileResult] = useState<ClientOrderActionResult | null>(null);
  const [passwordResult, setPasswordResult] = useState<ClientOrderActionResult | null>(null);

  const profileForm = useForm<UpdateClientAccountProfileValues>({
    resolver: zodResolver(updateClientAccountProfileSchema),
    defaultValues: {
      displayName: user.displayName,
      phone: phone ?? "",
    },
  });

  const passwordForm = useForm<UpdateClientAccountPasswordValues>({
    resolver: zodResolver(updateClientAccountPasswordSchema),
    defaultValues: {
      confirmPassword: "",
      currentPassword: "",
      newPassword: "",
    },
  });

  function handleImageChange(event: ChangeEvent<HTMLInputElement>): void {
    const file = event.target.files?.[0] ?? null;

    if (imagePreview) {
      URL.revokeObjectURL(imagePreview);
    }

    setImageFile(file);
    setImagePreview(file ? URL.createObjectURL(file) : null);
  }

  async function uploadImage(): Promise<string | undefined> {
    if (!imageFile) {
      return undefined;
    }

    const imageFormData = new FormData();
    imageFormData.set("image", imageFile);

    const response = await fetch("/api/upload-profile-image", {
      body: imageFormData,
      method: "POST",
    });
    const payload = (await response.json()) as { error?: string; url?: string };

    if (!response.ok || !payload.url) {
      throw new Error(payload.error ?? "تعذر رفع الصورة. حاول مرة أخرى.");
    }

    return payload.url;
  }

  async function onProfileSubmit(values: UpdateClientAccountProfileValues): Promise<void> {
    setProfileResult(null);

    try {
      const imageUrl = await uploadImage();
      const actionResult = await updateClientAccountProfileAction(toProfileFormData(values, imageUrl));
      setProfileResult(actionResult);

      if (actionResult.success) {
        if (imageUrl) {
          setCurrentImage(imageUrl);
        }
        if (imagePreview) {
          URL.revokeObjectURL(imagePreview);
          setImagePreview(null);
        }
        setImageFile(null);
      }
    } catch (error: unknown) {
      setProfileResult({ error: error instanceof Error ? error.message : "حدث خطأ غير متوقع." });
    }
  }

  async function onPasswordSubmit(values: UpdateClientAccountPasswordValues): Promise<void> {
    setPasswordResult(null);
    const actionResult = await updateClientAccountPasswordAction(toPasswordFormData(values));
    setPasswordResult(actionResult);

    if (actionResult.success) {
      passwordForm.reset({
        confirmPassword: "",
        currentPassword: "",
        newPassword: "",
      });
    }
  }

  const visibleImage = imagePreview ?? currentImage;

  return (
    <details className="group rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-card transition-all duration-300 [&[open]]:shadow-card-md" dir="rtl">
      <summary className="flex cursor-pointer items-center justify-between gap-4 p-5 text-sm font-bold text-[var(--foreground)] transition-colors hover:bg-[var(--surface-subtle)] rounded-2xl [&[open]]:rounded-b-none">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full border border-[var(--border)] bg-gradient-to-br from-teal-500/10 to-teal-500/5 text-sm font-bold text-[var(--primary)] ring-2 ring-white/10 shadow-sm">
            {visibleImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img alt={user.displayName} className="h-full w-full object-cover" src={visibleImage} />
            ) : (
              initials(user.displayName)
            )}
          </div>
          <div className="min-w-0">
            <h2 className="text-base font-bold text-[var(--foreground)]">إعدادات الحساب</h2>
            <p className="mt-0.5 truncate text-xs text-[var(--muted)]" dir="ltr">
              {user.email}
            </p>
          </div>
        </div>
        <span className="text-[var(--muted)] transition-transform duration-300 group-open:-rotate-180">
          <svg aria-hidden="true" className="h-5 w-5" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
            <path d="m6 9 6 6 6-6" />
          </svg>
        </span>
      </summary>

      <div className="border-t border-[var(--border-subtle)] p-5">
        <form className="space-y-4" onSubmit={profileForm.handleSubmit(onProfileSubmit)}>
          <ResultMessage result={profileResult} successText="تم حفظ بيانات البروفايل." />

        <TextField
          autoComplete="name"
          disabled={profileForm.formState.isSubmitting}
          error={profileForm.formState.errors.displayName?.message}
          id={`client-display-name-${user.uid}`}
          label="الاسم"
          {...profileForm.register("displayName")}
        />

        <TextField
          autoComplete="tel"
          disabled={profileForm.formState.isSubmitting}
          error={profileForm.formState.errors.phone?.message}
          id={`client-phone-${user.uid}`}
          label="رقم الهاتف"
          placeholder="+20 10 0000 0000"
          type="tel"
          {...profileForm.register("phone")}
        />

        <div className="space-y-2">
          <label className="block text-sm font-medium text-[var(--muted)]" htmlFor={`client-image-${user.uid}`}>
            الصورة الشخصية
          </label>
          <input
            accept="image/*"
            className="block w-full text-sm text-[var(--muted)] file:me-3 file:rounded-md file:border-0 file:bg-teal-50 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-teal-700 hover:file:bg-teal-100 dark:file:bg-teal-900/30 dark:file:text-teal-300"
            disabled={profileForm.formState.isSubmitting}
            id={`client-image-${user.uid}`}
            onChange={handleImageChange}
            type="file"
          />
          {imageFile ? <p className="text-xs text-[var(--muted)]">{imageFile.name}</p> : null}
        </div>

          <Button
            className="sm:w-fit"
            disabled={profileForm.formState.isSubmitting}
            isLoading={profileForm.formState.isSubmitting}
            type="submit"
          >
            حفظ البروفايل
          </Button>
        </form>

        <div className="mt-6 border-t border-[var(--border-subtle)] pt-5">
          <div className="mb-4">
            <h3 className="text-base font-bold text-[var(--foreground)]">كلمة المرور</h3>
            <p className="mt-1 text-sm text-[var(--muted)]">آخر تغيير: {formatPasswordDate(user.passwordChangedAt)}</p>
          </div>

          <form className="space-y-4" onSubmit={passwordForm.handleSubmit(onPasswordSubmit)}>
            <ResultMessage result={passwordResult} successText="تم تحديث كلمة المرور." />

          <TextField
            autoComplete="current-password"
            disabled={passwordForm.formState.isSubmitting}
            error={passwordForm.formState.errors.currentPassword?.message}
            id={`client-current-password-${user.uid}`}
            label="كلمة المرور الحالية"
            type="password"
            {...passwordForm.register("currentPassword")}
          />
          <TextField
            autoComplete="new-password"
            disabled={passwordForm.formState.isSubmitting}
            error={passwordForm.formState.errors.newPassword?.message}
            id={`client-new-password-${user.uid}`}
            label="كلمة المرور الجديدة"
            type="password"
            {...passwordForm.register("newPassword")}
          />
          <TextField
            autoComplete="new-password"
            disabled={passwordForm.formState.isSubmitting}
            error={passwordForm.formState.errors.confirmPassword?.message}
            id={`client-confirm-password-${user.uid}`}
            label="تأكيد كلمة المرور"
            type="password"
            {...passwordForm.register("confirmPassword")}
          />

            <Button
              className="sm:w-fit"
              disabled={passwordForm.formState.isSubmitting}
              isLoading={passwordForm.formState.isSubmitting}
              type="submit"
              variant="secondary"
            >
              تحديث كلمة المرور
            </Button>
          </form>
        </div>
      </div>
    </details>
  );
}
