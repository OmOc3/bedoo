import type { Metadata } from "next";
import { DashboardNav } from "@/components/layout/nav";
import { PageHeader } from "@/components/layout/page-header";
import { OperationTasksView } from "@/components/tasks/operation-tasks-view";
import { requireRole } from "@/lib/auth/server-session";
import { getOperationTasks } from "@/lib/operations-tasks";

export const metadata: Metadata = {
  title: "مهام اليوم",
};

export default async function ManagerTasksPage() {
  await requireRole(["manager"]);
  const tasks = await getOperationTasks();

  return (
    <main className="min-h-dvh bg-slate-50 px-4 py-6 text-right sm:px-6 lg:px-8" dir="rtl">
      <section className="mx-auto max-w-7xl space-y-6">
        <PageHeader
          backHref="/dashboard/manager"
          description="أولويات تشغيلية جاهزة للمراجعة والمتابعة دون البحث داخل كل قائمة."
          title="مهام اليوم"
        />
        <DashboardNav role="manager" />
        <OperationTasksView baseReportsHref="/dashboard/manager/reports" canEditStations tasks={tasks} />
      </section>
    </main>
  );
}
