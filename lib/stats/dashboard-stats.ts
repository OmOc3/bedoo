import "server-only";

import { eq, gte } from "drizzle-orm";
import { countRows, listReports } from "@/lib/db/repositories";
import { reports, stations, user } from "@/lib/db/schema";
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

export async function getManagerDashboardStats(now = new Date()): Promise<ManagerDashboardStats> {
  const startOfWeek = new Date(now);

  startOfWeek.setDate(startOfWeek.getDate() - 7);
  startOfWeek.setHours(0, 0, 0, 0);

  const [totalStations, activeStations, totalReports, reportsThisWeek, pendingReviewReports, technicians] =
    await Promise.all([
      countRows("stations"),
      countRows("stations", eq(stations.isActive, true)),
      countRows("reports"),
      countRows("reports", gte(reports.submittedAt, startOfWeek)),
      countRows("reports", eq(reports.reviewStatus, "pending")),
      countRows("users", eq(user.role, "technician")),
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
    countRows("reports"),
    countRows("reports", gte(reports.submittedAt, startOfToday)),
    countRows("reports", eq(reports.reviewStatus, "pending")),
    countRows("stations", eq(stations.isActive, true)),
  ]);

  return {
    activeStations,
    pendingReviewReports,
    reportsToday,
    totalReports,
  };
}

export async function getLatestReports(limit = 5): Promise<Report[]> {
  return listReports({ limit });
}
