"use client";

import { LocalizedDashboardError } from "@/components/i18n/localized-dashboard-error";

export default function RootError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <LocalizedDashboardError descriptionKey="rootUnexpectedHint" reset={reset} titleKey="rootUnexpectedTitle" />
  );
}
