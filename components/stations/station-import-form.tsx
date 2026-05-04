"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import {
  applyStationImportAction,
  previewStationImportAction,
  type StationImportActionResult,
} from "@/app/actions/station-imports";
import { Button } from "@/components/ui/button";
import { stationImportFormSchema, type StationImportFormValues } from "@/lib/validation/station-imports";
import { stationImportTemplateCsv, type StationImportPreview } from "@/lib/stations/import-csv";
import {
  stationInstallationStatusLabels,
  stationTypeLabels,
} from "@ecopest/shared/constants";

interface ImportClientOption {
  displayName: string;
  uid: string;
}

interface ImportDocumentOption {
  clientUid: string;
  documentCategory: string;
  documentId: string;
  fileName: string;
  title: string;
}

interface StationImportFormProps {
  clients: ImportClientOption[];
  documents: ImportDocumentOption[];
  initialClientUid?: string;
}

function toFormData(values: StationImportFormValues): FormData {
  const formData = new FormData();
  formData.set("clientUid", values.clientUid);
  formData.set("csvText", values.csvText);
  formData.set("sourceName", values.sourceName);

  if (values.sourceDocumentId) {
    formData.set("sourceDocumentId", values.sourceDocumentId);
  }

  return formData;
}

function statusTone(status: "blocked" | "ready" | "warning"): string {
  if (status === "blocked") return "bg-red-100 text-red-800";
  if (status === "warning") return "bg-yellow-100 text-yellow-800";
  return "bg-green-100 text-green-800";
}

function statusLabel(status: "blocked" | "ready" | "warning"): string {
  if (status === "blocked") return "مرفوض";
  if (status === "warning") return "تحذير";
  return "جاهز";
}

function PreviewSummary({ preview }: { preview: StationImportPreview }) {
  return (
    <div className="grid gap-3 sm:grid-cols-4">
      <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-subtle)] p-3">
        <p className="text-xs font-semibold text-[var(--muted)]">الصفوف</p>
        <p className="mt-1 text-2xl font-extrabold text-[var(--foreground)]">{preview.rowCount}</p>
      </div>
      <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-green-800">
        <p className="text-xs font-semibold">قابلة للتطبيق</p>
        <p className="mt-1 text-2xl font-extrabold">{preview.readyCount}</p>
      </div>
      <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-3 text-yellow-800">
        <p className="text-xs font-semibold">تحذيرات</p>
        <p className="mt-1 text-2xl font-extrabold">{preview.warningCount}</p>
      </div>
      <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-red-800">
        <p className="text-xs font-semibold">مرفوضة</p>
        <p className="mt-1 text-2xl font-extrabold">{preview.blockedCount}</p>
      </div>
    </div>
  );
}

