import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import QRCode from "qrcode";
import { notFound } from "next/navigation";
import { DashboardShell } from "@/components/layout/dashboard-page";
import { PageHeader } from "@/components/layout/page-header";
import { requireRole } from "@/lib/auth/server-session";
import { formatDateTimeRome } from "@/lib/datetime";
import { getIntlLocaleForApp } from "@/lib/i18n";
import { getI18nMessages, getRequestLocale } from "@/lib/i18n/server";
import { getStationById, listStationTechnicianVisits } from "@/lib/db/repositories";
import { resolveStationQrCodeValue } from "@/lib/stations/qr-export";
import { buildStationReportUrl } from "@/lib/url/base-url";
import type { AppTimestamp } from "@/types";

interface StationDetailPageProps {
  params: Promise<{
    stationId: string;
  }>;
}

export async function generateMetadata({ params }: StationDetailPageProps): Promise<Metadata> {
  const { stationId } = await params;
  const locale = await getRequestLocale();
  const t = getI18nMessages(locale);
  const station = await getStationById(stationId);

  if (!station) {
    return { title: t.stationDetailPage.metaTitle };
  }

  return { title: `${station.label} — ${t.stationDetailPage.metaTitle}` };
}

export default async function StationDetailPage({ params }: StationDetailPageProps) {
  const { stationId } = await params;
  await requireRole(["manager"]);
  const locale = await getRequestLocale();
  const t = getI18nMessages(locale);
  const sd = t.stationDetailPage;
  const sl = t.stationsListPage;
  const intlLocale = getIntlLocaleForApp(locale);

  const [station, technicianVisits] = await Promise.all([
    getStationById(stationId),
    listStationTechnicianVisits(stationId, 100),
  ]);

  if (!station) {
    notFound();
  }

  function formatTimestamp(timestamp?: AppTimestamp): string {
    if (!timestamp) {
      return t.common.unavailable;
    }

    return formatDateTimeRome(timestamp.toDate(), {
      locale: intlLocale,
      unavailableLabel: t.common.unavailable,
    });
  }

  function formatVisitDate(date: Date): string {
    return formatDateTimeRome(date, {
      locale: intlLocale,
      unavailableLabel: t.common.unavailable,
    });
  }

  const qrCodeValue = await resolveStationQrCodeValue(station, buildStationReportUrl);
  const qrDataUrl = await QRCode.toDataURL(qrCodeValue, {
    margin: 2,
    width: 320,
  });

  return (
    <DashboardShell contentClassName="max-w-5xl" role="manager">
        <PageHeader
          action={
            <Link
              className="inline-flex min-h-11 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--surface)] px-5 py-2.5 text-sm font-semibold text-[var(--foreground)] shadow-control transition-colors hover:bg-[var(--surface-subtle)]"
              href={`/dashboard/manager/stations/${station.stationId}/edit`}
            >
              {sd.editStation}
            </Link>
          }
          backHref="/dashboard/manager/stations"
          description={sd.pageDescription}
          title={station.label}
        />

        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-control sm:p-6">
            <h2 className="mb-4 text-lg font-semibold text-[var(--foreground)]">{sd.sectionData}</h2>
            <dl className="grid gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-sm font-medium text-[var(--muted)]">{sd.colStationNumber}</dt>
                <dd className="mt-1 text-sm font-semibold text-[var(--foreground)]" dir="ltr">
                  #{station.stationId}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-[var(--muted)]">{sd.colLocation}</dt>
                <dd className="mt-1 text-sm text-[var(--foreground)]">{station.location}</dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-sm font-medium text-[var(--muted)]">{sd.colDescription}</dt>
                <dd className="mt-1 text-sm leading-6 text-[var(--foreground)]">
                  {station.description ?? sd.noDescription}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-[var(--muted)]">{sd.colZone}</dt>
                <dd className="mt-1 text-sm text-[var(--foreground)]">{station.zone ?? sl.zoneUndefined}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-[var(--muted)]">{sd.colStatus}</dt>
                <dd className="mt-1">
                  <span
                    className={
                      station.isActive
                        ? "inline-flex items-center rounded-full bg-teal-50 px-2.5 py-0.5 text-xs font-semibold text-teal-700 dark:bg-teal-900/30 dark:text-teal-300"
                        : "inline-flex items-center rounded-full bg-[var(--surface-subtle)] px-2.5 py-0.5 text-xs font-semibold text-[var(--muted)] dark:bg-[var(--surface-elevated)]"
                    }
                  >
                    {station.isActive ? sl.statusActive : sl.statusInactive}
                  </span>
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-[var(--muted)]">{sd.immediateSupervision}</dt>
                <dd className="mt-1">
                  <span
                    className={
                      station.requiresImmediateSupervision
                        ? "inline-flex items-center rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
                        : "inline-flex items-center rounded-full bg-[var(--surface-subtle)] px-2.5 py-0.5 text-xs font-semibold text-[var(--muted)] dark:bg-[var(--surface-elevated)]"
                    }
                  >
                    {station.requiresImmediateSupervision ? sd.immediateRequired : sd.immediateNotRequired}
                  </span>
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-[var(--muted)]">{sd.colReportCount}</dt>
                <dd className="mt-1 text-sm text-[var(--foreground)]">{station.totalReports}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-[var(--muted)]">{sd.colLastVisit}</dt>
                <dd className="mt-1 text-sm text-[var(--foreground)]">{formatTimestamp(station.lastVisitedAt)}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-[var(--muted)]">{sd.colVisitedBy}</dt>
                <dd className="mt-1 text-sm font-semibold text-teal-700">{station.lastVisitedBy ?? t.common.unavailable}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-[var(--muted)]">{sd.colLastEdit}</dt>
                <dd className="mt-1 text-sm text-[var(--foreground)]">{formatTimestamp(station.updatedAt)}</dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-sm font-medium text-[var(--muted)]">{sd.colCoordinates}</dt>
                <dd className="mt-1 text-sm text-[var(--foreground)]" dir="ltr">
                  {station.coordinates ? `${station.coordinates.lat}, ${station.coordinates.lng}` : sl.zoneUndefined}
                </dd>
              </div>
            </dl>
            {station.coordinates ? (
              <div className="mt-6 space-y-3">
                <h3 className="text-base font-semibold text-[var(--foreground)]">{sd.openMapsTitle}</h3>
                <p className="text-sm text-[var(--muted)]">{t.stations.googleMapsExternalHint}</p>
                <a
                  className="inline-flex min-h-11 items-center justify-center rounded-lg bg-[var(--primary)] px-5 py-2.5 text-sm font-semibold text-[var(--primary-foreground)] shadow-control transition-colors hover:bg-[var(--primary-hover)]"
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${station.coordinates.lat},${station.coordinates.lng}`)}`}
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  {t.stations.openInGoogleMaps}
                </a>
              </div>
            ) : (
              <div className="mt-6 rounded-xl border border-[var(--border)] bg-[var(--surface-subtle)] p-4 text-sm text-[var(--muted)]">
                <p className="font-semibold text-[var(--foreground)]">{t.stations.noGpsSaved}</p>
                <p className="mt-2 leading-6">
                  {t.stations.stationDetailNoGpsBody}{" "}
                  <span className="text-[var(--foreground)]">{station.location}</span>
                </p>
              </div>
            )}
            {station.photoUrls?.length ? (
              <div className="mt-6">
                <h3 className="text-base font-semibold text-[var(--foreground)]">{sd.photosTitle}</h3>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  {station.photoUrls.map((photoUrl) => (
                    <Image
                      alt={sd.photoAlt.replace("{label}", station.label)}
                      className="h-40 w-full rounded-xl border border-[var(--border)] object-cover"
                      height={180}
                      key={photoUrl}
                      src={photoUrl}
                      unoptimized
                      width={320}
                    />
                  ))}
                </div>
              </div>
            ) : null}
            <div className="mt-6">
              <h3 className="text-base font-semibold text-[var(--foreground)]">{sd.visitsTitle}</h3>
              {technicianVisits.length === 0 ? (
                <p className="mt-2 text-sm text-[var(--muted)]">{sd.visitsEmpty}</p>
              ) : (
                <div className="mt-3 overflow-hidden rounded-xl border border-[var(--border)]">
                  <table className="w-full min-w-[520px]">
                    <thead className="bg-[var(--surface-subtle)]">
                      <tr>
                        <th className="px-3 py-2 text-right text-xs font-medium text-[var(--muted)]">{sd.colTechnician}</th>
                        <th className="px-3 py-2 text-right text-xs font-medium text-[var(--muted)]">{sd.colUid}</th>
                        <th className="px-3 py-2 text-right text-xs font-medium text-[var(--muted)]">{sd.colSupervisionDate}</th>
                        <th className="px-3 py-2 text-right text-xs font-medium text-[var(--muted)]">{sd.colReportId}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border-subtle)] bg-[var(--surface)]">
                      {technicianVisits.map((visit) => (
                        <tr className="hover:bg-[var(--surface-subtle)]" key={visit.reportId}>
                          <td className="px-3 py-2 text-sm font-medium text-[var(--foreground)]">{visit.technicianName}</td>
                          <td className="px-3 py-2 text-sm text-[var(--muted)]" dir="ltr">
                            {visit.technicianUid}
                          </td>
                          <td className="px-3 py-2 text-sm text-[var(--foreground)]">{formatVisitDate(visit.submittedAt)}</td>
                          <td className="px-3 py-2 text-sm text-[var(--muted)]" dir="ltr">
                            {visit.reportId}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 text-center shadow-control sm:p-6">
            <h2 className="text-lg font-semibold text-[var(--foreground)]">{sd.qrTitle}</h2>
            <p className="mt-1 text-sm leading-6 text-[var(--muted)]">{sd.qrLead}</p>
            <div className="mx-auto mt-5 flex w-fit rounded-xl border border-[var(--border)] bg-[var(--surface-subtle)] p-4">
              <Image alt={sd.qrImageAlt.replace("{label}", station.label)} height={320} src={qrDataUrl} unoptimized width={320} />
            </div>
            <a
              className="mt-5 inline-flex min-h-11 items-center justify-center rounded-lg bg-[var(--primary)] px-5 py-2.5 text-sm font-semibold text-[var(--primary-foreground)] transition-colors hover:bg-[var(--primary-hover)]"
              download={`station-${station.stationId}-qr.png`}
              href={qrDataUrl}
            >
              {sd.downloadQrPng}
            </a>
            <p className="mt-4 break-all text-xs leading-6 text-[var(--muted)]" dir="ltr">
              {qrCodeValue}
            </p>
          </div>
        </div>
    </DashboardShell>
  );
}
