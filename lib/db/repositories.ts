import "server-only";

import { createHash } from "node:crypto";
import { and, count, desc, eq, gte, inArray, like, lt, lte, or, sql, type SQL } from "drizzle-orm";
import { db } from "@/lib/db/client";
import {
  attendanceSessions,
  auditLogs,
  clientOrders,
  loginRateLimit,
  mobileWebSessions,
  reportStatuses,
  reports,
  stations,
  user,
} from "@/lib/db/schema";
import { appUserFromAuthUser, auditLogFromRow, reportFromRow, requiredTimestamp, stationFromRow } from "@/lib/db/mappers";
import { AppError } from "@/lib/errors";
import type {
  AppUser,
  AttendanceSession,
  AuditLog,
  ClientOrder,
  ClientOrderStatus,
  Coordinates,
  Report,
  ReportPhotoPaths,
  Station,
  StatusOption,
  UserRole,
} from "@/types";
import type { SharedReviewStatus } from "@ecopest/shared/constants";

export interface CreateStationRecord {
  coordinates?: Coordinates;
  createdBy: string;
  description?: string;
  label: string;
  location: string;
  photoUrls?: string[];
  qrCodeValue: string;
  requiresImmediateSupervision?: boolean;
  stationId: string;
  zone?: string;
}