export function StationImportForm({ clients, documents, initialClientUid }: StationImportFormProps) {
  const defaultClientUid = initialClientUid ?? clients[0]?.uid ?? "";
  const [result, setResult] = useState<StationImportActionResult | null>(null);
  const [isApplying, setIsApplying] = useState(false);
  const form = useForm<StationImportFormValues>({
    resolver: zodResolver(stationImportFormSchema),
    defaultValues: {
      clientUid: defaultClientUid,
      csvText: defaultClientUid ? stationImportTemplateCsv(defaultClientUid) : "",
      sourceDocumentId: "",
      sourceName: "KODE Club import",
    },
  });
  const selectedClientUid = form.watch("clientUid");
  const availableDocuments = useMemo(
    () => documents.filter((document) => document.clientUid === selectedClientUid),
    [documents, selectedClientUid],
  );

  async function onPreview(values: StationImportFormValues): Promise<void> {
    setResult(null);
    const actionResult = await previewStationImportAction(toFormData(values));
    setResult(actionResult);
  }

  async function onApply(): Promise<void> {
    const values = form.getValues();
    setIsApplying(true);
    setResult(null);
    const actionResult = await applyStationImportAction(toFormData(values));
    setResult(actionResult);
    setIsApplying(false);
  }

  async function handleCsvFile(file: File | undefined): Promise<void> {
    if (!file) return;
    const text = await file.text();
    form.setValue("csvText", text, { shouldDirty: true, shouldValidate: true });
    if (!form.getValues("sourceName").trim()) {
      form.setValue("sourceName", file.name, { shouldDirty: true, shouldValidate: true });
    }
  }

  function loadTemplate(): void {
    const clientUid = form.getValues("clientUid");
    form.setValue("csvText", stationImportTemplateCsv(clientUid), { shouldDirty: true, shouldValidate: true });
  }

  const preview = result?.preview;
  const canApply = Boolean(preview && preview.rowCount > 0 && preview.blockedCount === 0 && !result?.success);

  return (
    <div className="space-y-6" dir="rtl">
      <form className="space-y-5 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-card" onSubmit={form.handleSubmit(onPreview)}>
        <div>
          <h2 className="text-lg font-bold text-[var(--foreground)]">استيراد محطات من CSV</h2>
          <p className="mt-1 text-sm leading-6 text-[var(--muted)]">
            المعاينة لا تنشئ محطات. التطبيق فقط ينشئ المحطات ويربطها بالعميل ويترك ظهورها للعميل مغلقًا.
          </p>
        </div>

        {result?.error ? (
          <p className="rounded-lg border border-[var(--danger-muted)] bg-[var(--danger-soft)] px-4 py-3 text-sm font-medium text-[var(--danger)]">
            {result.error}
          </p>
        ) : null}
        {result?.success && result.applyResult ? (
          <p className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-800">
            تم إنشاء {result.applyResult.createdStationIds.length} محطة. Batch: {result.applyResult.batchId}
          </p>
        ) : null}

        <div className="grid gap-4 md:grid-cols-2">
          <label className="block space-y-1.5">
            <span className="text-sm font-semibold text-[var(--foreground)]">العميل</span>
            <select
              className="min-h-11 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 text-sm text-[var(--foreground)] shadow-control focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
              {...form.register("clientUid", {
                onChange: () => {
                  form.setValue("sourceDocumentId", "", { shouldDirty: true });
                },
              })}
            >
              {clients.map((client) => (
                <option key={client.uid} value={client.uid}>
                  {client.displayName}
                </option>
              ))}
            </select>
          </label>

          <label className="block space-y-1.5">
            <span className="text-sm font-semibold text-[var(--foreground)]">مستند المصدر</span>
            <select
              className="min-h-11 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 text-sm text-[var(--foreground)] shadow-control focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
              {...form.register("sourceDocumentId")}
            >
              <option value="">بدون ربط مستند</option>
              {availableDocuments.map((document) => (
                <option key={document.documentId} value={document.documentId}>
                  {document.title} - {document.fileName}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className="block space-y-1.5">
          <span className="text-sm font-semibold text-[var(--foreground)]">اسم عملية الاستيراد</span>
          <input
            className="min-h-11 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 text-sm text-[var(--foreground)] shadow-control focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
            {...form.register("sourceName")}
          />
        </label>

        <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
          <label className="block space-y-1.5">
            <span className="text-sm font-semibold text-[var(--foreground)]">ملف CSV</span>
            <input
              accept=".csv,text/csv"
              className="block min-h-11 w-full cursor-pointer rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--foreground)] shadow-control file:me-3 file:rounded-md file:border-0 file:bg-[var(--surface-subtle)] file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-[var(--foreground)]"
              onChange={(event) => void handleCsvFile(event.target.files?.[0])}
              type="file"
            />
          </label>
          <Button onClick={loadTemplate} type="button" variant="secondary">
            تحميل مثال
          </Button>
        </div>

        <label className="block space-y-1.5">
          <span className="text-sm font-semibold text-[var(--foreground)]">محتوى CSV</span>
          <textarea
            className="min-h-64 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 font-mono text-sm text-[var(--foreground)] shadow-control focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
            dir="ltr"
            {...form.register("csvText")}
          />
        </label>

        {Object.values(form.formState.errors).some(Boolean) ? (
          <p className="text-sm font-semibold text-[var(--danger)]">
            تحقق من العميل، اسم المصدر، ومحتوى CSV قبل المعاينة.
          </p>
        ) : null}

        <div className="flex flex-wrap gap-3">
          <Button disabled={form.formState.isSubmitting} isLoading={form.formState.isSubmitting} type="submit">
            معاينة
          </Button>
          {canApply ? (
            <Button disabled={isApplying} isLoading={isApplying} onClick={onApply} type="button">
              تطبيق الاستيراد
            </Button>
          ) : null}
        </div>
      </form>

      {preview ? (
        <section className="space-y-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-card">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-[var(--foreground)]">نتيجة المعاينة</h2>
              <p className="mt-1 text-sm text-[var(--muted)]">حل الصفوف المرفوضة قبل تطبيق الاستيراد.</p>
            </div>
          </div>
          <PreviewSummary preview={preview} />
          {preview.conflicts.length > 0 ? (
            <div className="rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm font-medium text-yellow-800">
              {preview.conflicts.map((conflict) => (
                <p key={conflict}>{conflict}</p>
              ))}
            </div>
          ) : null}
          <div className="overflow-x-auto rounded-xl border border-[var(--border)]">
            <table className="w-full min-w-[980px]">
              <thead className="bg-[var(--surface-subtle)]">
                <tr>
                  <th className="px-3 py-2 text-right text-xs font-semibold text-[var(--muted)]">الصف</th>
                  <th className="px-3 py-2 text-right text-xs font-semibold text-[var(--muted)]">الحالة</th>
                  <th className="px-3 py-2 text-right text-xs font-semibold text-[var(--muted)]">المحطة</th>
                  <th className="px-3 py-2 text-right text-xs font-semibold text-[var(--muted)]">النوع</th>
                  <th className="px-3 py-2 text-right text-xs font-semibold text-[var(--muted)]">التركيب</th>
                  <th className="px-3 py-2 text-right text-xs font-semibold text-[var(--muted)]">المنطقة</th>
                  <th className="px-3 py-2 text-right text-xs font-semibold text-[var(--muted)]">المصدر</th>
                  <th className="px-3 py-2 text-right text-xs font-semibold text-[var(--muted)]">الملاحظات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)]">
                {preview.rows.slice(0, 100).map((row) => (
                  <tr className="align-top" key={`${row.rowNumber}-${row.fingerprint}`}>
                    <td className="px-3 py-2 text-sm text-[var(--muted)]">{row.rowNumber}</td>
                    <td className="px-3 py-2">
                      <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-bold ${statusTone(row.status)}`}>
                        {statusLabel(row.status)}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <p className="text-sm font-semibold text-[var(--foreground)]">{row.label}</p>
                      <p className="text-xs text-[var(--muted)]" dir="ltr">{row.externalCode ?? "-"}</p>
                    </td>
                    <td className="px-3 py-2 text-sm text-[var(--muted)]">{stationTypeLabels[row.stationType]}</td>
                    <td className="px-3 py-2 text-sm text-[var(--muted)]">{stationInstallationStatusLabels[row.installationStatus]}</td>
                    <td className="px-3 py-2 text-sm text-[var(--muted)]">{row.zone ?? "-"}</td>
                    <td className="px-3 py-2 text-sm text-[var(--muted)]">{row.sourceFile}</td>
                    <td className="px-3 py-2 text-xs leading-5 text-[var(--muted)]">
                      {[...row.errors, ...row.warnings].length > 0 ? [...row.errors, ...row.warnings].join(" | ") : "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {preview.rows.length > 100 ? (
            <p className="text-xs text-[var(--muted)]">تم عرض أول 100 صف فقط من المعاينة.</p>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
