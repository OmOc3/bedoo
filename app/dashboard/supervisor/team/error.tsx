"use client";

import { LocalizedDashboardError } from "@/components/i18n/localized-dashboard-error";

export default function SupervisorTeamError({ reset }: { reset: () => void }) {
  return <LocalizedDashboardError reset={reset} titleKey="team" />;
}
