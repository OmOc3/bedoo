import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import QRCode from "qrcode";
import { notFound } from "next/navigation";
import { DashboardNav } from "@/components/layout/nav";
import { PageHeader } from "@/components/layout/page-header";
import { StationMap } from "@/components/maps/station-map";
import { requireRole } from "@/lib/auth/server-session";
import { getStationById, listStationTechnicianVisits } from "@/lib/db/repositories";
import { buildStationReportUrl } from "@/lib/url/base-url";
import type { AppTimestamp } from "@/types";

interface StationDetailPageProps {
  params: Promise<{
    stationId: string;
  }>;
}

export const metadata: Metadata = {
  title: "تفاصيل المحطة",
};

function formatTimestamp(timestamp?: AppTimestamp): string {
  if (!timestamp) {
    return "غير متاح";
  }

  return new Intl.DateTimeFormat("ar-EG", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(timestamp.toDate());
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("ar-EG", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export default async function StationDetailPage({ params }: StationDetailPageProps) {
  const { stationId } = await params;
  await requireRole(["manager"]);
  const [station, technicianVisits] = await Promise.all([
    getStationById(stationId),
    listStationTechnicianVisits(stationId, 100),
  ]);

  if (!station) {
    notFound();
  }

  const qrCodeValue = station.qrCodeValue || (await buildStationReportUrl(station.stationId));
  const qrDataUrl = await QRCode.toDataURL(qrCodeValue, {
    margin: 2,
    width: 320,
  });

  return (
    <main className="min-h-dvh bg-[var(--surface-subtle)] px-4 py-6 text-right sm:px-6 lg:px-8" dir="rtl">
      <section className="mx-auto max-w-5xl">
        <PageHeader
          action={
            <Link
              className="inline-flex min-h-11 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--surface)] px-5 py-2.5 text-sm font-semibold text-[var(--foreground)] shadow-control transition-colors hover:bg-[var(--surface-subtle)]"
              href={`/dashboard/manager/stations/${station.stationId}/edit`}
            >
              تعديل المحطة
            </Link>
          }
          backHref="/dashboard/manager/stations"
          description="بيانات المحطة ورمز QR المستخدم في الزيارات الميدانية."
          title={station.label}
        />
        <DashboardNav role="manager" />

        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-control sm:p-6">
            <h2 className="mb-4 text-lg font-semibold text-[var(--foreground)]">بيانات المحطة</h2>
            <dl className="grid gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-sm font-medium text-[var(--muted)]">رقم المحطة</dt>
                <dd className="mt-1 text-sm font-semibold text-[var(--foreground)]" dir="ltr">
                  #{station.stationId}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-[var(--muted)]">الموقع</dt>
                <dd className="mt-1 text-sm text-[var(--foreground)]">{station.location}</dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-sm font-medium text-[var(--muted)]">وصف المحطة</dt>
                <dd className="mt-1 text-sm leading-6 text-[var(--foreground)]">
                  {station.description ?? "لم يتم إضافة وصف بعد."}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-[var(--muted)]">المنطقة</dt>
                <dd className="mt-1 text-sm text-[var(--foreground)]">{station.zone ?? "غير محدد"}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-[var(--muted)]">الحالة</dt>
                <dd className="mt-1">
                  <span
                    className={
                      station.isActive
                        ? "inline-flex items-center rounded-full bg-teal-50 px-2.5 py-0.5 text-xs font-semibold text-teal-700 dark:bg-teal-900/30 dark:text-teal-300"
                        : "inline-flex items-center rounded-full bg-[var(--surface-subtle)] px-2.5 py-0.5 text-xs font-semibold text-[var(--muted)] dark:bg-[var(--surface-elevated)]"
                    }
                  >
                    {station.isActive ? "نشطة" : "غير نشطة"}
                  </span>
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-[var(--muted)]">الإشراف الفوري</dt>
                <dd className="mt-1">
                  <span
                    className={
                      station.requiresImmediateSupervision
                        ? "inline-flex items-center rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
                        : "inline-flex items-center rounded-full bg-[var(--surface-subtle)] px-2.5 py-0.5 text-xs font-semibold text-[var(--muted)] dark:bg-[var(--surface-elevated)]"
                    }
                  >
                    {station.requiresImmediateSupervision ? "مطلوب فورًا" : "غير مطلوب"}
                  </span>
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-[var(--muted)]">عدد التقارير</dt>
                <dd className="mt-1 text-sm text-[var(--foreground)]">{station.totalReports}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-[var(--muted)]">آخر زيارة</dt>
                <dd className="mt-1 text-sm text-[var(--foreground)]">{formatTimestamp(station.lastVisitedAt)}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-[var(--muted)]">تمت الزيارة بواسطة</dt>
                <dd className="mt-1 text-sm font-semibold text-teal-700">{station.lastVisitedBy ?? "غير متاح"}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-[var(--muted)]">آخر تعديل</dt>
                <dd className="mt-1 text-sm text-[var(--foreground)]">{formatTimestamp(station.updatedAt)}</dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-sm font-medium text-[var(--muted)]">الإحداثيات</dt>
                <dd className="mt-1 text-sm text-[var(--foreground)]" dir="ltr">
                  {station.coordinates ? `${station.coordinates.lat}, ${station.coordinates.lng}` : "غير محدد"}
                </dd>
              </div>
            </dl>
            {station.coordinates ? (
              <div className="mt-6 space-y-3">
                <h3 className="text-base font-semibold text-[var(--foreground)]">موقع المحطة على الخريطة</h3>
                <StationMap
                  markers={[
                    {
                      coordinates: station.coordinates,
                      id: station.stationId,
                      label: station.label,
                    },
                  ]}
                  zoom={16}
                />
              </div>
            ) : null}
            {station.photoUrls?.length ? (
              <div className="mt-6">
                <h3 className="text-base font-semibold text-[var(--foreground)]">صور المحطة</h3>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  {station.photoUrls.map((photoUrl) => (
                    <Image
                      alt={`صورة المحطة ${station.label}`}
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
              <h3 className="text-base font-semibold text-[var(--foreground)]">سجل إشراف الفنيين</h3>
              {technicianVisits.length === 0 ? (
                <p className="mt-2 text-sm text-[var(--muted)]">لا توجد زيارات مسجلة لهذه المحطة حتى الآن.</p>
              ) : (
                <div className="mt-3 overflow-hidden rounded-xl border border-[var(--border)]">
                  <table className="w-full min-w-[520px]">
                    <thead className="bg-[var(--surface-subtle)]">
                      <tr>
                        <th className="px-3 py-2 text-right text-xs font-medium text-[var(--muted)]">الفني</th>
                        <th className="px-3 py-2 text-right text-xs font-medium text-[var(--muted)]">المعرف</th>
                        <th className="px-3 py-2 text-right text-xs font-medium text-[var(--muted)]">تاريخ الإشراف</th>
                        <th className="px-3 py-2 text-right text-xs font-medium text-[var(--muted)]">رقم التقرير</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border-subtle)] bg-[var(--surface)]">
                      {technicianVisits.map((visit) => (
                        <tr className="hover:bg-[var(--surface-subtle)]" key={visit.reportId}>
                          <td className="px-3 py-2 text-sm font-medium text-[var(--foreground)]">{visit.technicianName}</td>
                          <td className="px-3 py-2 text-sm text-[var(--muted)]" dir="ltr">
                            {visit.technicianUid}
                          </td>
                          <td className="px-3 py-2 text-sm text-[var(--foreground)]">{formatDate(visit.submittedAt)}</td>
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
            <h2 className="text-lg font-semibold text-[var(--foreground)]">رمز QR</h2>
            <p className="mt-1 text-sm leading-6 text-[var(--muted)]">يفتح نموذج تقرير هذه المحطة مباشرة.</p>
            <div className="mx-auto mt-5 flex w-fit rounded-xl border border-[var(--border)] bg-[var(--surface-subtle)] p-4">
              <Image alt={`رمز QR للمحطة ${station.label}`} height={320} src={qrDataUrl} unoptimized width={320} />
            </div>
            <a
              className="mt-5 inline-flex min-h-11 items-center justify-center rounded-lg bg-[var(--primary)] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[var(--primary-hover)]"
              download={`station-${station.stationId}-qr.png`}
              href={qrDataUrl}
            >
              تنزيل QR PNG
            </a>
            <p className="mt-4 break-all text-xs leading-6 text-[var(--muted)]" dir="ltr">
              {qrCodeValue}
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
