import "server-only";

import { FieldPath } from "firebase-admin/firestore";
import { reportFromData, stationFromData } from "@/lib/analytics";
import { REPORTS_COL, STATIONS_COL } from "@/lib/collections";
import { adminDb } from "@/lib/firebase-admin";
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
  const [stationsSnapshot, reportsSnapshot] = await Promise.all([
    adminDb()
      .collection(STATIONS_COL)
      .orderBy(FieldPath.documentId())
      .limit(ANALYTICS_STATION_LIMIT + 1)
      .get(),
    adminDb()
      .collection(REPORTS_COL)
      .where("submittedAt", ">=", rangeFrom)
      .orderBy("submittedAt", "desc")
      .limit(ANALYTICS_REPORT_LIMIT + 1)
      .get(),
  ]);

  const stations = stationsSnapshot.docs
    .slice(0, ANALYTICS_STATION_LIMIT)
    .map((doc) => stationFromData(doc.id, doc.data() as Partial<Station>));
  const reports = reportsSnapshot.docs
    .slice(0, ANALYTICS_REPORT_LIMIT)
    .map((doc) => reportFromData(doc.id, doc.data() as Partial<Report>));

  return {
    rangeFrom,
    reports,
    reportsTruncated: reportsSnapshot.docs.length > ANALYTICS_REPORT_LIMIT,
    stations,
    stationsTruncated: stationsSnapshot.docs.length > ANALYTICS_STATION_LIMIT,
  };
}
