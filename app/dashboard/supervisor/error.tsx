"use client";

import { LocalizedDashboardError } from "@/components/i18n/localized-dashboard-error";

export default function SupervisorDashboardError({ reset }: { reset: () => void }) {
  return <LocalizedDashboardError reset={reset} titleKey="supervisorDashboard" />;
}
