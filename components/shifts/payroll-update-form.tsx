"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { updateShiftPayrollAction } from "@/app/actions/shifts";
import {
  updateShiftPayrollSchema,
  type UpdateShiftPayrollInputValues,
  type UpdateShiftPayrollValues,
} from "@/lib/validation/shifts";
import type { ShiftSalaryStatus } from "@/types";

interface PayrollUpdateFormProps {
  notes?: string;
  salaryAmount?: number;
  salaryStatus: ShiftSalaryStatus;
  shiftId: string;
}

const salaryOptions: Array<{ label: string; value: ShiftSalaryStatus }> = [
  { label: "قيد المراجعة", value: "pending" },
  { label: "تم الدفع", value: "paid" },
  { label: "غير مدفوع", value: "unpaid" },
];

export function PayrollUpdateForm({ notes, salaryAmount, salaryStatus, shiftId }: PayrollUpdateFormProps) {
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ text: string; type: "error" | "success" } | null>(null);
  const {
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
    setError,
  } = useForm<UpdateShiftPayrollInputValues, unknown, UpdateShiftPayrollValues>({
    defaultValues: {
      notes,
      salaryAmount,
      salaryStatus,
      shiftId,
    },
    resolver: zodResolver(updateShiftPayrollSchema),
  });

  function applyServerFieldErrors(fieldErrors: Partial<Record<keyof UpdateShiftPayrollValues, string[] | undefined>>): void {
    (Object.keys(fieldErrors) as Array<keyof UpdateShiftPayrollValues>).forEach((field) => {
      const firstMessage = fieldErrors[field]?.[0];
      if (firstMessage) {
        setError(field, { message: firstMessage, type: "server" });
      }
    });
  }

  function onSubmit(values: UpdateShiftPayrollValues): void {
    setMessage(null);
    startTransition(async () => {
      const result = await updateShiftPayrollAction(values);
      if (result.success) {
        setMessage({ text: "تم حفظ مراجعة الراتب.", type: "success" });
        return;
      }

      if (result.fieldErrors) {
        applyServerFieldErrors(result.fieldErrors);
      }
      setMessage({ text: result.error ?? "تعذر حفظ الراتب.", type: "error" });
    });
  }

  const isBusy = isSubmitting || isPending;

  return (
    <form className="grid gap-3" onSubmit={handleSubmit(onSubmit)}>
      <input type="hidden" {...register("shiftId")} />
      <div className="grid gap-3 sm:grid-cols-[minmax(8rem,1fr)_minmax(8rem,1fr)]">
        <label className="block space-y-1.5">
          <span className="text-sm font-medium text-[var(--muted)]">حالة الراتب</span>
          <select
            className="min-h-11 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm font-semibold text-[var(--foreground)] focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
            {...register("salaryStatus")}
          >
            {salaryOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          {errors.salaryStatus?.message ? <p className="text-sm text-[var(--danger)]">{errors.salaryStatus.message}</p> : null}
        </label>
        <label className="block space-y-1.5">
          <span className="text-sm font-medium text-[var(--muted)]">قيمة الراتب</span>
          <input
            className="min-h-11 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm font-semibold text-[var(--foreground)] placeholder:text-[var(--muted)] focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
            inputMode="decimal"
            min={0}
            placeholder="مثال: 250"
            step="0.01"
            type="number"
            {...register("salaryAmount")}
          />
          {errors.salaryAmount?.message ? <p className="text-sm text-[var(--danger)]">{errors.salaryAmount.message}</p> : null}
        </label>
      </div>
      <label className="block space-y-1.5">
        <span className="text-sm font-medium text-[var(--muted)]">ملاحظات الرواتب</span>
        <textarea
          className="min-h-20 w-full resize-y rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--foreground)] placeholder:text-[var(--muted)] focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
          placeholder="ملاحظة اختيارية للمدير"
          {...register("notes")}
        />
        {errors.notes?.message ? <p className="text-sm text-[var(--danger)]">{errors.notes.message}</p> : null}
      </label>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <button
          className="inline-flex min-h-11 items-center justify-center rounded-lg bg-[var(--primary)] px-4 py-2.5 text-sm font-semibold text-[var(--primary-foreground)] transition-colors hover:bg-[var(--primary-hover)] disabled:cursor-not-allowed disabled:opacity-50"
          disabled={isBusy}
          type="submit"
        >
          {isBusy ? "جار الحفظ..." : "حفظ الراتب"}
        </button>
        {message ? (
          <p className={`text-sm font-medium ${message.type === "success" ? "text-green-700" : "text-[var(--danger)]"}`}>
            {message.text}
          </p>
        ) : null}
      </div>
    </form>
  );
}
