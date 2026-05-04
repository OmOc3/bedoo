"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import type { BaseSyntheticEvent } from "react";
import { useForm } from "react-hook-form";
import {
  uploadClientAnalysisDocumentAction,
  type ClientVisibilityActionResult,
} from "@/app/actions/client-visibility";
import { Button } from "@/components/ui/button";
import {
  uploadClientAnalysisDocumentSchema,
  type UploadClientAnalysisDocumentValues,
} from "@/lib/validation/client-visibility";
import {
  clientAnalysisDocumentCategories,
  clientAnalysisDocumentCategoryLabels,
} from "@ecopest/shared/constants";

interface ClientAnalysisDocumentFormProps {
  clientUid: string;
}

export function ClientAnalysisDocumentForm({ clientUid }: ClientAnalysisDocumentFormProps) {
  const [result, setResult] = useState<ClientVisibilityActionResult | null>(null);
  const form = useForm<UploadClientAnalysisDocumentValues>({
    resolver: zodResolver(uploadClientAnalysisDocumentSchema),
    defaultValues: {
      clientUid,
      documentCategory: "import_source",
      title: "",
    },
  });

  async function onSubmit(values: UploadClientAnalysisDocumentValues, event?: BaseSyntheticEvent): Promise<void> {
    setResult(null);
    const target = event?.target;

    if (!(target instanceof HTMLFormElement)) {
      setResult({ error: "تعذر قراءة بيانات الملف." });
      return;
    }

    const formData = new FormData(target);
    formData.set("clientUid", values.clientUid);
    formData.set("documentCategory", values.documentCategory);
    formData.set("title", values.title);

    const actionResult = await uploadClientAnalysisDocumentAction(formData);
    setResult(actionResult);

    if (actionResult.success) {
      form.reset({ clientUid, documentCategory: "import_source", title: "" });
      target.reset();
    }
  }

  return (
    <form className="space-y-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-card" dir="rtl" onSubmit={form.handleSubmit(onSubmit)}>
      <div>
        <h2 className="text-lg font-bold text-[var(--foreground)]">التحليلات</h2>
        <p className="mt-1 text-sm leading-6 text-[var(--muted)]">ارفع ملف PDF أو Word ليظهر في بوابة العميل.</p>
      </div>

      <input type="hidden" {...form.register("clientUid")} />

      <label className="block space-y-1.5">
        <span className="text-sm font-semibold text-[var(--muted)]">تصنيف الملف</span>
        <select
          className="min-h-11 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--foreground)] shadow-control focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
          {...form.register("documentCategory")}
        >
          {clientAnalysisDocumentCategories.map((category) => (
            <option key={category} value={category}>
              {clientAnalysisDocumentCategoryLabels[category]}
            </option>
          ))}
        </select>
      </label>

      <label className="block space-y-1.5">
        <span className="text-sm font-semibold text-[var(--muted)]">عنوان الملف</span>
        <input
          className="min-h-11 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--foreground)] shadow-control focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
          {...form.register("title")}
        />
      </label>

      {form.formState.errors.title?.message ? (
        <p className="text-xs font-semibold text-[var(--danger)]">{form.formState.errors.title.message}</p>
      ) : null}

      <label className="block space-y-1.5">
        <span className="text-sm font-semibold text-[var(--muted)]">الملف</span>
        <input
          accept=".pdf,.doc,.docx,.xls,.xlsx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          className="block min-h-11 w-full cursor-pointer rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--foreground)] shadow-control file:me-3 file:rounded-md file:border-0 file:bg-[var(--surface-subtle)] file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-[var(--foreground)]"
          name="file"
          required
          type="file"
        />
      </label>

      {result?.error ? (
        <p className="rounded-lg border border-[var(--danger-muted)] bg-[var(--danger-soft)] px-4 py-3 text-sm font-medium text-[var(--danger)]">{result.error}</p>
      ) : null}
      {result?.success ? (
        <p className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-700">تم رفع الملف ونشره للعميل.</p>
      ) : null}

      <Button disabled={form.formState.isSubmitting} isLoading={form.formState.isSubmitting} type="submit">
        رفع الملف
      </Button>
    </form>
  );
}
