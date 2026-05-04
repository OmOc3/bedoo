"use client";

import { LocalizedDashboardError } from "@/components/i18n/localized-dashboard-error";

export default function SupervisorStationsError({ reset }: { reset: () => void }) {
  return <LocalizedDashboardError descriptionKey="stationsDbHint" reset={reset} titleKey="stations" />;
}
