"use client";

import { LocalizedDashboardError } from "@/components/i18n/localized-dashboard-error";

export default function ManagerAuditError({ reset }: { reset: () => void }) {
  return <LocalizedDashboardError descriptionKey="managerAuditHint" reset={reset} titleKey="managerAudit" />;
}
