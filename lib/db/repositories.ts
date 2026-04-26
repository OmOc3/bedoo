import "server-only";

import { createHash } from "node:crypto";
import { and, count, desc, eq, gte, inArray, like, lt, lte, or, sql, type SQL } from "drizzle-orm";
import { db } from "@/lib/db/client";
import {
  auditLogs,
  loginRateLimit,
  mobileWebSessions,
  reportStatuses,
  reports,
  stations,
  user,
} from "@/lib/db/schema";
import { appUserFromAuthUser, auditLogFromRow, reportFromRow, stationFromRow } from "@/lib/db/mappers";
import { AppError } from "@/lib/errors";
import type { AppUser, AuditLog, Coordinates, Report, ReportPhotoPaths, Station, StatusOption, UserRole } from "@/types";
import type { SharedReviewStatus } from "@/lib/shared/constants";

export interface CreateStationRecord {
  coordinates?: Coordinates;
  createdBy: string;
  label: string;
  location: string;
  qrCodeValue: string;
  stationId: string;
  zone?: string;
}

export interface UpdateStationRecord {
  coordinates?: Coordinates;
  label?: string;
  location?: string;
  qrCodeValue: string;
  updatedBy: string;
  zone?: string;
}

export interface ReportFilters {
  dateFrom?: Date | null;
  dateTo?: Date | null;
  reviewStatus?: SharedReviewStatus | "";
  stationId?: string;
  technicianUid?: string;
}

export interface ReportPageInput {
  cursor?: {
    id: string;
    submittedAtMs: number;
  } | null;
  filters?: ReportFilters;
  limit: number;
}

export interface SubmitReportInput {
  actorRole: UserRole;
  actorUid: string;
  clientReportId?: string;
  notes?: string;
  photoPaths?: ReportPhotoPaths;
  reportId?: string;
  stationId: string;
  status: StatusOption[];
  technicianName: string;
}

export interface SubmitReportResult {
  duplicate: boolean;
  reportId: string;
  stationLabel: string;
}

export interface LoginRateLimitRecord {
  attempts: number;
  key: string;
  lockedUntil?: number;
  updatedAt: number;
  windowStartAt: number;
}

export interface MobileWebSessionRecord {
  cookieHeader: string;
  expiresAt: Date;
  redirectTo: string;
  role: UserRole;
  tokenHash: string;
  uid: string;
}

function now(): Date {
  return new Date();
}

function idempotentReportId(actorUid: string, clientReportId: string): string {
  const digest = createHash("sha256").update(`${actorUid}:${clientReportId}`).digest("hex").slice(0, 40);

  return `mobile_${digest}`;
}

function sanitizeLike(value: string): string {
  return `%${value.replace(/[%_]/g, "\\$&")}%`;
}

export async function getAppUser(uid: string): Promise<AppUser | null> {
  const row = await db.query.user.findFirst({
    where: eq(user.id, uid),
  });

  return row ? appUserFromAuthUser(row) : null;
}

export async function getActiveAppUser(uid: string): Promise<AppUser | null> {
  const appUser = await getAppUser(uid);

  return appUser?.isActive ? appUser : null;
}

export async function getUserByEmail(email: string): Promise<AppUser | null> {
  const row = await db.query.user.findFirst({
    where: eq(user.email, email.trim().toLowerCase()),
  });

  return row ? appUserFromAuthUser(row) : null;
}

export async function listAppUsers(): Promise<AppUser[]> {
  const rows = await db.select().from(user).orderBy(user.name);

  return rows.map(appUserFromAuthUser);
}

export async function writeAuditLogRecord(entry: {
  action: string;
  actorRole: UserRole;
  actorUid: string;
  entityId: string;
  entityType: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  await db.insert(auditLogs).values({
    logId: crypto.randomUUID(),
    actorUid: entry.actorUid,
    actorRole: entry.actorRole,
    action: entry.action,
    entityType: entry.entityType,
    entityId: entry.entityId,
    createdAt: now(),
    metadata: entry.metadata,
  });
}

export async function listAuditLogs(input: {
  action?: string;
  actorUid?: string;
  dateFrom?: Date | null;
  dateTo?: Date | null;
  entityType?: string;
  limit: number;
}): Promise<AuditLog[]> {
  const conditions = [
    input.action ? eq(auditLogs.action, input.action) : undefined,
    input.entityType ? eq(auditLogs.entityType, input.entityType) : undefined,
    input.actorUid ? eq(auditLogs.actorUid, input.actorUid) : undefined,
    input.dateFrom ? gte(auditLogs.createdAt, input.dateFrom) : undefined,
    input.dateTo ? lte(auditLogs.createdAt, input.dateTo) : undefined,
  ].filter((condition) => condition !== undefined);

  const rows = await db
    .select()
    .from(auditLogs)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(auditLogs.createdAt))
    .limit(input.limit);

  return rows.map(auditLogFromRow);
}

