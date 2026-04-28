"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";
import { i18n } from "@/lib/i18n";
import { isRecord } from "@/lib/utils";
import { loginFormSchema, type LoginFormValues } from "@/lib/validation/auth";
import type { ApiErrorResponse, LoginSuccessResponse } from "@/types";

function isAuthenticatedUserResponse(value: unknown): boolean {
  return (
    isRecord(value) &&
    typeof value.uid === "string" &&
    typeof value.email === "string" &&
    typeof value.displayName === "string" &&
    (value.role === "technician" || value.role === "supervisor" || value.role === "manager") &&
    value.isActive === true
  );
}

function isLoginSuccessResponse(value: unknown): value is LoginSuccessResponse {
  return (
    isRecord(value) &&
    typeof value.redirectTo === "string" &&
    isAuthenticatedUserResponse(value.user)
  );
}

function isApiErrorResponse(value: unknown): value is ApiErrorResponse {
  return isRecord(value) && typeof value.message === "string" && typeof value.code === "string";
}

function formatApiErrorMessage(payload: ApiErrorResponse): string {
  if (payload.code === "AUTH_LOGIN_FAILED" || payload.code.startsWith("AUTH_CONFIG_")) {
    return `${payload.message} (${payload.code})`;
  }

  return payload.message;
}

export function LoginForm() {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);
  const {
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  async function onSubmit(values: LoginFormValues): Promise<void> {
    try {
      setFormError(null);
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(values),
      });
      const payload = (await response.json()) as unknown;

      if (!response.ok) {
        setFormError(isApiErrorResponse(payload) ? formatApiErrorMessage(payload) : i18n.auth.genericLoginError);
        return;
      }

      if (!isLoginSuccessResponse(payload)) {
        setFormError(i18n.errors.unexpected);
        return;
      }

      router.replace(payload.redirectTo);
      router.refresh();
    } catch (_error: unknown) {
      setFormError(i18n.errors.unexpected);
    }
  }

  return (
    <form className="space-y-5" onSubmit={handleSubmit(onSubmit)} noValidate>
      <TextField
        autoComplete="email"
        dir="ltr"
        error={errors.email?.message}
        id="email"
        inputMode="email"
        label={i18n.auth.email}
        placeholder={i18n.auth.emailPlaceholder}
        type="email"
        {...register("email")}
      />
      <TextField
        autoComplete="current-password"
        dir="ltr"
        error={errors.password?.message}
        id="password"
        label={i18n.auth.password}
        placeholder={i18n.auth.passwordPlaceholder}
        type="password"
        {...register("password")}
      />
      {formError ? (
        <div
          className="rounded-lg border border-[var(--danger-muted)] bg-[var(--danger-soft)] px-4 py-3 text-sm font-semibold text-[var(--danger)]"
          role="alert"
        >
          {formError}
        </div>
      ) : null}
      <Button isLoading={isSubmitting} type="submit">
        {isSubmitting ? i18n.auth.signingIn : i18n.actions.login}
      </Button>
    </form>
  );
}
