import "server-only";

import { type DocumentData, type Query } from "firebase-admin/firestore";
import { reportFromData } from "@/lib/analytics";
import { REPORTS_COL, STATIONS_COL, USERS_COL } from "@/lib/collections";
import { adminDb } from "@/lib/firebase-admin";
import type { Report } from "@/types";

export interface ManagerDashboardStats {
  activeStations: number;
  pendingReviewReports: number;
  reportsThisWeek: number;
  technicians: number;
  totalReports: number;
  totalStations: number;
}

export interface SupervisorDashboardStats {
  activeStations: number;
  pendingReviewReports: number;
  reportsToday: number;
  totalReports: number;
}

async function countQuery(query: Query<DocumentData>): Promise<number> {
  const snapshot = await query.count().get();

  return snapshot.data().count;
}

export async function getManagerDashboardStats(now = new Date()): Promise<ManagerDashboardStats> {
  const startOfWeek = new Date(now);

  startOfWeek.setDate(startOfWeek.getDate() - 7);
  startOfWeek.setHours(0, 0, 0, 0);

  const [totalStations, activeStations, totalReports, reportsThisWeek, pendingReviewReports, technicians] =
    await Promise.all([
      countQuery(adminDb().collection(STATIONS_COL)),
      countQuery(adminDb().collection(STATIONS_COL).where("isActive", "==", true)),
      countQuery(adminDb().collection(REPORTS_COL)),
      countQuery(adminDb().collection(REPORTS_COL).where("submittedAt", ">=", startOfWeek)),
      countQuery(adminDb().collection(REPORTS_COL).where("reviewStatus", "==", "pending")),
      countQuery(adminDb().collection(USERS_COL).where("role", "==", "technician")),
    ]);

  return {
    activeStations,
    pendingReviewReports,
    reportsThisWeek,
    technicians,
    totalReports,
    totalStations,
  };
}

export async function getSupervisorDashboardStats(now = new Date()): Promise<SupervisorDashboardStats> {
  const startOfToday = new Date(now);

  startOfToday.setHours(0, 0, 0, 0);

  const [totalReports, reportsToday, pendingReviewReports, activeStations] = await Promise.all([
    countQuery(adminDb().collection(REPORTS_COL)),
    countQuery(adminDb().collection(REPORTS_COL).where("submittedAt", ">=", startOfToday)),
    countQuery(adminDb().collection(REPORTS_COL).where("reviewStatus", "==", "pending")),
    countQuery(adminDb().collection(STATIONS_COL).where("isActive", "==", true)),
  ]);

  return {
    activeStations,
    pendingReviewReports,
    reportsToday,
    totalReports,
  };
}

export async function getLatestReports(limit = 5): Promise<Report[]> {
  const snapshot = await adminDb().collection(REPORTS_COL).orderBy("submittedAt", "desc").limit(limit).get();

  return snapshot.docs.map((doc) => reportFromData(doc.id, doc.data() as Partial<Report>));
}