export async function createStationRecord(input: CreateStationRecord): Promise<void> {
  await db.insert(stations).values({
    stationId: input.stationId,
    label: input.label,
    location: input.location,
    zone: input.zone,
    lat: input.coordinates?.lat,
    lng: input.coordinates?.lng,
    qrCodeValue: input.qrCodeValue,
    isActive: true,
    totalReports: 0,
    createdAt: now(),
    createdBy: input.createdBy,
  });
}

export async function updateStationRecord(stationId: string, input: UpdateStationRecord): Promise<void> {
  await db
    .update(stations)
    .set({
      label: input.label,
      location: input.location,
      zone: input.zone ?? null,
      lat: input.coordinates?.lat ?? null,
      lng: input.coordinates?.lng ?? null,
      qrCodeValue: input.qrCodeValue,
      updatedAt: now(),
      updatedBy: input.updatedBy,
    })
    .where(eq(stations.stationId, stationId));
}

export async function toggleStationStatusRecord(stationId: string, nextIsActive: boolean, updatedBy: string): Promise<void> {
  await db
    .update(stations)
    .set({
      isActive: nextIsActive,
      updatedAt: now(),
      updatedBy,
    })
    .where(eq(stations.stationId, stationId));
}

export async function getStationById(stationId: string): Promise<Station | null> {
  const row = await db.query.stations.findFirst({
    where: eq(stations.stationId, stationId),
  });

  return row ? stationFromRow(row) : null;
}

export async function listStations(query?: string): Promise<Station[]> {
  const normalized = query?.trim();
  const rows = await db
    .select()
    .from(stations)
    .where(
      normalized
        ? or(
            like(stations.stationId, sanitizeLike(normalized)),
            like(stations.label, sanitizeLike(normalized)),
            like(stations.location, sanitizeLike(normalized)),
            like(stations.zone, sanitizeLike(normalized)),
          )
        : undefined,
    )
    .orderBy(desc(stations.createdAt));

  return rows.map(stationFromRow);
}

async function statusesByReportId(reportIds: string[]): Promise<Map<string, StatusOption[]>> {
  if (reportIds.length === 0) {
    return new Map();
  }

  const rows = await db.select().from(reportStatuses).where(inArray(reportStatuses.reportId, reportIds));
  const grouped = new Map<string, StatusOption[]>();

  rows.forEach((row) => {
    const values = grouped.get(row.reportId) ?? [];

    values.push(row.status);
    grouped.set(row.reportId, values);
  });

  return grouped;
}

export async function listReports(input: ReportPageInput): Promise<Report[]> {
  const filters = input.filters ?? {};
  const cursorDate = input.cursor ? new Date(input.cursor.submittedAtMs) : null;
  const conditions = [
    filters.stationId ? eq(reports.stationId, filters.stationId) : undefined,
    filters.technicianUid ? eq(reports.technicianUid, filters.technicianUid) : undefined,
    filters.reviewStatus ? eq(reports.reviewStatus, filters.reviewStatus) : undefined,
    filters.dateFrom ? gte(reports.submittedAt, filters.dateFrom) : undefined,
    filters.dateTo ? lte(reports.submittedAt, filters.dateTo) : undefined,
    input.cursor && cursorDate
      ? or(
          lt(reports.submittedAt, cursorDate),
          and(eq(reports.submittedAt, cursorDate), lt(reports.reportId, input.cursor.id)),
        )
      : undefined,
  ].filter((condition) => condition !== undefined);

  const rows = await db
    .select()
    .from(reports)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(reports.submittedAt), desc(reports.reportId))
    .limit(input.limit);
  const statuses = await statusesByReportId(rows.map((row) => row.reportId));

  return rows.map((row) => reportFromRow(row, statuses.get(row.reportId) ?? []));
}

export async function getReportById(reportId: string): Promise<Report | null> {
  const row = await db.query.reports.findFirst({
    where: eq(reports.reportId, reportId),
  });

  if (!row) {
    return null;
  }

  const statuses = await statusesByReportId([reportId]);

  return reportFromRow(row, statuses.get(reportId) ?? []);
}

export async function listReportsForTechnician(technicianUid: string, limit: number): Promise<Report[]> {
  return listReports({
    filters: { technicianUid },
    limit,
  });
}

