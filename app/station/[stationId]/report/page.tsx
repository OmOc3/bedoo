import type { Metadata } from "next";
import Link from "next/link";
import { ReportForm } from "@/components/station/report-form";
import { requireRole } from "@/lib/auth/server-session";
import { getStationById } from "@/lib/db/repositories";

interface StationReportPageProps {
  params: Promise<{
    stationId: string;
  }>;
}

export const metadata: Metadata = {
  title: "تقرير فحص محطة",
};

function ErrorMessage({ message }: { message: string }) {
  return (
    <main className="flex min-h-dvh items-center bg-slate-50 px-4 py-6 text-right" dir="rtl">
      <section className="mx-auto w-full max-w-lg rounded-xl border border-slate-200 bg-white p-5 text-center sm:p-6">
        <h1 className="text-xl font-bold text-slate-900">{message}</h1>
        <Link
          className="mt-5 inline-flex min-h-[44px] w-full items-center justify-center rounded-lg bg-teal-700 px-4 py-3 text-base font-medium text-white transition-colors hover:bg-teal-600"
          href="/scan"
        >
          العودة للمسح
        </Link>
      </section>
    </main>
  );
}

export default async function StationReportPage({ params }: StationReportPageProps) {
  const { stationId } = await params;
  await requireRole(["technician", "manager"]);
  const station = await getStationById(stationId);

  if (!station) {
    return <ErrorMessage message="المحطة غير موجودة" />;
  }

  if (!station.isActive) {
    return <ErrorMessage message="هذه المحطة غير نشطة" />;
  }

  return (
    <main className="min-h-dvh bg-slate-50 px-4 py-6 text-right" dir="rtl">
      <section className="mx-auto w-full max-w-lg space-y-4">
        <div>
          <Link className="text-sm font-medium text-slate-500 hover:text-slate-900" href="/scan">
            العودة للمسح
          </Link>
          <h1 className="mt-2 text-2xl font-bold text-slate-900">تقرير فحص محطة</h1>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="rounded-xl bg-slate-50 p-4">
            <p className="text-sm font-medium text-slate-500">المحطة</p>
            <p className="mt-1 text-lg font-semibold text-slate-900">{station.label ?? "محطة بدون اسم"}</p>
            <p className="mt-1 text-base leading-7 text-slate-600">{station.location ?? "غير محدد"}</p>
          </div>
          <div className="mt-5">
            <ReportForm stationId={stationId} stationLabel={station.label ?? "محطة بدون اسم"} />
          </div>
        </div>
      </section>
    </main>
  );
}
