import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import QRCode from "qrcode";
import { notFound } from "next/navigation";
import { DashboardNav } from "@/components/layout/nav";
import { PageHeader } from "@/components/layout/page-header";
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
    <main className="min-h-dvh bg-slate-50 px-4 py-6 text-right sm:px-6 lg:px-8" dir="rtl">
      <section className="mx-auto max-w-5xl">
        <PageHeader
          action={
            <Link
              className="inline-flex min-h-11 items-center justify-center rounded-lg border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 shadow-control transition-colors hover:bg-slate-50"
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
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-control sm:p-6">
            <h2 className="mb-4 text-lg font-semibold text-slate-800">بيانات المحطة</h2>
            <dl className="grid gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-sm font-medium text-slate-500">رقم المحطة</dt>
                <dd className="mt-1 text-sm font-semibold text-slate-900" dir="ltr">
                  #{station.stationId}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-slate-500">الموقع</dt>
                <dd className="mt-1 text-sm text-slate-900">{station.location}</dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-sm font-medium text-slate-500">وصف المحطة</dt>
                <dd className="mt-1 text-sm leading-6 text-slate-900">
                  {station.description ?? "لم يتم إضافة وصف بعد."}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-slate-500">المنطقة</dt>
                <dd className="mt-1 text-sm text-slate-900">{station.zone ?? "غير محدد"}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-slate-500">الحالة</dt>
                <dd className="mt-1">
                  <span
                    className={
                      station.isActive
                        ? "inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700"
                        : "inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600"
                    }
                  >
                    {station.isActive ? "نشطة" : "غير نشطة"}
                  </span>
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-slate-500">الإشراف الفوري</dt>
                <dd className="mt-1">
                  <span
                    className={
                      station.requiresImmediateSupervision
                        ? "inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-700"
                        : "inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600"
                    }
                  >
                    {station.requiresImmediateSupervision ? "مطلوب فورًا" : "غير مطلوب"}
                  </span>
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-slate-500">عدد التقارير</dt>
                <dd className="mt-1 text-sm text-slate-900">{station.totalReports}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-slate-500">آخر زيارة</dt>
                <dd className="mt-1 text-sm text-slate-900">{formatTimestamp(station.lastVisitedAt)}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-slate-500">تمت الزيارة بواسطة</dt>
                <dd className="mt-1 text-sm font-semibold text-teal-700">{station.lastVisitedBy ?? "غير متاح"}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-slate-500">آخر تعديل</dt>
                <dd className="mt-1 text-sm text-slate-900">{formatTimestamp(station.updatedAt)}</dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-sm font-medium text-slate-500">الإحداثيات</dt>
                <dd className="mt-1 text-sm text-slate-900" dir="ltr">
                  {station.coordinates ? `${station.coordinates.lat}, ${station.coordinates.lng}` : "غير محدد"}
                </dd>
              </div>
            </dl>
            {station.photoUrls?.length ? (
              <div className="mt-6">
                <h3 className="text-base font-semibold text-slate-800">صور المحطة</h3>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  {station.photoUrls.map((photoUrl) => (
                    <Image
                      alt={`صورة المحطة ${station.label}`}
                      className="h-40 w-full rounded-xl border border-slate-200 object-cover"
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
              <h3 className="text-base font-semibold text-slate-800">سجل إشراف الفنيين</h3>
              {technicianVisits.length === 0 ? (
                <p className="mt-2 text-sm text-slate-500">لا توجد زيارات مسجلة لهذه المحطة حتى الآن.</p>
              ) : (
                <div className="mt-3 overflow-hidden rounded-xl border border-slate-200">
                  <table className="w-full min-w-[520px]">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-3 py-2 text-right text-xs font-medium text-slate-500">الفني</th>
                        <th className="px-3 py-2 text-right text-xs font-medium text-slate-500">المعرف</th>
                        <th className="px-3 py-2 text-right text-xs font-medium text-slate-500">تاريخ الإشراف</th>
                        <th className="px-3 py-2 text-right text-xs font-medium text-slate-500">رقم التقرير</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {technicianVisits.map((visit) => (
                        <tr className="hover:bg-slate-50" key={visit.reportId}>
                          <td className="px-3 py-2 text-sm font-medium text-slate-900">{visit.technicianName}</td>
                          <td className="px-3 py-2 text-sm text-slate-600" dir="ltr">
                            {visit.technicianUid}
                          </td>
                          <td className="px-3 py-2 text-sm text-slate-700">{formatDate(visit.submittedAt)}</td>
                          <td className="px-3 py-2 text-sm text-slate-600" dir="ltr">
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

          <div className="rounded-2xl border border-slate-200 bg-white p-5 text-center shadow-control sm:p-6">
            <h2 className="text-lg font-semibold text-slate-800">رمز QR</h2>
            <p className="mt-1 text-sm leading-6 text-slate-500">يفتح نموذج تقرير هذه المحطة مباشرة.</p>
            <div className="mx-auto mt-5 flex w-fit rounded-xl border border-slate-200 bg-slate-50 p-4">
              <Image alt={`رمز QR للمحطة ${station.label}`} height={320} src={qrDataUrl} unoptimized width={320} />
            </div>
            <a
              className="mt-5 inline-flex min-h-11 items-center justify-center rounded-lg bg-teal-700 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-teal-600"
              download={`station-${station.stationId}-qr.png`}
              href={qrDataUrl}
            >
              تنزيل QR PNG
            </a>
            <p className="mt-4 break-all text-xs leading-6 text-slate-500" dir="ltr">
              {qrCodeValue}
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
