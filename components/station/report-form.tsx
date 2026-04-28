"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { submitStationReportAction, type SubmitReportActionResult } from "@/app/actions/reports";
import { Button } from "@/components/ui/button";
import { statusOptionLabels } from "@/lib/i18n";
import { submitReportSchema, type SubmitReportValues } from "@/lib/validation/reports";
import type { StatusOption } from "@/types";

const statusOptions = Object.keys(statusOptionLabels) as StatusOption[];

interface ReportFormProps {
  stationId: string;
  stationLabel: string;
}

function toFormData(values: SubmitReportValues): FormData {
  const formData = new FormData();

  values.status.forEach((status) => {
    formData.append("status", status);
  });

  if (values.notes) {
    formData.set("notes", values.notes);
  }

  return formData;
}

function getFieldError(
  actionResult: SubmitReportActionResult | null,
  fieldName: keyof SubmitReportValues,
): string | undefined {
  return actionResult?.fieldErrors?.[fieldName]?.[0];
}

export function ReportForm({ stationId, stationLabel }: ReportFormProps) {
  const [actionResult, setActionResult] = useState<SubmitReportActionResult | null>(null);
  const [submittedAt, setSubmittedAt] = useState<Date | null>(null);
  const form = useForm<SubmitReportValues>({
    resolver: zodResolver(submitReportSchema),
    defaultValues: {
      stationId,
      status: [],
      notes: "",
    },
  });

  async function onSubmit(values: SubmitReportValues): Promise<void> {
    setActionResult(null);
    const result = await submitStationReportAction(stationId, toFormData(values));

    if (result.success) {
      setSubmittedAt(new Date());
    }

    setActionResult(result);
  }

  if (actionResult?.success) {
    return (
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 text-center shadow-card sm:p-6">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--success-soft)] text-lg font-bold text-[var(--success)]">
          ✓
        </div>
        <h2 className="text-xl font-bold text-[var(--foreground)]">تم حفظ التقرير بنجاح</h2>
        <p className="mt-2 text-base leading-7 text-[var(--muted)]">
          تم تسجيل تقرير {stationLabel} في{" "}
          {new Intl.DateTimeFormat("ar-EG", {
            dateStyle: "medium",
            timeStyle: "short",
          }).format(submittedAt ?? new Date())}
        </p>
        <Link
          className="mt-5 inline-flex min-h-[44px] w-full items-center justify-center rounded-lg bg-[var(--primary)] px-4 py-3 text-base font-semibold text-white shadow-sm transition-all duration-150 hover:bg-[var(--primary-hover)] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2"
          href="/scan"
        >
          مسح محطة أخرى
        </Link>
      </div>
    );
  }

  const statusError = form.formState.errors.status?.message ?? getFieldError(actionResult, "status");
  const notesError = form.formState.errors.notes?.message ?? getFieldError(actionResult, "notes");

  return (
    <form className="space-y-5" dir="rtl" onSubmit={form.handleSubmit(onSubmit)}>
      {actionResult?.error ? (
        <p className="rounded-lg border border-[var(--danger-muted)] bg-[var(--danger-soft)] px-4 py-3 text-sm font-medium text-[var(--danger)]" role="alert">
          {actionResult.error}
        </p>
      ) : null}

      <input type="hidden" value={stationId} {...form.register("stationId")} />

      <fieldset
        aria-describedby={statusError ? "status-error" : undefined}
        aria-invalid={Boolean(statusError)}
        className="space-y-2"
      >
        <legend className="mb-2 text-base font-bold text-[var(--foreground)]">حالة المحطة</legend>
        {statusOptions.map((status) => (
          <label
            className="flex min-h-[44px] cursor-pointer items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 transition-colors hover:border-teal-300 hover:bg-teal-50 has-[:checked]:border-teal-500 has-[:checked]:bg-teal-50 dark:hover:bg-teal-900/30 dark:has-[:checked]:bg-teal-900/30"
            key={status}
          >
            <input
              className="h-5 w-5 rounded accent-teal-600"
              type="checkbox"
              value={status}
              {...form.register("status")}
            />
            <span className="text-base font-medium text-[var(--foreground)]">{statusOptionLabels[status]}</span>
          </label>
        ))}
        {statusError ? (
          <p className="text-sm font-medium text-[var(--danger)]" id="status-error" role="alert">
            {statusError}
          </p>
        ) : null}
      </fieldset>

      <div className="space-y-2">
        <label className="block text-base font-bold text-[var(--foreground)]" htmlFor="notes">
          ملاحظات
        </label>
        <textarea
          aria-describedby={notesError ? "notes-error" : undefined}
          aria-invalid={Boolean(notesError)}
          className="min-h-24 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-3 text-base text-[var(--foreground)] placeholder:text-[var(--muted)] transition-colors hover:border-[color-mix(in_srgb,var(--border)_50%,var(--foreground)_50%)] focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
          id="notes"
          maxLength={500}
          placeholder="اختياري، حتى 500 حرف"
          {...form.register("notes")}
        />
        {notesError ? (
          <p className="text-sm font-medium text-[var(--danger)]" id="notes-error" role="alert">
            {notesError}
          </p>
        ) : null}
      </div>

      <Button className="w-full py-3 text-base" disabled={form.formState.isSubmitting} isLoading={form.formState.isSubmitting} type="submit">
        حفظ التقرير
      </Button>
    </form>
  );
}
