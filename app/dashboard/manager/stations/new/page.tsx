import type { Metadata } from "next";
import { DashboardShell } from "@/components/layout/dashboard-page";
import { PageHeader } from "@/components/layout/page-header";
import { StationForm } from "@/components/stations/station-form";
import { requireRole } from "@/lib/auth/server-session";

export const metadata: Metadata = {
  title: "إضافة محطة",
};

export default async function NewStationPage() {
  await requireRole(["manager"]);

  return (
    <DashboardShell contentClassName="max-w-3xl" role="manager">
        <PageHeader
          backHref="/dashboard/manager/stations"
          description="أدخل بيانات المحطة وسيتم توليد رقم المحطة ورابط QR تلقائيا بعد الحفظ."
          title="إضافة محطة"
        />
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-control sm:p-6">
          <StationForm mode="create" />
        </div>
    </DashboardShell>
  );
}
