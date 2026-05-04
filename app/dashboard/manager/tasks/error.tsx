"use client";

import { LocalizedDashboardError } from "@/components/i18n/localized-dashboard-error";

export default function ManagerTasksError({ reset }: { reset: () => void }) {
  return <LocalizedDashboardError reset={reset} titleKey="todayTasks" />;
}
