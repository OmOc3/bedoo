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
      <div className="rounded-xl border border-slate-200 bg-white p-5 text-center sm:p-6">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100 text-lg font-bold text-green-700">
          ✓
        </div>
        <h2 className="text-xl font-bold text-slate-900">تم حفظ التقرير بنجاح</h2>
        <p className="mt-2 text-base leading-7 text-slate-500">
          تم تسجيل تقرير {stationLabel} في{" "}
          {new Intl.DateTimeFormat("ar-EG", {
            dateStyle: "medium",
            timeStyle: "short",
          }).format(submittedAt ?? new Date())}
        </p>
        <Link
          className="mt-5 inline-flex min-h-[44px] w-full items-center justify-center rounded-lg bg-teal-700 px-4 py-3 text-base font-medium text-white transition-colors hover:bg-teal-600"
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
        <p className="rounded-lg bg-red-100 px-4 py-3 text-sm font-medium text-red-700" role="alert">
          {actionResult.error}
        </p>
      ) : null}

      <input type="hidden" value={stationId} {...form.register("stationId")} />

      <fieldset
        aria-describedby={statusError ? "status-error" : undefined}
        aria-invalid={Boolean(statusError)}
        className="space-y-2"
      >
        <legend className="mb-2 text-base font-bold text-slate-900">حالة المحطة</legend>
        {statusOptions.map((status) => (
          <label
            className="flex min-h-[44px] cursor-pointer items-center gap-3 rounded-xl border border-slate-200 p-4 transition-colors hover:border-teal-300 hover:bg-teal-50 has-[:checked]:border-teal-500 has-[:checked]:bg-teal-50"
            key={status}
          >
            <input
              className="h-5 w-5 rounded accent-teal-600"
              type="checkbox"
              value={status}
              {...form.register("status")}
            />
            <span className="text-base font-medium text-slate-700">{statusOptionLabels[status]}</span>
          </label>
        ))}
        {statusError ? (
          <p className="text-sm font-medium text-red-600" id="status-error" role="alert">
            {statusError}
          </p>
        ) : null}
      </fieldset>

      <div className="space-y-2">
        <label className="block text-base font-bold text-slate-900" htmlFor="notes">
          ملاحظات
        </label>
        <textarea
          aria-describedby={notesError ? "notes-error" : undefined}
          aria-invalid={Boolean(notesError)}
          className="min-h-24 w-full rounded-lg border border-slate-200 bg-white px-3 py-3 text-base text-slate-900 placeholder-slate-400 transition-colors focus:border-transparent focus:outline-none focus:ring-2 focus:ring-teal-500"
          id="notes"
          maxLength={500}
          placeholder="اختياري، حتى 500 حرف"
          {...form.register("notes")}
        />
        {notesError ? (
          <p className="text-sm font-medium text-red-600" id="notes-error" role="alert">
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
