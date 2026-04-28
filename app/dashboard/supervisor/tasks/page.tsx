import type { Metadata } from "next";
import { DashboardNav } from "@/components/layout/nav";
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
    <main className="min-h-dvh bg-[var(--background)] px-4 py-6 text-right sm:px-6 lg:px-8" dir="rtl">
      <section className="mx-auto max-w-7xl space-y-6">
        <PageHeader
          backHref="/dashboard/supervisor"
          description="أولويات المراجعة والمتابعة للمشرف خلال اليوم."
          title="مهام اليوم"
        />
        <DashboardNav role="supervisor" />
        <OperationTasksView baseReportsHref="/dashboard/supervisor/reports" tasks={tasks} />
      </section>
    </main>
  );
}