export interface UpdateStationRecord {
  coordinates?: Coordinates;
  description?: string;
  label?: string;
  location?: string;
  photoUrls?: string[];
  qrCodeValue: string;
  requiresImmediateSupervision?: boolean;
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

export interface StationTechnicianVisit {
  reportId: string;
  submittedAt: Date;
  technicianName: string;
  technicianUid: string;
}

export interface PendingReviewNotificationSnapshot {
  latestReport?: {
    reportId: string;
    stationLabel: string;
    submittedAt: Date;
    technicianName: string;
  };
  pendingCount: number;
}

export interface ClockAttendanceInput {
  actorRole: UserRole;
  notes?: string;
  technicianName: string;
  technicianUid: string;
}

export interface CreateClientOrderInput {
  actorRole: UserRole;
  clientUid: string;
  clientName: string;
  note?: string;
  photoUrl?: string;
  stationId: string;
}

function now(): Date {
  return new Date();
}

const generatedStationIdLength = 6;

export async function generateNextStationId(): Promise<string> {
  const [row] = await db
    .select({
      maxStationNumber: sql<number>`coalesce(max(cast(${stations.stationId} as integer)), 0)`,
    })
    .from(stations)
    .where(sql`${stations.stationId} <> '' and ${stations.stationId} not glob '*[^0-9]*'`);
  const rawMaxStationNumber = row?.maxStationNumber;
  const currentMax =
    typeof rawMaxStationNumber === "number" ? rawMaxStationNumber : Number(rawMaxStationNumber ?? 0);

  return String(currentMax + 1).padStart(generatedStationIdLength, "0");
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
    description: input.description,
    zone: input.zone,
    photoUrls: input.photoUrls,
    lat: input.coordinates?.lat,
    lng: input.coordinates?.lng,
    qrCodeValue: input.qrCodeValue,
    isActive: true,
    requiresImmediateSupervision: input.requiresImmediateSupervision ?? false,
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
      description: input.description ?? null,
      zone: input.zone ?? null,
      photoUrls: input.photoUrls ?? null,
      lat: input.coordinates?.lat ?? null,
      lng: input.coordinates?.lng ?? null,
      qrCodeValue: input.qrCodeValue,
      requiresImmediateSupervision: input.requiresImmediateSupervision,
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

export async function listStationTechnicianVisits(stationId: string, limit = 50): Promise<StationTechnicianVisit[]> {
  const safeLimit = Math.min(Math.max(limit, 1), 200);
  const rows = await db
    .select({
      reportId: reports.reportId,
      submittedAt: reports.submittedAt,
      technicianName: reports.technicianName,
      technicianUid: reports.technicianUid,
    })
    .from(reports)
    .where(eq(reports.stationId, stationId))
    .orderBy(desc(reports.submittedAt), desc(reports.reportId))
    .limit(safeLimit);

  return rows.map((row) => ({
    reportId: row.reportId,
    submittedAt: row.submittedAt,
    technicianName: row.technicianName,
    technicianUid: row.technicianUid,
  }));
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

export async function getPendingReviewNotificationSnapshot(): Promise<PendingReviewNotificationSnapshot> {
  const [pendingCountRow, latestReport] = await Promise.all([
    db.select({ value: count() }).from(reports).where(eq(reports.reviewStatus, "pending")),
    db
      .select({
        reportId: reports.reportId,
        stationLabel: reports.stationLabel,
        submittedAt: reports.submittedAt,
        technicianName: reports.technicianName,
      })
      .from(reports)
      .where(eq(reports.reviewStatus, "pending"))
      .orderBy(desc(reports.submittedAt), desc(reports.reportId))
      .limit(1),
  ]);

  return {
    pendingCount: pendingCountRow[0]?.value ?? 0,
    latestReport: latestReport[0],
  };
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

function attendanceFromRow(row: typeof attendanceSessions.$inferSelect): AttendanceSession {
  return {
    attendanceId: row.attendanceId,
    technicianUid: row.technicianUid,
    technicianName: row.technicianName,
    clockInAt: row.clockInAt ? requiredTimestamp(row.clockInAt) : requiredTimestamp(new Date()),
    clockOutAt: row.clockOutAt ? requiredTimestamp(row.clockOutAt) : undefined,
    notes: row.notes ?? undefined,
  };
}

export async function getOpenAttendanceSession(technicianUid: string): Promise<AttendanceSession | null> {
  const row = await db.query.attendanceSessions.findFirst({
    where: and(eq(attendanceSessions.technicianUid, technicianUid), sql`${attendanceSessions.clockOutAt} is null`),
    orderBy: [desc(attendanceSessions.clockInAt)],
  });

  return row ? attendanceFromRow(row) : null;
}

export async function clockInAttendanceSession(input: ClockAttendanceInput): Promise<AttendanceSession> {
  const openSession = await getOpenAttendanceSession(input.technicianUid);

  if (openSession) {
    throw new AppError("يوجد حضور مفتوح بالفعل، يجب تسجيل الانصراف أولًا.", "ATTENDANCE_ALREADY_OPEN", 409);
  }

  const record = {
    attendanceId: crypto.randomUUID(),
    technicianUid: input.technicianUid,
    technicianName: input.technicianName,
    clockInAt: now(),
    clockOutAt: null,
    notes: input.notes ?? null,
    createdAt: now(),
  };

  await db.insert(attendanceSessions).values(record);
  await writeAuditLogRecord({
    actorUid: input.technicianUid,
    actorRole: input.actorRole,
    action: "attendance.clock_in",
    entityType: "attendance",
    entityId: record.attendanceId,
  });

  return attendanceFromRow(record);
}

export async function clockOutAttendanceSession(input: ClockAttendanceInput): Promise<AttendanceSession> {
  const openSession = await getOpenAttendanceSession(input.technicianUid);

  if (!openSession) {
    throw new AppError("لا يوجد حضور مفتوح لتسجيل الانصراف.", "ATTENDANCE_NOT_FOUND", 404);
  }

  const clockOutAt = now();
  await db
    .update(attendanceSessions)
    .set({
      clockOutAt,
      notes: input.notes ?? openSession.notes ?? null,
    })
    .where(eq(attendanceSessions.attendanceId, openSession.attendanceId));

  await writeAuditLogRecord({
    actorUid: input.technicianUid,
    actorRole: input.actorRole,
    action: "attendance.clock_out",
    entityType: "attendance",
    entityId: openSession.attendanceId,
  });

  return {
    ...openSession,
    clockOutAt: requiredTimestamp(clockOutAt),
    notes: input.notes ?? openSession.notes,
  };
}

export async function listAttendanceSessions(technicianUid: string, limit = 30): Promise<AttendanceSession[]> {
  const safeLimit = Math.min(Math.max(limit, 1), 120);
  const rows = await db
    .select()
    .from(attendanceSessions)
    .where(eq(attendanceSessions.technicianUid, technicianUid))
    .orderBy(desc(attendanceSessions.clockInAt))
    .limit(safeLimit);

  return rows.map(attendanceFromRow);
}

function clientOrderFromRow(row: typeof clientOrders.$inferSelect): ClientOrder {
  return {
    orderId: row.orderId,
    clientUid: row.clientUid,
    clientName: row.clientName,
    stationId: row.stationId,
    stationLabel: row.stationLabel,
    note: row.note ?? undefined,
    photoUrl: row.photoUrl ?? undefined,
    status: row.status,
    createdAt: requiredTimestamp(row.createdAt),
    reviewedAt: row.reviewedAt ? requiredTimestamp(row.reviewedAt) : undefined,
    reviewedBy: row.reviewedBy ?? undefined,
  };
}

export async function createClientOrder(input: CreateClientOrderInput): Promise<ClientOrder> {
  const station = await getStationById(input.stationId);
  if (!station) {
    throw new AppError("المحطة غير موجودة.", "STATION_NOT_FOUND", 404);
  }

  const record = {
    orderId: crypto.randomUUID(),
    clientUid: input.clientUid,
    clientName: input.clientName,
    stationId: input.stationId,
    stationLabel: station.label,
    note: input.note ?? null,
    photoUrl: input.photoUrl ?? null,
    status: "pending" as ClientOrderStatus,
    createdAt: now(),
    reviewedAt: null,
    reviewedBy: null,
  };

  await db.insert(clientOrders).values(record);
  await writeAuditLogRecord({
    actorUid: input.clientUid,
    actorRole: input.actorRole,
    action: "client_order.create",
    entityType: "client_order",
    entityId: record.orderId,
    metadata: { stationId: input.stationId },
  });

  return clientOrderFromRow(record);
}

export async function listClientOrdersForClient(clientUid: string, limit = 100): Promise<ClientOrder[]> {
  const safeLimit = Math.min(Math.max(limit, 1), 200);
  const rows = await db
    .select()
    .from(clientOrders)
    .where(eq(clientOrders.clientUid, clientUid))
    .orderBy(desc(clientOrders.createdAt))
    .limit(safeLimit);

  return rows.map(clientOrderFromRow);
}

export async function listClientOrders(limit = 200): Promise<ClientOrder[]> {
  const safeLimit = Math.min(Math.max(limit, 1), 500);
  const rows = await db.select().from(clientOrders).orderBy(desc(clientOrders.createdAt)).limit(safeLimit);
  return rows.map(clientOrderFromRow);
}

export async function updateClientOrderStatus(
  orderId: string,
  status: ClientOrderStatus,
  reviewerUid: string,
  actorRole: UserRole,
): Promise<void> {
  await db
    .update(clientOrders)
    .set({
      status,
      reviewedAt: now(),
      reviewedBy: reviewerUid,
    })
    .where(eq(clientOrders.orderId, orderId));

  await writeAuditLogRecord({
    actorUid: reviewerUid,
    actorRole,
    action: "client_order.status_update",
    entityType: "client_order",
    entityId: orderId,
    metadata: { status },
  });
}

export async function listReportsForClientOrderedStations(clientUid: string, limit = 100): Promise<Report[]> {
  const stationRows = await db
    .select({ stationId: clientOrders.stationId })
    .from(clientOrders)
    .where(eq(clientOrders.clientUid, clientUid));
  const stationIds = Array.from(new Set(stationRows.map((row) => row.stationId)));

  if (stationIds.length === 0) {
    return [];
  }

  const safeLimit = Math.min(Math.max(limit, 1), 300);
  const rows = await db
    .select()
    .from(reports)
    .where(inArray(reports.stationId, stationIds))
    .orderBy(desc(reports.submittedAt), desc(reports.reportId))
    .limit(safeLimit);

  const statuses = await statusesByReportId(rows.map((row) => row.reportId));
  return rows.map((row) => reportFromRow(row, statuses.get(row.reportId) ?? []));
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

    const submittedAt = now();

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
      submittedAt,
      reviewStatus: "pending",
    });

    await tx.insert(reportStatuses).values(input.status.map((status) => ({ reportId, status })));

    await tx
      .update(stations)
      .set({
        lastVisitedAt: submittedAt,
        lastVisitedBy: input.technicianName,
        totalReports: sql`${stations.totalReports} + 1`,
      })
      .where(eq(stations.stationId, input.stationId));

    await tx.insert(auditLogs).values({
      logId: crypto.randomUUID(),
      actorUid: input.actorUid,
      actorRole: input.actorRole,
      action: "report.submit",
      entityType: "report",
      entityId: reportId,
      createdAt: submittedAt,
      metadata: {
        stationId: input.stationId,
        status: input.status,
        hasPhotos: Boolean(input.photoPaths && Object.keys(input.photoPaths).length > 0),
        source: input.clientReportId ? "mobile" : "web",
      },
    });
  });

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
