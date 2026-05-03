"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { submitStationReportAction, type SubmitReportActionResult } from "@/app/actions/reports";
import { Button } from "@/components/ui/button";
import { pestTypeLabels, statusOptionLabels } from "@/lib/i18n";
import { maxReportImageSizeBytes } from "@/lib/reports/image-constraints";
import { submitReportSchema, type SubmitReportValues } from "@/lib/validation/reports";
import type { PestTypeOption, StatusOption } from "@/types";
import { pestTypeOptions } from "@ecopest/shared/constants";

const statusOptions = Object.keys(statusOptionLabels) as StatusOption[];
const maxReportImagePayloadBytes = 11 * 1024 * 1024;

interface ReportFormProps {
  blockedReason?: string;
  canSubmit?: boolean;
  stationId: string;
  stationLabel: string;
}

function toFormData(values: SubmitReportValues): FormData {
  const formData = new FormData();

  values.status.forEach((status) => {
    formData.append("status", status);
  });

  values.pestTypes.forEach((pest) => {
    formData.append("pestTypes", pest);
  });

  if (values.notes) {
    formData.set("notes", values.notes);
  }

  if (values.beforePhoto instanceof File) {
    formData.set("beforePhoto", values.beforePhoto);
  }
  if (values.afterPhoto instanceof File) {
    formData.set("afterPhoto", values.afterPhoto);
  }
  if (values.stationPhoto instanceof File) {
    formData.set("stationPhoto", values.stationPhoto);
  }
  values.duringPhotos?.forEach((file) => {
    if (file instanceof File) {
      formData.append("duringPhotos", file);
    }
  });
  values.otherPhotos?.forEach((file) => {
    if (file instanceof File) {
      formData.append("otherPhotos", file);
    }
  });

  return formData;
}

function getFieldError(
  actionResult: SubmitReportActionResult | null,
  fieldName: keyof SubmitReportValues,
): string | undefined {
  return actionResult?.fieldErrors?.[fieldName]?.[0];
}

function selectedReportFiles(values: SubmitReportValues): File[] {
  return [
    values.beforePhoto,
    values.afterPhoto,
    values.stationPhoto,
    ...(values.duringPhotos ?? []),
    ...(values.otherPhotos ?? []),
  ].filter((file): file is File => file instanceof File && file.size > 0);
}

function imageSizeError(values: SubmitReportValues): string | null {
  const files = selectedReportFiles(values);
  const oversizedFile = files.find((file) => file.size > maxReportImageSizeBytes);

  if (oversizedFile) {
    return `حجم الصورة ${oversizedFile.name} يجب ألا يتجاوز 5 ميجابايت.`;
  }

  const totalBytes = files.reduce((total, file) => total + file.size, 0);

  if (totalBytes > maxReportImagePayloadBytes) {
    return "إجمالي صور التقرير كبير جدًا. قلل عدد الصور أو حجمها ثم حاول مرة أخرى.";
  }

  return null;
}

