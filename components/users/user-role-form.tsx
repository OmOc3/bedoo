"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useId, useState } from "react";
import { useForm } from "react-hook-form";
import { updateUserRoleAction, type UserActionResult } from "@/app/actions/users";
import { Button } from "@/components/ui/button";
import { roleLabels } from "@/lib/i18n";
import { updateUserRoleSchema, type UpdateUserRoleValues } from "@/lib/validation/users";
import type { UserRole } from "@/types";

interface UserRoleFormProps {
  disabled?: boolean;
  targetUid: string;
  value: UserRole;
}

function toFormData(values: UpdateUserRoleValues): FormData {
  const formData = new FormData();

  formData.set("role", values.role);

  return formData;
}

export function UserRoleForm({ disabled = false, targetUid, value }: UserRoleFormProps) {
  const [result, setResult] = useState<UserActionResult | null>(null);
  const fieldId = useId();
  const roleSelectId = `user-role-${fieldId}`;
  const resultId = `user-role-result-${fieldId}`;
  const form = useForm<UpdateUserRoleValues>({
    resolver: zodResolver(updateUserRoleSchema),
    defaultValues: {
      role: value,
    },
  });

  async function onSubmit(values: UpdateUserRoleValues): Promise<void> {
    setResult(null);
    const actionResult = await updateUserRoleAction(targetUid, toFormData(values));

    setResult(actionResult);
  }

  return (
    <form className="flex flex-col gap-2" dir="rtl" onSubmit={form.handleSubmit(onSubmit)}>
      <div className="flex items-center gap-2">
        <label className="sr-only" htmlFor={roleSelectId}>
          الدور
        </label>
        <select
          aria-describedby={result ? resultId : undefined}
          className="min-h-11 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--foreground)] shadow-control transition-colors hover:border-[color-mix(in_srgb,var(--border)_50%,var(--foreground)_50%)] focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] disabled:bg-[var(--surface-subtle)] disabled:text-[var(--muted)]"
          disabled={disabled}
          id={roleSelectId}
          {...form.register("role")}
        >
          {(Object.keys(roleLabels) as UserRole[]).map((role) => (
            <option key={role} value={role}>
              {roleLabels[role]}
            </option>
          ))}
        </select>
        <Button className="min-h-11 px-3 py-2 text-sm sm:w-fit" disabled={disabled || form.formState.isSubmitting} type="submit">
          حفظ
        </Button>
      </div>
      {result?.error ? (
        <p className="text-xs font-medium text-[var(--danger)]" id={resultId} role="alert">
          {result.error}
        </p>
      ) : null}
      {result?.success ? (
        <p className="text-xs font-medium text-[var(--primary)]" id={resultId} role="status">
          تم تحديث الدور.
        </p>
      ) : null}
    </form>
  );
}
