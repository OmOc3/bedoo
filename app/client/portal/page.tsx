import type { Metadata } from "next";
import { LogoutButton } from "@/components/auth/logout-button";
import { BrandLockup } from "@/components/layout/brand";
import { StatusPills } from "@/components/reports/status-pills";
import { ThemeIconToggle } from "@/components/theme/theme-icon-toggle";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  clientAnalysisDocumentCategoryLabels,
  clientAnalysisDocumentCategoryLabelsEnglish,
} from "@ecopest/shared";
import { requireRole } from "@/lib/auth/server-session";
import {
  listOrderedStationsForClient,
  listPublishedDailyAreaTasksForClient,
  listReportsForClientOrderedStations,
  listVisibleClientAnalysisDocuments,
} from "@/lib/db/repositories";
import { getIntlLocaleForApp } from "@/lib/i18n";
import { getI18nMessages, getRequestLocale, getRequestLocaleDirection } from "@/lib/i18n/server";
import type { Locale } from "@/lib/i18n";
import type { AppTimestamp, SprayStatus } from "@/types";

export const metadata: Metadata = {
  title: "بوابة العميل",
};

function getSprayLabels(locale: Locale): Record<SprayStatus, string> {
  return locale === "en"
    ? {
        not_sprayed: "Not sprayed",
        sprayed: "Sprayed",
      }
    : {
        not_sprayed: "لم يتم الرش",
        sprayed: "تم الرش",
      };
}

