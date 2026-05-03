"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";
import { isRecord } from "@/lib/utils";
import { clientSignupSchema, type ClientSignupValues } from "@/lib/validation/auth";
import type { ApiErrorResponse, LoginSuccessResponse, SupportContactSettings } from "@/types";

const clientSignupDeviceStorageKey = "ecopest.clientSignupDeviceId";
const clientSignupDeviceCookieName = "ecopest_client_signup_device_id";

function isSupportContactSettings(value: unknown): value is SupportContactSettings {
  return (
    isRecord(value) &&
    (value.phone === undefined || typeof value.phone === "string") &&
    (value.email === undefined || typeof value.email === "string") &&
    (value.hours === undefined || typeof value.hours === "string")
  );
}

function isAuthenticatedUserResponse(value: unknown): boolean {
  return (
    isRecord(value) &&
    typeof value.uid === "string" &&
    typeof value.email === "string" &&
    typeof value.displayName === "string" &&
    value.role === "client" &&
    value.isActive === true
  );
}

function isLoginSuccessResponse(value: unknown): value is LoginSuccessResponse {
  return isRecord(value) && typeof value.redirectTo === "string" && isAuthenticatedUserResponse(value.user);
}

function isApiErrorResponse(value: unknown): value is ApiErrorResponse {
  return (
    isRecord(value) &&
    typeof value.message === "string" &&
    typeof value.code === "string" &&
    (value.supportContact === undefined || isSupportContactSettings(value.supportContact))
  );
}

function normalizeDeviceId(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();

  return /^[A-Za-z0-9_-]{16,128}$/.test(trimmed) ? trimmed : null;
}

function readDeviceIdCookie(): string | null {
  if (typeof document === "undefined") {
    return null;
  }

  const cookie = document.cookie
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${clientSignupDeviceCookieName}=`));

  if (!cookie) {
    return null;
  }

  return normalizeDeviceId(decodeURIComponent(cookie.split("=").slice(1).join("=")));
}

function writeDeviceIdCookie(deviceId: string): void {
  if (typeof document === "undefined") {
    return;
  }

  document.cookie = `${clientSignupDeviceCookieName}=${encodeURIComponent(deviceId)}; Max-Age=31536000; Path=/; SameSite=Lax`;
}

function readStoredDeviceId(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    return normalizeDeviceId(window.localStorage.getItem(clientSignupDeviceStorageKey));
  } catch {
    return null;
  }
}

function writeStoredDeviceId(deviceId: string): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(clientSignupDeviceStorageKey, deviceId);
  } catch {
    // The cookie is still enough for the server-side device check in restricted browsers.
  }
}

function createDeviceId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID().replace(/-/g, "");
  }

  if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
    const bytes = new Uint8Array(24);

    crypto.getRandomValues(bytes);

    return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
  }

  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 18)}`;
}

function getOrCreateDeviceId(): string {
  const storedDeviceId = readStoredDeviceId();
  const cookieDeviceId = readDeviceIdCookie();
  const deviceId = storedDeviceId ?? cookieDeviceId ?? createDeviceId();

  writeStoredDeviceId(deviceId);
  writeDeviceIdCookie(deviceId);

  return deviceId;
}

