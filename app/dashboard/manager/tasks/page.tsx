import type { Metadata } from "next";
import { DashboardShell } from "@/components/layout/dashboard-page";
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
    <DashboardShell role="manager">
        <PageHeader
          backHref="/dashboard/manager"
          description="أولويات تشغيلية جاهزة للمراجعة والمتابعة دون البحث داخل كل قائمة."
          title="مهام اليوم"
        />
        <OperationTasksView baseReportsHref="/dashboard/manager/reports" canEditStations tasks={tasks} />
    </DashboardShell>
  );
}
