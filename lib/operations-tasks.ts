import { reportFromData, stationFromData } from "@/lib/analytics";
import { REPORTS_COL, STATIONS_COL } from "@/lib/collections";
import { adminDb } from "@/lib/firebase-admin";
import { getStationHealth, isStationStale } from "@/lib/station-health";
import type { Report, Station } from "@/types";

export interface OperationTasks {
  inactiveStations: Station[];
  pendingReports: Report[];
  staleStations: Station[];
  totals: {
    inactiveStations: number;
    pendingReports: number;
    staleStations: number;
  };
}

export async function getOperationTasks(limit = 12): Promise<OperationTasks> {
  const [stationsSnapshot, pendingReportsSnapshot] = await Promise.all([
    adminDb().collection(STATIONS_COL).get(),
    adminDb().collection(REPORTS_COL).where("reviewStatus", "==", "pending").orderBy("submittedAt", "desc").get(),
  ]);
  const stations = stationsSnapshot.docs.map((doc) => stationFromData(doc.id, doc.data() as Partial<Station>));
  const pendingReports = pendingReportsSnapshot.docs.map((doc) => reportFromData(doc.id, doc.data() as Partial<Report>));
  const staleStations = stations
    .filter(isStationStale)
    .sort((a, b) => {
      const healthA = getStationHealth(a).value;
      const healthB = getStationHealth(b).value;

      return healthA.localeCompare(healthB);
    });
  const inactiveStations = stations.filter((station) => !station.isActive);

  return {
    inactiveStations: inactiveStations.slice(0, limit),
    pendingReports: pendingReports.slice(0, limit),
    staleStations: staleStations.slice(0, limit),
    totals: {
      inactiveStations: inactiveStations.length,
      pendingReports: pendingReports.length,
      staleStations: staleStations.length,
    },
  };
}
