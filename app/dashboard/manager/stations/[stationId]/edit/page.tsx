import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DashboardNav } from "@/components/layout/nav";
import { PageHeader } from "@/components/layout/page-header";
import { StationForm } from "@/components/stations/station-form";
import { requireRole } from "@/lib/auth/server-session";
import { getStationById } from "@/lib/db/repositories";

interface EditStationPageProps {
  params: Promise<{
    stationId: string;
  }>;
}

export const metadata: Metadata = {
  title: "تعديل محطة",
};

export default async function EditStationPage({ params }: EditStationPageProps) {
  const { stationId } = await params;
  await requireRole(["manager"]);
  const stationRecord = await getStationById(stationId);

  if (!stationRecord) {
    notFound();
  }

  const station = {
    stationId: stationRecord.stationId,
    label: stationRecord.label,
    location: stationRecord.location,
    description: stationRecord.description,
    photoUrls: stationRecord.photoUrls,
    requiresImmediateSupervision: stationRecord.requiresImmediateSupervision,
    zone: stationRecord.zone,
    coordinates: stationRecord.coordinates,
  };

  return (
    <main className="min-h-dvh bg-[var(--surface-subtle)] px-4 py-6 text-right sm:px-6 lg:px-8" dir="rtl">
      <section className="mx-auto max-w-3xl">
        <PageHeader
          backHref={`/dashboard/manager/stations/${station.stationId}`}
          description="حدّث بيانات المحطة دون تغيير رمز QR الخاص بها."
          title="تعديل محطة"
        />
        <DashboardNav role="manager" />
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-control sm:p-6">
          <StationForm mode="edit" station={station} />
        </div>
      </section>
    </main>
  );
}
