import type { Report, Station, StatusOption } from "@/types";
import { formatIsoDateRome } from "@/lib/datetime";

export interface ZoneStats {
  activeStations: number;
  reports: number;
  stations: number;
  zone: string;
}

export interface TechnicianStats {
  pending: number;
  reports: number;
  technicianName: string;
  technicianUid: string;
}

export interface StatusSummary {
  count: number;
  status: StatusOption;
}

export type TrendGranularity = "day" | "month" | "week";

export interface ReportTrendPoint {
  key: string;
  label: string;
  pending: number;
  rejected: number;
  reviewed: number;
  total: number;
}

export interface PeriodComparisonMetric {
  changePercent: number | null;
  current: number;
  key: "activeTechnicians" | "pending" | "reports" | "reviewed";
  label: string;
  previous: number;
}

export function stationFromData(stationId: string, data: Partial<Station>): Station {
  return {
    stationId: data.stationId ?? stationId,
    label: data.label ?? "محطة بدون اسم",
    location: data.location ?? "غير محدد",
    zone: data.zone,
    stationType: data.stationType ?? "bait_station",
    externalCode: data.externalCode,
    installationStatus: data.installationStatus ?? "pending_field_verification",
    verifiedAt: data.verifiedAt,
    verifiedBy: data.verifiedBy,
    sourceDocumentId: data.sourceDocumentId,
    coordinates: data.coordinates,
    qrCodeValue: data.qrCodeValue ?? "",
    isActive: data.isActive ?? false,
    requiresImmediateSupervision: data.requiresImmediateSupervision ?? false,
    createdAt: data.createdAt as Station["createdAt"],
    createdBy: data.createdBy ?? "",
    updatedAt: data.updatedAt,
    updatedBy: data.updatedBy,
    lastVisitedAt: data.lastVisitedAt,
    totalReports: data.totalReports ?? 0,
  };
}

export function reportFromData(reportId: string, data: Partial<Report>): Report {
  return {
    reportId: data.reportId ?? reportId,
    stationId: data.stationId ?? "",
    stationLabel: data.stationLabel ?? "محطة بدون اسم",
    stationLocation: data.stationLocation,
    pestTypes: data.pestTypes,
    technicianUid: data.technicianUid ?? "",
    technicianName: data.technicianName ?? "فني غير محدد",
    status: (data.status ?? []) as StatusOption[],
    notes: data.notes,
    photoPaths: data.photoPaths,
    submittedAt: data.submittedAt as Report["submittedAt"],
    reviewStatus: data.reviewStatus ?? "pending",
    editedAt: data.editedAt,
    editedBy: data.editedBy,
    reviewedAt: data.reviewedAt,
    reviewedBy: data.reviewedBy,
    reviewNotes: data.reviewNotes,
  };
}

export function buildZoneStats(stations: Station[], reports: Report[]): ZoneStats[] {
  const stationZoneById = new Map(stations.map((station) => [station.stationId, station.zone ?? "غير محدد"]));
  const statsByZone = new Map<string, ZoneStats>();

  stations.forEach((station) => {
    const zone = station.zone ?? "غير محدد";
    const current = statsByZone.get(zone) ?? {
      activeStations: 0,
      reports: 0,
      stations: 0,
      zone,
    };

    current.stations += 1;
    current.activeStations += station.isActive ? 1 : 0;
    statsByZone.set(zone, current);
  });

  reports.forEach((report) => {
    const zone = stationZoneById.get(report.stationId) ?? "غير محدد";
    const current = statsByZone.get(zone) ?? {
      activeStations: 0,
      reports: 0,
      stations: 0,
      zone,
    };

    current.reports += 1;
    statsByZone.set(zone, current);
  });

  return Array.from(statsByZone.values()).sort((a, b) => b.reports - a.reports);
}

export function buildTechnicianStats(reports: Report[]): TechnicianStats[] {
  const statsByTechnician = new Map<string, TechnicianStats>();

  reports.forEach((report) => {
    const key = report.technicianUid || report.technicianName;
    const current = statsByTechnician.get(key) ?? {
      pending: 0,
      reports: 0,
      technicianName: report.technicianName,
      technicianUid: report.technicianUid,
    };

    current.reports += 1;
    current.pending += report.reviewStatus === "pending" ? 1 : 0;
    statsByTechnician.set(key, current);
  });

  return Array.from(statsByTechnician.values()).sort((a, b) => b.reports - a.reports).slice(0, 10);
}

export function buildStatusCounts(reports: Report[]): StatusSummary[] {
  const counts = new Map<StatusOption, number>();

  reports.forEach((report) => {
    report.status.forEach((status) => {
      counts.set(status, (counts.get(status) ?? 0) + 1);
    });
  });

  return Array.from(counts.entries())
    .map(([status, count]) => ({ count, status }))
    .sort((a, b) => b.count - a.count);
}

function startOfDay(date: Date): Date {
  const next = new Date(date);

  next.setHours(0, 0, 0, 0);

  return next;
}

