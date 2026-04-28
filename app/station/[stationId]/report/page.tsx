import type { Metadata } from "next";
import Image from "next/image";
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
    <main className="flex min-h-dvh items-center bg-[var(--surface-subtle)] px-4 py-6 text-right" dir="rtl">
      <section className="mx-auto w-full max-w-lg rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 text-center sm:p-6">
        <h1 className="text-xl font-bold text-[var(--foreground)]">{message}</h1>
        <Link
          className="mt-5 inline-flex min-h-[44px] w-full items-center justify-center rounded-lg bg-[var(--primary)] px-4 py-3 text-base font-medium text-white transition-colors hover:bg-[var(--primary-hover)]"
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
    <main className="min-h-dvh bg-[var(--surface-subtle)] px-4 py-6 text-right" dir="rtl">
      <section className="mx-auto w-full max-w-lg space-y-4">
        <div>
          <Link className="text-sm font-medium text-[var(--muted)] hover:text-[var(--foreground)]" href="/scan">
            العودة للمسح
          </Link>
          <h1 className="mt-2 text-2xl font-bold text-[var(--foreground)]">تقرير فحص محطة</h1>
        </div>

        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5">
          <div className="rounded-xl bg-[var(--surface-subtle)] p-4">
            {station.photoUrls?.[0] ? (
              <Image
                alt={`صورة المحطة ${station.label}`}
                className="mb-4 h-40 w-full rounded-xl border border-[var(--border)] object-cover"
                height={160}
                src={station.photoUrls[0]}
                unoptimized
                width={480}
              />
            ) : null}
            <p className="text-sm font-medium text-[var(--muted)]">المحطة</p>
            <p className="mt-1 text-sm font-semibold text-teal-700" dir="ltr">
              #{station.stationId}
            </p>
            <p className="mt-1 text-lg font-semibold text-[var(--foreground)]">{station.label ?? "محطة بدون اسم"}</p>
            <p className="mt-1 text-base leading-7 text-[var(--muted)]">{station.location ?? "غير محدد"}</p>
            {station.description ? <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{station.description}</p> : null}
          </div>
          <div className="mt-5">
            <ReportForm stationId={stationId} stationLabel={station.label ?? "محطة بدون اسم"} />
          </div>
        </div>
      </section>
    </main>
  );
}
