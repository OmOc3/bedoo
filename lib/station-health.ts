import type { AppTimestamp, Station } from "@/types";

export type StationHealth = "attention" | "healthy" | "inactive";

export interface StationHealthDetails {
  label: string;
  toneClassName: string;
  value: StationHealth;
}

export interface StationHealthLabels {
  inactive: string;
  needsVisit: string;
  staleVisitDays: (days: number) => string;
  healthy: string;
}

const defaultStationHealthLabels: StationHealthLabels = {
  inactive: "غير نشطة",
  needsVisit: "تحتاج زيارة",
  staleVisitDays: (days) => `لم تزر منذ ${days} يوم`,
  healthy: "سليمة",
};

const staleVisitDaysThreshold = 14;

export function stationHealthLabelsFromMessages(messages: {
  inactive: string;
  needsVisit: string;
  staleVisitDays: string;
  healthy: string;
}): StationHealthLabels {
  return {
    inactive: messages.inactive,
    needsVisit: messages.needsVisit,
    staleVisitDays: (days) => messages.staleVisitDays.replace("{days}", String(days)),
    healthy: messages.healthy,
  };
}

function daysSince(timestamp?: AppTimestamp): number | null {
  if (!timestamp) {
    return null;
  }

  const diffMs = Date.now() - timestamp.toDate().getTime();

  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

export function getStationHealth(
  station: Pick<Station, "isActive" | "lastVisitedAt">,
  labels: StationHealthLabels = defaultStationHealthLabels,
): StationHealthDetails {
  if (!station.isActive) {
    return {
      label: labels.inactive,
      toneClassName: "bg-[var(--surface-subtle)] text-[var(--muted)] dark:bg-[var(--surface-elevated)]",
      value: "inactive",
    };
  }

  const visitAgeDays = daysSince(station.lastVisitedAt);

  if (visitAgeDays === null || visitAgeDays > staleVisitDaysThreshold) {
    return {
      label: visitAgeDays === null ? labels.needsVisit : labels.staleVisitDays(visitAgeDays),
      toneClassName: "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
      value: "attention",
    };
  }

  return {
    label: labels.healthy,
    toneClassName: "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
    value: "healthy",
  };
}

export function isStationStale(station: Pick<Station, "isActive" | "lastVisitedAt">): boolean {
  return getStationHealth(station).value === "attention";
}
