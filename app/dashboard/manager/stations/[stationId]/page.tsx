import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import QRCode from "qrcode";
import { notFound } from "next/navigation";
import { DashboardNav } from "@/components/layout/nav";
import { PageHeader } from "@/components/layout/page-header";
import { requireRole } from "@/lib/auth/server-session";
import { STATIONS_COL } from "@/lib/collections";
import { adminDb } from "@/lib/firebase-admin";
import { buildStationReportUrl } from "@/lib/url/base-url";
import type { FirestoreTimestamp, Station } from "@/types";

interface StationDetailPageProps {
  params: Promise<{
    stationId: string;
  }>;
}

export const metadata: Metadata = {
  title: "تفاصيل المحطة",
};

function formatTimestamp(timestamp?: FirestoreTimestamp): string {
  if (!timestamp) {
    return "غير متاح";
  }

  return new Intl.DateTimeFormat("ar-EG", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(timestamp.toDate());
}

function stationFromData(stationId: string, data: Partial<Station>): Station {
  return {
    stationId: data.stationId ?? stationId,
    label: data.label ?? "محطة بدون اسم",
    location: data.location ?? "غير محدد",
    zone: data.zone,
    coordinates: data.coordinates,
    qrCodeValue: data.qrCodeValue ?? "",
    isActive: data.isActive ?? false,
    createdAt: data.createdAt as FirestoreTimestamp,
    createdBy: data.createdBy ?? "",
    updatedAt: data.updatedAt,
    updatedBy: data.updatedBy,
    lastVisitedAt: data.lastVisitedAt,
    totalReports: data.totalReports ?? 0,
  };
}

export default async function StationDetailPage({ params }: StationDetailPageProps) {
  const { stationId } = await params;
  await requireRole(["manager"]);
  const snapshot = await adminDb().collection(STATIONS_COL).doc(stationId).get();

  if (!snapshot.exists) {
    notFound();
  }

  const station = stationFromData(snapshot.id, snapshot.data() as Partial<Station>);
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
              className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
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
          <div className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
            <h2 className="mb-4 text-lg font-semibold text-slate-800">بيانات المحطة</h2>
            <dl className="grid gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-sm font-medium text-slate-500">الموقع</dt>
                <dd className="mt-1 text-sm text-slate-900">{station.location}</dd>
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
                <dt className="text-sm font-medium text-slate-500">عدد التقارير</dt>
                <dd className="mt-1 text-sm text-slate-900">{station.totalReports}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-slate-500">آخر زيارة</dt>
                <dd className="mt-1 text-sm text-slate-900">{formatTimestamp(station.lastVisitedAt)}</dd>
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
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 text-center sm:p-6">
            <h2 className="text-lg font-semibold text-slate-800">رمز QR</h2>
            <p className="mt-1 text-sm leading-6 text-slate-500">يفتح نموذج تقرير هذه المحطة مباشرة.</p>
            <div className="mx-auto mt-5 flex w-fit rounded-xl border border-slate-200 bg-slate-50 p-4">
              <Image alt={`رمز QR للمحطة ${station.label}`} height={320} src={qrDataUrl} unoptimized width={320} />
            </div>
            <a
              className="mt-5 inline-flex items-center justify-center rounded-lg bg-teal-700 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-teal-600"
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
