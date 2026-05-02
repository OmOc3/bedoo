import type { Metadata } from "next";
import { DashboardShell } from "@/components/layout/dashboard-page";
import { PageHeader } from "@/components/layout/page-header";
import { OperationTasksView } from "@/components/tasks/operation-tasks-view";
import { requireRole } from "@/lib/auth/server-session";
import { getOperationTasks } from "@/lib/operations-tasks";

export const metadata: Metadata = {
  title: "مهام اليوم",
};

export default async function SupervisorTasksPage() {
  await requireRole(["supervisor", "manager"]);
  const tasks = await getOperationTasks();

  return (
    <DashboardShell role="supervisor">
        <PageHeader
          backHref="/dashboard/supervisor"
          description="أولويات المراجعة والمتابعة للمشرف خلال اليوم."
          title="مهام اليوم"
        />
        <OperationTasksView baseReportsHref="/dashboard/supervisor/reports" tasks={tasks} />
    </DashboardShell>
  );
}
