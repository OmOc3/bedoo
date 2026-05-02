import type { AppTimestamp, Station } from "@/types";

export type StationHealth = "attention" | "healthy" | "inactive";

export interface StationHealthDetails {
  label: string;
  toneClassName: string;
  value: StationHealth;
}

const staleVisitDays = 14;

function daysSince(timestamp?: AppTimestamp): number | null {
  if (!timestamp) {
    return null;
  }

  const diffMs = Date.now() - timestamp.toDate().getTime();

  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

export function getStationHealth(station: Pick<Station, "isActive" | "lastVisitedAt">): StationHealthDetails {
  if (!station.isActive) {
    return {
      label: "غير نشطة",
      toneClassName: "bg-[var(--surface-subtle)] text-[var(--muted)] dark:bg-[var(--surface-elevated)]",
      value: "inactive",
    };
  }

  const visitAgeDays = daysSince(station.lastVisitedAt);

  if (visitAgeDays === null || visitAgeDays > staleVisitDays) {
    return {
      label: visitAgeDays === null ? "تحتاج زيارة" : `لم تزر منذ ${visitAgeDays} يوم`,
      toneClassName: "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
      value: "attention",
    };
  }

  return {
    label: "سليمة",
    toneClassName: "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
    value: "healthy",
  };
}

export function isStationStale(station: Pick<Station, "isActive" | "lastVisitedAt">): boolean {
  return getStationHealth(station).value === "attention";
}
