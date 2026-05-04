"use client";

import { LocalizedDashboardError } from "@/components/i18n/localized-dashboard-error";

export default function StationReportError({ reset }: { reset: () => void }) {
  return <LocalizedDashboardError descriptionKey="reportFormHint" reset={reset} titleKey="reportForm" />;
}
