"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { updateUserAccessCodeAction, type UserActionResult } from "@/app/actions/users";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";
import { updateUserAccessCodeSchema, type UpdateUserAccessCodeValues } from "@/lib/validation/users";

interface UserAccessCodeFormProps {
  targetUid: string;
}

const accessCodeAlphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function toFormData(values: UpdateUserAccessCodeValues): FormData {
  const formData = new FormData();

  formData.set("password", values.password);

  return formData;
}

function generateAccessCode(length = 10): string {
  const values = new Uint32Array(length);
  crypto.getRandomValues(values);

  return Array.from(values, (value) => accessCodeAlphabet[value % accessCodeAlphabet.length]).join("");
}

function getFieldError(result: UserActionResult | null): string | undefined {
  return result?.fieldErrors?.password?.[0];
}

export function UserAccessCodeForm({ targetUid }: UserAccessCodeFormProps) {
  const [result, setResult] = useState<UserActionResult | null>(null);
  const form = useForm<UpdateUserAccessCodeValues>({
    resolver: zodResolver(updateUserAccessCodeSchema),
    defaultValues: {
      password: "",
    },
  });

  async function onSubmit(values: UpdateUserAccessCodeValues): Promise<void> {
    setResult(null);
    const actionResult = await updateUserAccessCodeAction(targetUid, toFormData(values));

    setResult(actionResult);

    if (actionResult.success) {
      form.reset({ password: "" });
    }
  }

  return (
    <form className="mt-3 grid gap-2" dir="rtl" onSubmit={form.handleSubmit(onSubmit)}>
      <TextField
        autoComplete="off"
        error={form.formState.errors.password?.message ?? getFieldError(result)}
        id={`access-code-${targetUid}`}
        label="كود دخول جديد"
        placeholder="مثال: A7K9P2M4"
        {...form.register("password")}
      />
      <div className="flex flex-wrap gap-2">
        <Button
          className="min-h-11 px-3 py-2 text-sm sm:w-fit"
          onClick={() => form.setValue("password", generateAccessCode(), { shouldDirty: true, shouldValidate: true })}
          type="button"
          variant="secondary"
        >
          توليد
        </Button>
        <Button className="min-h-11 px-3 py-2 text-sm sm:w-fit" disabled={form.formState.isSubmitting} type="submit">
          تحديث الكود
        </Button>
      </div>
      {result?.error ? <p className="text-xs font-medium text-[var(--danger)]">{result.error}</p> : null}
      {result?.success ? <p className="text-xs font-medium text-[var(--success)]">تم تحديث كود الدخول.</p> : null}
    </form>
  );
}