export function ClientSignupForm() {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);
  const [supportContact, setSupportContact] = useState<SupportContactSettings | null>(null);
  const {
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
  } = useForm<ClientSignupValues>({
    resolver: zodResolver(clientSignupSchema),
    defaultValues: {
      accessCode: "",
      confirmAccessCode: "",
      addressesText: "",
      displayName: "",
      email: "",
      phone: "",
    },
  });

  async function onSubmit(values: ClientSignupValues): Promise<void> {
    try {
      setFormError(null);
      setSupportContact(null);
      const deviceId = getOrCreateDeviceId();
      const response = await fetch("/api/auth/client-signup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ...values, deviceId }),
      });
      const payload = (await response.json()) as unknown;

      if (!response.ok) {
        if (isApiErrorResponse(payload)) {
          setFormError(payload.message);
          setSupportContact(payload.code === "CLIENT_SIGNUP_DEVICE_EXISTS" ? (payload.supportContact ?? {}) : null);
        } else {
          setFormError("تعذر إنشاء حساب العميل.");
        }
        return;
      }

      if (!isLoginSuccessResponse(payload)) {
        setFormError("تم إنشاء الحساب لكن تعذر فتح بوابة العميل.");
        return;
      }

      router.replace(payload.redirectTo);
      router.refresh();
    } catch (_error: unknown) {
      setFormError("تعذر إنشاء حساب العميل. حاول مرة أخرى.");
    }
  }

  return (
    <form className="space-y-5" dir="rtl" onSubmit={handleSubmit(onSubmit)} noValidate>
      <TextField
        autoComplete="name"
        error={errors.displayName?.message}
        id="displayName"
        label="اسم العميل"
        placeholder="اسم الشركة أو الشخص"
        {...register("displayName")}
      />
      <TextField
        autoComplete="email"
        dir="ltr"
        error={errors.email?.message}
        id="signupEmail"
        inputMode="email"
        label="البريد الإلكتروني"
        placeholder="client@example.com"
        type="email"
        {...register("email")}
      />
      <TextField
        autoComplete="new-password"
        dir="ltr"
        error={errors.accessCode?.message}
        id="accessCode"
        label="كود الدخول"
        placeholder="8 أحرف أو أرقام على الأقل"
        type="password"
        {...register("accessCode")}
      />
      <TextField
        autoComplete="new-password"
        dir="ltr"
        error={errors.confirmAccessCode?.message}
        id="confirmAccessCode"
        label="تأكيد كود الدخول"
        placeholder="أعد إدخال نفس الكود"
        type="password"
        {...register("confirmAccessCode")}
      />
      <TextField
        autoComplete="tel"
        dir="ltr"
        error={errors.phone?.message}
        id="phone"
        inputMode="tel"
        label="رقم الهاتف"
        placeholder="+20..."
        {...register("phone")}
      />
      <div>
        <label className="mb-1.5 block text-sm font-medium text-[var(--foreground)]" htmlFor="addressesText">
          العنوان اختياري
        </label>
        <textarea
          aria-describedby={errors.addressesText?.message ? "addressesText-error" : undefined}
          aria-invalid={Boolean(errors.addressesText)}
          className="min-h-24 w-full resize-y rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 text-sm text-[var(--foreground)] shadow-control transition-colors duration-150 placeholder:text-[var(--muted)] hover:border-[color-mix(in_srgb,var(--border)_50%,var(--foreground)_50%)] focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] disabled:cursor-not-allowed disabled:bg-[var(--surface-subtle)] disabled:opacity-60"
          id="addressesText"
          placeholder="اكتب كل عنوان في سطر مستقل"
          {...register("addressesText")}
        />
        {errors.addressesText?.message ? (
          <p className="mt-1.5 flex items-center gap-1 text-xs text-[var(--danger)]" id="addressesText-error" role="alert">
            <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-[var(--danger)]" />
            {errors.addressesText.message}
          </p>
        ) : null}
      </div>
      {formError ? (
        <div
          className="rounded-lg border border-[var(--danger-muted)] bg-[var(--danger-soft)] px-4 py-3 text-sm font-semibold text-[var(--danger)]"
          role="alert"
        >
          {formError}
        </div>
      ) : null}
      {supportContact ? (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-subtle)] p-4">
          <h2 className="text-sm font-bold text-[var(--foreground)]">تواصل مع الدعم</h2>
          <div className="mt-3 grid gap-2 text-sm">
            {supportContact.phone ? (
              <a
                className="inline-flex min-h-11 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-2 font-semibold text-[var(--foreground)] transition-colors hover:bg-[var(--surface-subtle)]"
                dir="ltr"
                href={`tel:${supportContact.phone}`}
              >
                {supportContact.phone}
              </a>
            ) : null}
            {supportContact.email ? (
              <a
                className="inline-flex min-h-11 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-2 font-semibold text-[var(--foreground)] transition-colors hover:bg-[var(--surface-subtle)]"
                dir="ltr"
                href={`mailto:${supportContact.email}`}
              >
                {supportContact.email}
              </a>
            ) : null}
            {supportContact.hours ? (
              <p className="rounded-lg bg-[var(--surface)] px-4 py-3 text-sm leading-6 text-[var(--muted)]">
                مواعيد الدعم: <span className="font-semibold text-[var(--foreground)]">{supportContact.hours}</span>
              </p>
            ) : null}
            {!supportContact.phone && !supportContact.email && !supportContact.hours ? (
              <p className="text-sm leading-6 text-[var(--muted)]">
                بيانات الدعم لم تُضبط بعد. تواصل مع إدارة الشركة لمراجعة حسابك.
              </p>
            ) : null}
          </div>
        </div>
      ) : null}
      <Button isLoading={isSubmitting} type="submit">
        {isSubmitting ? "جاري إنشاء الحساب..." : "إنشاء حساب العميل"}
      </Button>
    </form>
  );
}
