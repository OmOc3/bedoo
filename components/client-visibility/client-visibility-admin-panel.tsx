import {
  toggleClientAnalysisDocumentVisibilityFormAction,
  toggleClientServiceAreaStatusFormAction,
  updateClientStationVisibilityFormAction,
} from "@/app/actions/client-visibility";
import { ClientAnalysisDocumentForm } from "@/components/client-visibility/client-analysis-document-form";
import { ClientServiceAreaForm } from "@/components/client-visibility/client-service-area-form";
import { StatusBadge } from "@/components/ui/status-badge";
import type { ClientAnalysisDocument, ClientServiceArea, ClientStationAccess } from "@/types";
import Image from "next/image";
import { clientAnalysisDocumentCategoryLabels } from "@ecopest/shared/constants";

interface ClientVisibilityAdminPanelProps {
  access: ClientStationAccess[];
  analysisDocuments: ClientAnalysisDocument[];
  clientUid: string;
  serviceAreas: ClientServiceArea[];
}

function fileTypeLabel(fileType: ClientAnalysisDocument["fileType"]): string {
  return fileType.toUpperCase();
}

function documentCategoryLabel(category: ClientAnalysisDocument["documentCategory"]): string {
  return clientAnalysisDocumentCategoryLabels[category];
}

export function ClientVisibilityAdminPanel({
  access,
  analysisDocuments,
  clientUid,
  serviceAreas,
}: ClientVisibilityAdminPanelProps) {
  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
      <section className="space-y-6">
        <ClientAnalysisDocumentForm clientUid={clientUid} />

        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-card">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-[var(--foreground)]">ملفات التحليلات المنشورة</h2>
              <p className="mt-1 text-sm text-[var(--muted)]">الملفات الظاهرة هنا يمكن إظهارها أو إخفاؤها من بوابة العميل.</p>
            </div>
            <StatusBadge tone="inactive">{analysisDocuments.length} ملف</StatusBadge>
          </div>

          {analysisDocuments.length === 0 ? (
            <p className="mt-5 rounded-lg bg-[var(--surface-subtle)] p-4 text-sm text-[var(--muted)]">لا توجد ملفات مرفوعة لهذا العميل.</p>
          ) : (
            <div className="mt-5 divide-y divide-[var(--border-subtle)] rounded-xl border border-[var(--border)]">
              {analysisDocuments.map((document) => (
                <article className="grid gap-3 p-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center" key={document.documentId}>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-sm font-bold text-[var(--foreground)]">{document.title}</h3>
                      <StatusBadge tone={document.isVisibleToClient ? "reviewed" : "inactive"}>
                        {document.isVisibleToClient ? "ظاهر للعميل" : "مخفي"}
                      </StatusBadge>
                      <span className="rounded-full bg-[var(--surface-subtle)] px-2 py-1 text-xs font-bold text-[var(--muted)]">
                        {fileTypeLabel(document.fileType)}
                      </span>
                      <span className="rounded-full bg-[var(--surface-subtle)] px-2 py-1 text-xs font-bold text-[var(--muted)]">
                        {documentCategoryLabel(document.documentCategory)}
                      </span>
                    </div>
                    <p className="mt-1 truncate text-xs text-[var(--muted)]">{document.fileName}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <a
                      className="inline-flex min-h-10 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-xs font-semibold text-[var(--foreground)] hover:bg-[var(--surface-subtle)]"
                      href={document.fileUrl}
                      rel="noreferrer"
                      target="_blank"
                    >
                      فتح الملف
                    </a>
                    <form action={toggleClientAnalysisDocumentVisibilityFormAction}>
                      <input name="documentId" type="hidden" value={document.documentId} />
                      <input name="isVisibleToClient" type="hidden" value={document.isVisibleToClient ? "false" : "true"} />
                      <button className="inline-flex min-h-10 items-center justify-center rounded-lg bg-[var(--primary)] px-3 py-2 text-xs font-semibold text-[var(--primary-foreground)]" type="submit">
                        {document.isVisibleToClient ? "إخفاء" : "نشر"}
                      </button>
                    </form>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-card">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-[var(--foreground)]">ظهور المحطات للعميل</h2>
              <p className="mt-1 text-sm text-[var(--muted)]">حدد هل يرى العميل المحطة نفسها وهل يرى تقاريرها المعتمدة.</p>
            </div>
            <StatusBadge tone="inactive">{access.length} محطة</StatusBadge>
          </div>

          {access.length === 0 ? (
            <p className="mt-5 rounded-lg bg-[var(--surface-subtle)] p-4 text-sm text-[var(--muted)]">اربط محطات بالعميل أولا من نموذج المحطات.</p>
          ) : (
            <div className="mt-5 space-y-3">
              {access.map((entry) => (
                <form
                  action={updateClientStationVisibilityFormAction}
                  className="rounded-xl border border-[var(--border)] bg-[var(--surface-subtle)] p-4"
                  key={entry.accessId}
                >
                  <input name="clientUid" type="hidden" value={entry.clientUid} />
                  <input name="stationId" type="hidden" value={entry.stationId} />
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-bold text-[var(--foreground)]">{entry.stationLabel ?? entry.stationId}</h3>
                      <p className="mt-1 text-xs text-[var(--muted)]" dir="ltr">#{entry.stationId}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <label className="inline-flex items-center gap-2 rounded-lg bg-[var(--surface)] px-3 py-2 text-xs font-semibold text-[var(--foreground)]">
                        <input defaultChecked={entry.stationVisibleToClient} name="stationVisibleToClient" type="checkbox" />
                        حالة المحطة
                      </label>
                      <label className="inline-flex items-center gap-2 rounded-lg bg-[var(--surface)] px-3 py-2 text-xs font-semibold text-[var(--foreground)]">
                        <input defaultChecked={entry.reportsVisibleToClient} name="reportsVisibleToClient" type="checkbox" />
                        التقارير
                      </label>
                      <button className="inline-flex min-h-9 items-center rounded-lg bg-[var(--primary)] px-3 py-1.5 text-xs font-semibold text-[var(--primary-foreground)]" type="submit">
                        حفظ
                      </button>
                    </div>
                  </div>
                </form>
              ))}
            </div>
          )}
        </div>
      </section>

      <aside className="space-y-6">
        <ClientServiceAreaForm clientUid={clientUid} />

        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-card">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-[var(--foreground)]">QR المناطق</h2>
              <p className="mt-1 text-sm text-[var(--muted)]">يستخدمه الفني لتسجيل حالة الرش اليومية.</p>
            </div>
            <StatusBadge tone="inactive">{serviceAreas.length} منطقة</StatusBadge>
          </div>

          {serviceAreas.length === 0 ? (
            <p className="mt-5 rounded-lg bg-[var(--surface-subtle)] p-4 text-sm text-[var(--muted)]">لا توجد مناطق لهذا العميل.</p>
          ) : (
            <div className="mt-5 space-y-3">
              {serviceAreas.map((area) => (
                <article className="rounded-xl border border-[var(--border)] bg-[var(--surface-subtle)] p-4" key={area.areaId}>
                  <div className="flex items-start gap-3">
                    <Image
                      alt={`QR ${area.name}`}
                      className="h-24 w-24 rounded-lg border border-[var(--border)] bg-white p-1"
                      height={96}
                      src={`/api/service-areas/${encodeURIComponent(area.areaId)}/qr`}
                      unoptimized
                      width={96}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-sm font-bold text-[var(--foreground)]">{area.name}</h3>
                        <StatusBadge tone={area.isActive ? "active" : "inactive"}>{area.isActive ? "نشطة" : "موقوفة"}</StatusBadge>
                      </div>
                      <p className="mt-1 text-xs leading-5 text-[var(--muted)]">{area.location}</p>
                      <a className="mt-2 inline-flex text-xs font-semibold text-[var(--primary)] hover:underline" href={area.qrCodeValue} rel="noreferrer" target="_blank">
                        فتح رابط QR
                      </a>
                    </div>
                  </div>
                  <form action={toggleClientServiceAreaStatusFormAction} className="mt-3">
                    <input name="areaId" type="hidden" value={area.areaId} />
                    <input name="isActive" type="hidden" value={area.isActive ? "false" : "true"} />
                    <button className="inline-flex min-h-9 w-full items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-xs font-semibold text-[var(--foreground)] hover:bg-[var(--surface-subtle)]" type="submit">
                      {area.isActive ? "إيقاف المنطقة" : "تفعيل المنطقة"}
                    </button>
                  </form>
                </article>
              ))}
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}
