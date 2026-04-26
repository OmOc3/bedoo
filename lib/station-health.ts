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
      toneClassName: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
      value: "inactive",
    };
  }

  const visitAgeDays = daysSince(station.lastVisitedAt);

  if (visitAgeDays === null || visitAgeDays > staleVisitDays) {
    return {
      label: visitAgeDays === null ? "تحتاج زيارة" : `لم تزر منذ ${visitAgeDays} يوم`,
      toneClassName: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-200",
      value: "attention",
    };
  }

  return {
    label: "سليمة",
    toneClassName: "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-200",
    value: "healthy",
  };
}

export function isStationStale(station: Pick<Station, "isActive" | "lastVisitedAt">): boolean {
  return getStationHealth(station).value === "attention";
}
