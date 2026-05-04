"use client";

import { LocalizedDashboardError } from "@/components/i18n/localized-dashboard-error";

export default function StationsMapError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <LocalizedDashboardError descriptionKey="stationsMapHint" reset={reset} titleKey="stationsMapTitle" titleLevel="h1" />
  );
}
