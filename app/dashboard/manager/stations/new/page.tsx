import type { Metadata } from "next";
import { DashboardNav } from "@/components/layout/nav";
import { PageHeader } from "@/components/layout/page-header";
import { StationForm } from "@/components/stations/station-form";
import { requireRole } from "@/lib/auth/server-session";

export const metadata: Metadata = {
  title: "إضافة محطة",
};

export default async function NewStationPage() {
  await requireRole(["manager"]);

  return (
    <main className="min-h-dvh bg-slate-50 px-4 py-6 text-right sm:px-6 lg:px-8" dir="rtl">
      <section className="mx-auto max-w-3xl">
        <PageHeader
          backHref="/dashboard/manager/stations"
          description="أدخل بيانات المحطة ليتم إنشاء رابط QR خاص بها."
          title="إضافة محطة"
        />
        <DashboardNav role="manager" />
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-control sm:p-6">
          <StationForm mode="create" />
        </div>
      </section>
    </main>
  );
}
