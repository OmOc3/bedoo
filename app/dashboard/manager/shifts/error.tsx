"use client";

import { LocalizedDashboardError } from "@/components/i18n/localized-dashboard-error";

export default function ManagerShiftsError({ reset }: { reset: () => void }) {
  return <LocalizedDashboardError reset={reset} titleKey="shiftsData" />;
}