function formatTimestamp(timestamp: AppTimestamp | undefined, intlLocale: string, unavailableLabel: string): string {
  if (!timestamp) {
    return unavailableLabel;
  }

  return new Intl.DateTimeFormat(intlLocale, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(timestamp.toDate());
}

function SectionHeader({ description, title }: { description: string; title: string }) {
  return (
    <div>
      <h2 className="text-lg font-bold text-[var(--foreground)]">{title}</h2>
      <p className="mt-1 text-sm leading-6 text-[var(--muted)]">{description}</p>
    </div>
  );
}

export default async function ClientPortalPage() {
  const locale = await getRequestLocale();
  const direction = await getRequestLocaleDirection();
  const t = getI18nMessages(locale);
  const intlLocale = getIntlLocaleForApp(locale);
  const session = await requireRole(["client"]);
  const [analysisDocuments, stations, reports, areaTasks] = await Promise.all([
    listVisibleClientAnalysisDocuments(session.uid),
    listOrderedStationsForClient(session.uid),
    listReportsForClientOrderedStations(session.uid),
    listPublishedDailyAreaTasksForClient(session.uid),
  ]);
  const isRtl = direction === "rtl";
  const headline = locale === "en" ? `Welcome, ${session.user.displayName}` : `أهلا، ${session.user.displayName}`;
  const sprayLabels = getSprayLabels(locale);
  const documentCategoryLabels =
    locale === "en" ? clientAnalysisDocumentCategoryLabelsEnglish : clientAnalysisDocumentCategoryLabels;

  return (
    <main className="min-h-dvh bg-[var(--background)] px-4 py-5 text-start sm:px-6 lg:px-8" dir={direction}>
      <section className="mx-auto flex max-w-7xl flex-col gap-6">
        <header className="flex flex-col gap-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-card lg:flex-row lg:items-center lg:justify-between">
          <div className={`flex min-w-0 items-center gap-4 ${isRtl ? "lg:flex-row-reverse" : "lg:flex-row"}`}>
            <BrandLockup compact />
            <div className={`min-w-0 ${isRtl ? "lg:text-right" : "lg:text-left"}`}>
              <p className="text-sm font-semibold text-[var(--primary)]">{locale === "en" ? "Client Portal" : "بوابة العميل"}</p>
              <h1 className="mt-1 truncate text-2xl font-bold text-[var(--foreground)]">{headline}</h1>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-[var(--muted)]">
                {locale === "en"
                  ? "Only data approved and published by a supervisor or manager appears here."
                  : "تظهر هنا البيانات التي تم اعتمادها ونشرها من المشرف أو المدير فقط."}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ThemeIconToggle />
            <LogoutButton buttonClassName="!w-full sm:!w-auto" className="w-full sm:w-auto" redirectTo="/client/login" />
          </div>
        </header>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-card">
            <p className="text-sm font-medium text-[var(--muted)]">{locale === "en" ? "Analysis files" : "ملفات التحليلات"}</p>
            <p className="mt-2 text-3xl font-extrabold text-[var(--foreground)]">{analysisDocuments.length}</p>
          </div>
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-card">
            <p className="text-sm font-medium text-[var(--muted)]">{locale === "en" ? "Visible stations" : "محطات ظاهرة"}</p>
            <p className="mt-2 text-3xl font-extrabold text-[var(--foreground)]">{stations.length}</p>
          </div>
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-card">
            <p className="text-sm font-medium text-[var(--muted)]">{locale === "en" ? "Published spray results" : "نتائج رش منشورة"}</p>
            <p className="mt-2 text-3xl font-extrabold text-[var(--foreground)]">{areaTasks.length}</p>
          </div>
        </div>

        <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-card">
          <SectionHeader
            description={locale === "en" ? "PDF, Word, or Excel files published by operations for your account." : "ملفات PDF أو Word أو Excel التي نشرها فريق التشغيل لحسابك."}
            title={locale === "en" ? "Analysis" : "التحليلات"}
          />

          {analysisDocuments.length === 0 ? (
            <div className="mt-5">
              <EmptyState
                description={locale === "en" ? "No analysis files have been published for this account yet." : "لم يتم نشر ملفات تحليلات لهذا الحساب حتى الآن."}
                title={locale === "en" ? "No analysis files" : "لا توجد ملفات تحليلات"}
              />
            </div>
          ) : (
            <div className="mt-5 divide-y divide-[var(--border-subtle)] rounded-2xl border border-[var(--border)]">
              {analysisDocuments.map((document) => (
                <article className="grid gap-3 p-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center" key={document.documentId}>
                  <div className="min-w-0">
                    <h3 className="text-base font-bold text-[var(--foreground)]">{document.title}</h3>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-[var(--surface-subtle)] px-2.5 py-1 text-xs font-semibold text-[var(--muted)]">
                        {documentCategoryLabels[document.documentCategory]}
                      </span>
                      <span className="min-w-0 truncate text-sm text-[var(--muted)]">{document.fileName}</span>
                    </div>
                  </div>
                  <a
                    className="inline-flex min-h-11 items-center justify-center rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-[var(--primary-foreground)]"
                    href={document.fileUrl}
                    rel="noreferrer"
                    target="_blank"
                  >
                    {locale === "en" ? "Open file" : "فتح الملف"}
                  </a>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-card">
          <SectionHeader
            description={locale === "en" ? "Stations and reports approved for visibility by a supervisor or manager." : "المحطات والتقارير التي وافق المشرف أو المدير على ظهورها."}
            title={locale === "en" ? "Stations and follow-up" : "حالة المحطات والمتابعة"}
          />

          {stations.length === 0 ? (
            <div className="mt-5">
              <EmptyState
                description={locale === "en" ? "No station visibility data has been published for this account yet." : "لم يتم نشر حالة محطات لهذا الحساب حتى الآن."}
                title={locale === "en" ? "No published stations" : "لا توجد محطات منشورة"}
              />
            </div>
          ) : (
            <div className="mt-5 grid gap-4 xl:grid-cols-2">
              {stations.map((station) => (
                <article className="rounded-2xl border border-[var(--border)] bg-[var(--surface-subtle)] p-5" key={station.stationId}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="text-base font-bold text-[var(--foreground)]">{station.label}</h3>
                      <p className="mt-1 text-sm leading-6 text-[var(--muted)]">{station.location}</p>
                    </div>
                    <StatusBadge tone={station.isActive ? "active" : "inactive"}>
                      {station.isActive ? (locale === "en" ? "Active" : "نشطة") : locale === "en" ? "Inactive" : "غير نشطة"}
                    </StatusBadge>
                  </div>
                  <dl className="mt-4 grid gap-3 border-t border-[var(--border)] pt-4 text-sm sm:grid-cols-2">
                    <div>
                      <dt className="font-semibold text-[var(--muted)]">{locale === "en" ? "Last visit" : "آخر زيارة"}</dt>
                      <dd className="mt-1 text-[var(--foreground)]">{formatTimestamp(station.lastVisitedAt, intlLocale, t.common.unavailable)}</dd>
                    </div>
                    <div>
                      <dt className="font-semibold text-[var(--muted)]">{locale === "en" ? "Reports count" : "عدد التقارير"}</dt>
                      <dd className="mt-1 text-[var(--foreground)]">{station.totalReports}</dd>
                    </div>
                  </dl>
                </article>
              ))}
            </div>
          )}

          <div className="mt-6">
            <h3 className="text-base font-bold text-[var(--foreground)]">{locale === "en" ? "Approved follow-up reports" : "تقارير المتابعة المعتمدة"}</h3>
            {reports.length === 0 ? (
              <p className="mt-3 rounded-lg bg-[var(--surface-subtle)] p-4 text-sm text-[var(--muted)]">
                {locale === "en" ? "No follow-up reports have been published." : "لا توجد تقارير متابعة منشورة."}
              </p>
            ) : (
              <div className="mt-3 divide-y divide-[var(--border-subtle)] rounded-2xl border border-[var(--border)]">
                {reports.map((report) => (
                  <article className="p-5" key={report.reportId}>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h4 className="text-sm font-bold text-[var(--foreground)]">{report.stationLabel}</h4>
                        <p className="mt-1 text-xs text-[var(--muted)]">
                          {report.technicianName}
                          {locale === "en" ? ", " : "، "}
                          {formatTimestamp(report.submittedAt, intlLocale, t.common.unavailable)}
                        </p>
                      </div>
                      <StatusPills status={report.status} />
                    </div>
                    {report.notes ? <p className="mt-3 text-sm leading-6 text-[var(--muted)]">{report.notes}</p> : null}
                  </article>
                ))}
              </div>
            )}
          </div>
        </section>

        <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-card">
          <SectionHeader
            description={locale === "en" ? "Area QR result after technician execution and supervisor or manager publication." : "نتيجة QR المنطقة بعد تنفيذ الفني ونشر المشرف أو المدير للنتيجة."}
            title={locale === "en" ? "Area spray status" : "حالة رش المناطق"}
          />

          {areaTasks.length === 0 ? (
            <div className="mt-5">
              <EmptyState
                description={locale === "en" ? "No area spray results have been published for this account yet." : "لم يتم نشر نتائج رش مناطق لهذا الحساب حتى الآن."}
                title={locale === "en" ? "No published spray results" : "لا توجد نتائج رش منشورة"}
              />
            </div>
          ) : (
            <div className="mt-5 divide-y divide-[var(--border-subtle)] rounded-2xl border border-[var(--border)]">
              {areaTasks.map((task) => (
                <article className="grid gap-3 p-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center" key={task.taskId}>
                  <div>
                    <h3 className="text-base font-bold text-[var(--foreground)]">{task.areaName ?? (locale === "en" ? "Area" : "منطقة")}</h3>
                    <p className="mt-1 text-sm leading-6 text-[var(--muted)]">{task.areaLocation}</p>
                    <p className="mt-1 text-xs text-[var(--muted)]" dir="ltr">{task.scheduledDate}</p>
                  </div>
                  <StatusBadge tone={task.sprayStatus === "sprayed" ? "reviewed" : "rejected"}>
                    {task.sprayStatus ? sprayLabels[task.sprayStatus] : locale === "en" ? "Not recorded" : "غير مسجل"}
                  </StatusBadge>
                </article>
              ))}
            </div>
          )}
        </section>
      </section>
    </main>
  );
}
