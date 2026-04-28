import "server-only";

import { listReports, listStations } from "@/lib/db/repositories";
import type { Report, Station } from "@/types";

export const ANALYTICS_DEFAULT_RANGE_DAYS = 90;
export const ANALYTICS_REPORT_LIMIT = 5000;
export const ANALYTICS_STATION_LIMIT = 2000;

export interface BoundedReportStatsInput {
  rangeFrom: Date;
  reports: Report[];
  reportsTruncated: boolean;
  stations: Station[];
  stationsTruncated: boolean;
}

export function defaultAnalyticsRangeFrom(now = new Date()): Date {
  const rangeFrom = new Date(now);

  rangeFrom.setDate(rangeFrom.getDate() - ANALYTICS_DEFAULT_RANGE_DAYS);
  rangeFrom.setHours(0, 0, 0, 0);

  return rangeFrom;
}

export async function getBoundedReportStatsInput(now = new Date()): Promise<BoundedReportStatsInput> {
  const rangeFrom = defaultAnalyticsRangeFrom(now);
  const [stations, reports] = await Promise.all([
    listStations(),
    listReports({
      filters: { dateFrom: rangeFrom },
      limit: ANALYTICS_REPORT_LIMIT + 1,
    }),
  ]);

  return {
    rangeFrom,
    reports: reports.slice(0, ANALYTICS_REPORT_LIMIT),
    reportsTruncated: reports.length > ANALYTICS_REPORT_LIMIT,
    stations: stations.slice(0, ANALYTICS_STATION_LIMIT),
    stationsTruncated: stations.length > ANALYTICS_STATION_LIMIT,
  };
}
