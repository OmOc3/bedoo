"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
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
        <select
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-teal-500 disabled:bg-slate-50 disabled:text-slate-500"
          disabled={disabled}
          {...form.register("role")}
        >
          {(Object.keys(roleLabels) as UserRole[]).map((role) => (
            <option key={role} value={role}>
              {roleLabels[role]}
            </option>
          ))}
        </select>
        <Button className="min-h-10 px-3 py-2 text-sm sm:w-fit" disabled={disabled || form.formState.isSubmitting} type="submit">
          حفظ
        </Button>
      </div>
      {result?.error ? <p className="text-xs font-medium text-red-600">{result.error}</p> : null}
      {result?.success ? <p className="text-xs font-medium text-green-700">تم تحديث الدور.</p> : null}
    </form>
  );
}