function startOfWeek(date: Date): Date {
  const next = startOfDay(date);

  next.setDate(next.getDate() - next.getDay());

  return next;
}

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function addStep(date: Date, granularity: TrendGranularity): Date {
  const next = new Date(date);

  if (granularity === "day") {
    next.setDate(next.getDate() + 1);
  } else if (granularity === "week") {
    next.setDate(next.getDate() + 7);
  } else {
    next.setMonth(next.getMonth() + 1);
  }

  return next;
}

function trendGranularity(rangeFrom: Date, rangeTo: Date): TrendGranularity {
  const days = Math.max(1, Math.floor((startOfDay(rangeTo).getTime() - startOfDay(rangeFrom).getTime()) / 86_400_000) + 1);

  if (days <= 45) {
    return "day";
  }

  return days <= 180 ? "week" : "month";
}

function bucketStart(date: Date, granularity: TrendGranularity): Date {
  if (granularity === "day") {
    return startOfDay(date);
  }

  if (granularity === "week") {
    return startOfWeek(date);
  }

  return startOfMonth(date);
}

function bucketKey(date: Date): string {
  return formatIsoDateRome(date) ?? date.toISOString().slice(0, 10);
}

function trendLabel(date: Date, granularity: TrendGranularity, intlLocale: string): string {
  const formatter = (options: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat(intlLocale, { ...options, timeZone: "Europe/Rome" });

  if (granularity === "week") {
    const prefix = intlLocale.toLowerCase().startsWith("ar") ? "أسبوع " : "Week of ";
    return `${prefix}${formatter({ day: "numeric", month: "short" }).format(date)}`;
  }

  if (granularity === "month") {
    return formatter({ month: "short", year: "numeric" }).format(date);
  }

  return formatter({ day: "numeric", month: "short" }).format(date);
}

function createTrendPoint(date: Date, granularity: TrendGranularity, intlLocale: string): ReportTrendPoint {
  return {
    key: bucketKey(date),
    label: trendLabel(date, granularity, intlLocale),
    pending: 0,
    rejected: 0,
    reviewed: 0,
    total: 0,
  };
}

function submittedAtDate(report: Report): Date {
  return report.submittedAt.toDate();
}

export function buildReportTrend(reports: Report[], rangeFrom: Date, rangeTo: Date, intlLocale: string): ReportTrendPoint[] {
  const granularity = trendGranularity(rangeFrom, rangeTo);
  const buckets = new Map<string, ReportTrendPoint>();
  let cursor = bucketStart(rangeFrom, granularity);
  const finalBucket = bucketStart(rangeTo, granularity);

  while (cursor.getTime() <= finalBucket.getTime()) {
    const point = createTrendPoint(cursor, granularity, intlLocale);

    buckets.set(point.key, point);
    cursor = addStep(cursor, granularity);
  }

  reports.forEach((report) => {
    const key = bucketKey(bucketStart(submittedAtDate(report), granularity));
    const point = buckets.get(key);

    if (!point) {
      return;
    }

    point.total += 1;

    if (report.reviewStatus === "pending") {
      point.pending += 1;
    } else if (report.reviewStatus === "reviewed") {
      point.reviewed += 1;
    } else {
      point.rejected += 1;
    }
  });

  return Array.from(buckets.values());
}

function percentageChange(current: number, previous: number): number | null {
  if (previous === 0) {
    return current === 0 ? 0 : null;
  }

  return Math.round(((current - previous) / previous) * 1000) / 10;
}

function activeTechnicianCount(reports: Report[]): number {
  return new Set(reports.map((report) => report.technicianUid).filter(Boolean)).size;
}

function reviewedCount(reports: Report[]): number {
  return reports.filter((report) => report.reviewStatus === "reviewed").length;
}

function pendingCount(reports: Report[]): number {
  return reports.filter((report) => report.reviewStatus === "pending").length;
}

export interface PeriodComparisonLabels {
  activeTechnicians: string;
  pending: string;
  reviewed: string;
  totalReports: string;
}

export function buildPeriodComparison(
  currentReports: Report[],
  previousReports: Report[],
  labels: PeriodComparisonLabels,
): PeriodComparisonMetric[] {
  const values: PeriodComparisonMetric[] = [
    {
      current: currentReports.length,
      key: "reports",
      label: labels.totalReports,
      previous: previousReports.length,
      changePercent: percentageChange(currentReports.length, previousReports.length),
    },
    {
      current: pendingCount(currentReports),
      key: "pending",
      label: labels.pending,
      previous: pendingCount(previousReports),
      changePercent: percentageChange(pendingCount(currentReports), pendingCount(previousReports)),
    },
    {
      current: reviewedCount(currentReports),
      key: "reviewed",
      label: labels.reviewed,
      previous: reviewedCount(previousReports),
      changePercent: percentageChange(reviewedCount(currentReports), reviewedCount(previousReports)),
    },
    {
      current: activeTechnicianCount(currentReports),
      key: "activeTechnicians",
      label: labels.activeTechnicians,
      previous: activeTechnicianCount(previousReports),
      changePercent: percentageChange(activeTechnicianCount(currentReports), activeTechnicianCount(previousReports)),
    },
  ];

  return values;
}
