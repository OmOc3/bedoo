"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { addReviewReportAction, type ReviewReportActionResult } from "@/app/actions/reports";
import { Button } from "@/components/ui/button";
import { reviewReportSchema, type ReviewReportValues } from "@/lib/validation/reports";
import type { Report } from "@/types";

interface ReviewReportFormProps {
  reportId: string;
  reviewNotes?: string;
  reviewStatus: Report["reviewStatus"];
}

function toFormData(values: ReviewReportValues): FormData {
  const formData = new FormData();

  formData.set("reviewStatus", values.reviewStatus);

  if (values.reviewNotes) {
    formData.set("reviewNotes", values.reviewNotes);
  }

  return formData;
}

export function ReviewReportForm({ reportId, reviewNotes, reviewStatus }: ReviewReportFormProps) {
  const [result, setResult] = useState<ReviewReportActionResult | null>(null);
  const form = useForm<ReviewReportValues>({
    resolver: zodResolver(reviewReportSchema),
    defaultValues: {
      reviewStatus,
      reviewNotes: reviewNotes ?? "",
    },
  });

  async function onSubmit(values: ReviewReportValues): Promise<void> {
    setResult(null);
    const actionResult = await addReviewReportAction(reportId, toFormData(values));

    setResult(actionResult);
  }

  return (
    <form className="mt-3 grid gap-3 rounded-lg bg-slate-50 p-3" dir="rtl" onSubmit={form.handleSubmit(onSubmit)}>
      {result?.error ? <p className="text-sm font-medium text-red-600">{result.error}</p> : null}
      {result?.success ? <p className="text-sm font-medium text-green-700">تم حفظ المراجعة.</p> : null}

      <div className="space-y-1">
        <label className="block text-sm font-medium text-slate-700" htmlFor={`reviewStatus-${reportId}`}>
          حالة المراجعة
        </label>
        <select
          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-teal-500"
          id={`reviewStatus-${reportId}`}
          {...form.register("reviewStatus")}
        >
          <option value="pending">بانتظار المراجعة</option>
          <option value="reviewed">تمت المراجعة</option>
          <option value="rejected">مرفوض</option>
        </select>
      </div>

      <div className="space-y-1">
        <label className="block text-sm font-medium text-slate-700" htmlFor={`reviewNotes-${reportId}`}>
          ملاحظات المراجعة
        </label>
        <textarea
          className="min-h-20 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-teal-500"
          id={`reviewNotes-${reportId}`}
          maxLength={500}
          {...form.register("reviewNotes")}
        />
      </div>

      <Button
        className="sm:w-fit"
        disabled={form.formState.isSubmitting}
        isLoading={form.formState.isSubmitting}
        type="submit"
      >
        حفظ المراجعة
      </Button>
    </form>
  );
}
