import "server-only";

import { listReports, listStations } from "@/lib/db/repositories";
import type { Report, Station } from "@/types";

export const ANALYTICS_DEFAULT_RANGE_DAYS = 90;
export const ANALYTICS_MAX_RANGE_DAYS = 366;
export const ANALYTICS_REPORT_LIMIT = 5000;
export const ANALYTICS_STATION_LIMIT = 2000;

export interface BoundedReportStatsInput {
  previousRangeFrom: Date;
  previousRangeTo: Date;
  previousReports: Report[];
  previousReportsTruncated: boolean;
  rangeFrom: Date;
  rangeTo: Date;
  rangeDays: number;
  reports: Report[];
  reportsTruncated: boolean;
  stations: Station[];
  stationsTruncated: boolean;
}

export interface AnalyticsRangeInput {
  dateFrom?: string;
  dateTo?: string;
}

export interface AnalyticsRange {
  rangeDays: number;
  rangeFrom: Date;
  rangeTo: Date;
}

function startOfDay(date: Date): Date {
  const next = new Date(date);

  next.setHours(0, 0, 0, 0);

  return next;
}

function endOfDay(date: Date): Date {
  const next = new Date(date);

  next.setHours(23, 59, 59, 999);

  return next;
}

function parseDate(value?: string): Date | null {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? null : date;
}

function inclusiveDays(rangeFrom: Date, rangeTo: Date): number {
  const millis = startOfDay(rangeTo).getTime() - startOfDay(rangeFrom).getTime();

  return Math.max(1, Math.floor(millis / 86_400_000) + 1);
}

export function defaultAnalyticsRangeFrom(now = new Date()): Date {
  const rangeFrom = new Date(now);

  rangeFrom.setDate(rangeFrom.getDate() - ANALYTICS_DEFAULT_RANGE_DAYS + 1);
  rangeFrom.setHours(0, 0, 0, 0);

  return rangeFrom;
}

export function resolveAnalyticsRange(input: AnalyticsRangeInput = {}, now = new Date()): AnalyticsRange {
  const parsedTo = parseDate(input.dateTo);
  const rangeTo = parsedTo ? endOfDay(parsedTo) : now;
  const parsedFrom = parseDate(input.dateFrom);
  let rangeFrom = parsedFrom ? startOfDay(parsedFrom) : defaultAnalyticsRangeFrom(rangeTo);

  if (rangeFrom.getTime() > rangeTo.getTime()) {
    rangeFrom = defaultAnalyticsRangeFrom(rangeTo);
  }

  const days = inclusiveDays(rangeFrom, rangeTo);

  if (days > ANALYTICS_MAX_RANGE_DAYS) {
    rangeFrom = startOfDay(rangeTo);
    rangeFrom.setDate(rangeFrom.getDate() - ANALYTICS_MAX_RANGE_DAYS + 1);
  }

  return {
    rangeDays: inclusiveDays(rangeFrom, rangeTo),
    rangeFrom,
    rangeTo,
  };
}

export async function getBoundedReportStatsInput(
  range: AnalyticsRange = resolveAnalyticsRange(),
): Promise<BoundedReportStatsInput> {
  const previousRangeTo = new Date(range.rangeFrom.getTime() - 1);
  const previousRangeFrom = new Date(previousRangeTo);

  previousRangeFrom.setDate(previousRangeFrom.getDate() - range.rangeDays + 1);
  previousRangeFrom.setHours(0, 0, 0, 0);

  const [stations, reports, previousReports] = await Promise.all([
    listStations(),
    listReports({
      filters: { dateFrom: range.rangeFrom, dateTo: range.rangeTo },
      limit: ANALYTICS_REPORT_LIMIT + 1,
    }),
    listReports({
      filters: { dateFrom: previousRangeFrom, dateTo: previousRangeTo },
      limit: ANALYTICS_REPORT_LIMIT + 1,
    }),
  ]);

  return {
    previousRangeFrom,
    previousRangeTo,
    previousReports: previousReports.slice(0, ANALYTICS_REPORT_LIMIT),
    previousReportsTruncated: previousReports.length > ANALYTICS_REPORT_LIMIT,
    rangeDays: range.rangeDays,
    rangeFrom: range.rangeFrom,
    rangeTo: range.rangeTo,
    reports: reports.slice(0, ANALYTICS_REPORT_LIMIT),
    reportsTruncated: reports.length > ANALYTICS_REPORT_LIMIT,
    stations: stations.slice(0, ANALYTICS_STATION_LIMIT),
    stationsTruncated: stations.length > ANALYTICS_STATION_LIMIT,
  };
}