export async function submitReportRecord(input: SubmitReportInput): Promise<SubmitReportResult> {
  const reportDocId = input.clientReportId ? idempotentReportId(input.actorUid, input.clientReportId) : input.reportId;
  const reportId = reportDocId ?? crypto.randomUUID();
  let stationLabel = "محطة بدون اسم";
  let duplicate = false;

  await db.transaction(async (tx) => {
    const existingReport = await tx.query.reports.findFirst({
      where: eq(reports.reportId, reportId),
    });

    if (existingReport) {
      stationLabel = existingReport.stationLabel;
      duplicate = true;
      return;
    }

    const station = await tx.query.stations.findFirst({
      where: eq(stations.stationId, input.stationId),
    });

    if (!station) {
      throw new AppError("المحطة غير موجودة.", "STATION_NOT_FOUND", 404);
    }

    if (!station.isActive) {
      throw new AppError("هذه المحطة غير نشطة.", "STATION_INACTIVE", 409);
    }

    stationLabel = station.label.trim().length > 0 ? station.label : stationLabel;

    await tx.insert(reports).values({
      reportId,
      stationId: input.stationId,
      stationLabel,
      technicianUid: input.actorUid,
      technicianName: input.technicianName,
      clientReportId: input.clientReportId,
      notes: input.notes,
      photoPaths: input.photoPaths,
      submittedAt: now(),
      reviewStatus: "pending",
    });

    await tx.insert(reportStatuses).values(input.status.map((status) => ({ reportId, status })));

    await tx
      .update(stations)
      .set({
        lastVisitedAt: now(),
        totalReports: sql`${stations.totalReports} + 1`,
      })
      .where(eq(stations.stationId, input.stationId));
  });

  if (!duplicate) {
    await writeAuditLogRecord({
      actorUid: input.actorUid,
      actorRole: input.actorRole,
      action: "report.submit",
      entityType: "report",
      entityId: reportId,
      metadata: {
        stationId: input.stationId,
        status: input.status,
        hasPhotos: Boolean(input.photoPaths && Object.keys(input.photoPaths).length > 0),
        source: input.clientReportId ? "mobile" : "web",
      },
    });
  }

  return {
    duplicate,
    reportId,
    stationLabel,
  };
}

export async function updateReportReviewRecord(
  reportId: string,
  input: {
    reviewNotes?: string;
    reviewStatus: SharedReviewStatus;
    reviewedBy: string;
  },
): Promise<Report | null> {
  const report = await getReportById(reportId);

  if (!report) {
    return null;
  }

  await db
    .update(reports)
    .set({
      reviewStatus: input.reviewStatus,
      reviewedAt: now(),
      reviewedBy: input.reviewedBy,
      reviewNotes: input.reviewNotes ?? null,
    })
    .where(eq(reports.reportId, reportId));

  return report;
}

export async function getStationLocations(stationIds: string[]): Promise<Map<string, string>> {
  const uniqueStationIds = Array.from(new Set(stationIds.filter(Boolean)));

  if (uniqueStationIds.length === 0) {
    return new Map();
  }

  const rows = await db
    .select({
      stationId: stations.stationId,
      location: stations.location,
    })
    .from(stations)
    .where(inArray(stations.stationId, uniqueStationIds));

  return new Map(rows.map((row) => [row.stationId, row.location]));
}

export async function countRows(table: "reports" | "stations" | "users", condition?: SQL): Promise<number> {
  if (table === "reports") {
    const [row] = await db.select({ value: count() }).from(reports).where(condition);

    return row?.value ?? 0;
  }

  if (table === "stations") {
    const [row] = await db.select({ value: count() }).from(stations).where(condition);

    return row?.value ?? 0;
  }

  const [row] = await db.select({ value: count() }).from(user).where(condition);

  return row?.value ?? 0;
}

export async function getLoginRateLimitRecord(key: string): Promise<LoginRateLimitRecord | null> {
  const row = await db.query.loginRateLimit.findFirst({
    where: eq(loginRateLimit.key, key),
  });

  return row ? { ...row, lockedUntil: row.lockedUntil ?? undefined } : null;
}

export async function upsertLoginRateLimitRecord(record: LoginRateLimitRecord): Promise<void> {
  await db
    .insert(loginRateLimit)
    .values(record)
    .onConflictDoUpdate({
      target: loginRateLimit.key,
      set: {
        attempts: record.attempts,
        windowStartAt: record.windowStartAt,
        updatedAt: record.updatedAt,
        lockedUntil: record.lockedUntil,
      },
    });
}

export async function deleteLoginRateLimitRecord(key: string): Promise<void> {
  await db.delete(loginRateLimit).where(eq(loginRateLimit.key, key));
}

export async function createMobileWebSessionRecord(record: MobileWebSessionRecord): Promise<void> {
  await db.insert(mobileWebSessions).values({
    ...record,
    createdAt: now(),
  });
}

export async function consumeMobileWebSessionRecord(tokenHash: string): Promise<MobileWebSessionRecord | null> {
  return db.transaction(async (tx) => {
    const record = await tx.query.mobileWebSessions.findFirst({
      where: eq(mobileWebSessions.tokenHash, tokenHash),
    });

    if (!record) {
      return null;
    }

    await tx.delete(mobileWebSessions).where(eq(mobileWebSessions.tokenHash, tokenHash));

    if (record.expiresAt.getTime() <= Date.now()) {
      return null;
    }

    return {
      tokenHash: record.tokenHash,
      uid: record.uid,
      role: record.role,
      redirectTo: record.redirectTo,
      cookieHeader: record.cookieHeader,
      expiresAt: record.expiresAt,
    };
  });
}
