import type { Metadata } from "next";
import { DashboardShell } from "@/components/layout/dashboard-page";
import { PageHeader } from "@/components/layout/page-header";
import { OperationTasksView } from "@/components/tasks/operation-tasks-view";
import { requireRole } from "@/lib/auth/server-session";
import { getIntlLocaleForApp } from "@/lib/i18n";
import { getI18nMessages, getRequestLocale } from "@/lib/i18n/server";
import { getOperationTasks } from "@/lib/operations-tasks";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getRequestLocale();
  const t = getI18nMessages(locale);

  return { title: t.operationTasksPage.metaTitle };
}

export default async function SupervisorTasksPage() {
  await requireRole(["supervisor", "manager"]);
  const locale = await getRequestLocale();
  const t = getI18nMessages(locale);
  const intlLocale = getIntlLocaleForApp(locale);
  const tasks = await getOperationTasks();

  return (
    <DashboardShell role="supervisor">
        <PageHeader
          backHref="/dashboard/supervisor"
          description={t.operationTasksPage.pageDescriptionSupervisor}
          title={t.operationTasksPage.metaTitle}
        />
        <OperationTasksView
          baseReportsHref="/dashboard/supervisor/reports"
          copy={t.operationTasksPage}
          intlLocale={intlLocale}
          stationHealthMessages={t.stationHealth}
          tasks={tasks}
          unavailableLabel={t.common.unavailable}
        />
    </DashboardShell>
  );
}