export function ReportForm({ blockedReason, canSubmit = true, stationId, stationLabel }: ReportFormProps) {
  const [actionResult, setActionResult] = useState<SubmitReportActionResult | null>(null);
  const [submittedAt, setSubmittedAt] = useState<Date | null>(null);
  const form = useForm<SubmitReportValues>({
    resolver: zodResolver(submitReportSchema),
    defaultValues: {
      stationId,
      status: [],
      pestTypes: [] as PestTypeOption[],
      notes: "",
    },
  });

  async function onSubmit(values: SubmitReportValues): Promise<void> {
    setActionResult(null);
    const fileError = imageSizeError(values);

    if (fileError) {
      setActionResult({ error: fileError });
      return;
    }

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
          className="mt-5 inline-flex min-h-[44px] w-full items-center justify-center rounded-lg bg-[var(--primary)] px-4 py-3 text-base font-semibold text-[var(--primary-foreground)] shadow-sm transition-all duration-150 hover:bg-[var(--primary-hover)] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2"
          href="/scan"
        >
          مسح محطة أخرى
        </Link>
      </div>
    );
  }

  const statusError = form.formState.errors.status?.message ?? getFieldError(actionResult, "status");
  const pestTypesError = form.formState.errors.pestTypes?.message ?? getFieldError(actionResult, "pestTypes");
  const notesError = form.formState.errors.notes?.message ?? getFieldError(actionResult, "notes");
  const duringPhotosError = form.formState.errors.duringPhotos?.message ?? getFieldError(actionResult, "duringPhotos");
  const otherPhotosError = form.formState.errors.otherPhotos?.message ?? getFieldError(actionResult, "otherPhotos");

  return (
    <form className="space-y-5" dir="rtl" onSubmit={form.handleSubmit(onSubmit)}>
      {actionResult?.error ? (
        <p className="rounded-lg border border-[var(--danger-muted)] bg-[var(--danger-soft)] px-4 py-3 text-sm font-medium text-[var(--danger)]" role="alert">
          {actionResult.error}
        </p>
      ) : null}

      {!canSubmit && blockedReason ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
          {blockedReason}
        </p>
      ) : null}

      <input type="hidden" value={stationId} {...form.register("stationId")} />

      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-subtle)] p-4">
        <h2 className="text-lg font-bold text-[var(--foreground)]">برنامج التنفيذ</h2>
        <p className="mt-1 text-sm text-[var(--muted)]">اختر نوعاً واحداً أو أكثر من أنواع الآفات المستهدفة في هذا الموقع.</p>
      </div>

      <fieldset
        aria-describedby={pestTypesError ? "pest-types-error" : undefined}
        aria-invalid={Boolean(pestTypesError)}
        className="space-y-2"
      >
        <legend className="mb-2 text-base font-bold text-[var(--foreground)]">أنواع الآفات (متعدد)</legend>
        {pestTypeOptions.map((pest) => (
          <label
            className="flex min-h-[44px] cursor-pointer items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 transition-colors hover:border-teal-300 hover:bg-teal-50 has-[:checked]:border-teal-500 has-[:checked]:bg-teal-50 dark:hover:bg-teal-900/30 dark:has-[:checked]:bg-teal-900/30"
            key={pest}
          >
            <input
              className="h-5 w-5 rounded accent-teal-600"
              type="checkbox"
              value={pest}
              {...form.register("pestTypes")}
            />
            <span className="text-base font-medium text-[var(--foreground)]">{pestTypeLabels[pest]}</span>
          </label>
        ))}
        {pestTypesError ? (
          <p className="text-sm font-medium text-[var(--danger)]" id="pest-types-error" role="alert">
            {pestTypesError}
          </p>
        ) : null}
      </fieldset>

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

      <div className="space-y-2">
        <p className="text-base font-bold text-[var(--foreground)]">صور التقرير (اختياري)</p>
        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--foreground)]" htmlFor="beforePhoto">قبل</label>
            <input
              accept="image/*"
              className="block min-h-11 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--muted)] file:me-3 file:rounded-md file:border-0 file:bg-teal-50 file:px-2 file:py-1.5 file:font-semibold file:text-teal-700 dark:file:bg-teal-900/30 dark:file:text-teal-300"
              id="beforePhoto"
              type="file"
              onChange={(event) => form.setValue("beforePhoto", event.target.files?.[0])}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--foreground)]" htmlFor="afterPhoto">بعد</label>
            <input
              accept="image/*"
              className="block min-h-11 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--muted)] file:me-3 file:rounded-md file:border-0 file:bg-teal-50 file:px-2 file:py-1.5 file:font-semibold file:text-teal-700 dark:file:bg-teal-900/30 dark:file:text-teal-300"
              id="afterPhoto"
              type="file"
              onChange={(event) => form.setValue("afterPhoto", event.target.files?.[0])}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--foreground)]" htmlFor="stationPhoto">المحطة</label>
            <input
              accept="image/*"
              className="block min-h-11 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--muted)] file:me-3 file:rounded-md file:border-0 file:bg-teal-50 file:px-2 file:py-1.5 file:font-semibold file:text-teal-700 dark:file:bg-teal-900/30 dark:file:text-teal-300"
              id="stationPhoto"
              type="file"
              onChange={(event) => form.setValue("stationPhoto", event.target.files?.[0])}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--foreground)]" htmlFor="duringPhotos">أثناء العمل</label>
            <input
              accept="image/*"
              className="block min-h-11 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--muted)] file:me-3 file:rounded-md file:border-0 file:bg-teal-50 file:px-2 file:py-1.5 file:font-semibold file:text-teal-700 dark:file:bg-teal-900/30 dark:file:text-teal-300"
              id="duringPhotos"
              multiple
              type="file"
              onChange={(event) => form.setValue("duringPhotos", Array.from(event.target.files ?? []), { shouldValidate: true })}
            />
            {duringPhotosError ? <p className="mt-1 text-xs text-[var(--danger)]">{duringPhotosError}</p> : null}
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--foreground)]" htmlFor="otherPhotos">صور إضافية</label>
            <input
              accept="image/*"
              className="block min-h-11 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--muted)] file:me-3 file:rounded-md file:border-0 file:bg-teal-50 file:px-2 file:py-1.5 file:font-semibold file:text-teal-700 dark:file:bg-teal-900/30 dark:file:text-teal-300"
              id="otherPhotos"
              multiple
              type="file"
              onChange={(event) => form.setValue("otherPhotos", Array.from(event.target.files ?? []), { shouldValidate: true })}
            />
            {otherPhotosError ? <p className="mt-1 text-xs text-[var(--danger)]">{otherPhotosError}</p> : null}
          </div>
        </div>
      </div>

      <Button className="w-full py-3 text-base" disabled={!canSubmit || form.formState.isSubmitting} isLoading={form.formState.isSubmitting} type="submit">
        حفظ التقرير
      </Button>
    </form>
  );
}
