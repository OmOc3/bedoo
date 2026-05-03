import "server-only";

import { createHash } from "node:crypto";
import { and, count, desc, eq, gte, inArray, like, lt, lte, or, sql, type SQL } from "drizzle-orm";
import { db } from "@/lib/db/client";
import {
  distanceMeters,
  isValidCoordinates,
  maxLocationAccuracyMeters,
  stationAccessRadiusMeters,
  stationsWithinRadius,
} from "@/lib/geo";
import {
  attendanceSessions,
  appSettings,
  auditLogs,
  clientSignupDevices,
  clientOrders,
  clientProfiles,
  clientStationAccess,
  dailyReportPhotos,
  dailyWorkReports,
  dailyWorkReportStations,
  loginRateLimit,
  reportPhotos,
  mobileWebSessions,
  reportStatuses,
  reports,
  stations,
  technicianShifts,
  technicianWorkSchedules,
  user,
} from "@/lib/db/schema";
import { appUserFromAuthUser, auditLogFromRow, reportFromRow, requiredTimestamp, stationFromRow } from "@/lib/db/mappers";
import { AppError } from "@/lib/errors";
import { stationClientNamesByStationId } from "@/lib/stations/qr-export";
import {
  isShiftSalaryStatus,
  isValidShiftTime,
  isWithinScheduleWindow,
  normalizeWorkDays,
} from "@/lib/shifts/schedule";
import type {
  AppUser,
  AppTimestamp,
  AttendanceLocation,
  AttendanceSession,
  AuditLog,
  ClientOrder,
  ClientOrderWithStation,
  ClientProfile,
  ClientStationAccess,
  ClientOrderStatus,
  Coordinates,
  DailyReportPhoto,
  DailyWorkReport,
  Report,
  ReportPhoto,
  PestTypeOption,
  ReportPhotoCategory,
  ReportPhotoPaths,
  ShiftSalaryStatus,
  ShiftStationCompletion,
  ShiftStatus,
  Station,
  StatusOption,
  SupportContactSettings,
  TechnicianShift,
  TechnicianWorkSchedule,
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
  pestTypes: PestTypeOption[];
  photos?: SubmitReportPhotoInput[];
  photoPaths?: ReportPhotoPaths;
  reportId?: string;
  stationId: string;
  status: StatusOption[];
  technicianName: string;
}

export interface SubmitReportPhotoInput {
  category: ReportPhotoCategory;
  sortOrder?: number;
  url: string;
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

export interface StationQrExportData {
  clientNamesByStationId: Map<string, string>;
  stations: Station[];
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

const appSettingsSingletonId = "global";

export interface AppSettingsRecord {
  clientDailyStationOrderLimit: number;
  maintenanceEnabled: boolean;
  maintenanceMessage?: string;
  supportContact?: SupportContactSettings;
  supportEmail?: string;
  supportHours?: string;
  supportPhone?: string;
  updatedAt?: AppTimestamp;
  updatedBy?: string;
}

function appSettingsFromRow(row: typeof appSettings.$inferSelect): AppSettingsRecord {
  const supportEmail = row.supportEmail ?? undefined;
  const supportHours = row.supportHours ?? undefined;
  const supportPhone = row.supportPhone ?? undefined;
  const supportContact =
    supportEmail || supportHours || supportPhone
      ? {
          email: supportEmail,
          hours: supportHours,
          phone: supportPhone,
        }
      : undefined;

  return {
    clientDailyStationOrderLimit: row.clientDailyStationOrderLimit,
    maintenanceEnabled: row.maintenanceEnabled,
    maintenanceMessage: row.maintenanceMessage ?? undefined,
    supportContact,
    supportEmail,
    supportHours,
    supportPhone,
    updatedAt: row.updatedAt ? requiredTimestamp(row.updatedAt) : undefined,
    updatedBy: row.updatedBy ?? undefined,
  };
}

function columnNameFromPragmaRow(row: unknown): string | null {
  if (!row || typeof row !== "object" || !("name" in row)) {
    return null;
  }

  return typeof row.name === "string" ? row.name : null;
}

async function tableColumnNames(table: string): Promise<Set<string>> {
  const tableInfo = await db.$client.execute({
    sql: `PRAGMA table_info(${table})`,
    args: [],
  });

  return new Set(tableInfo.rows.map(columnNameFromPragmaRow).filter((name): name is string => Boolean(name)));
}

async function ensureAppSettingsTableExists(): Promise<void> {
  // Dev-safety: some environments may not have run migrations yet.
  // Creating the table here avoids a hard crash during auth/session bootstrap.
  await db.$client.execute({
    sql: `
      create table if not exists app_settings (
        setting_id text primary key not null,
        maintenance_mode_enabled integer not null default 0,
        maintenance_message text,
        client_daily_order_limit integer not null default 5,
        support_phone text,
        support_email text,
        support_hours text,
        updated_at integer,
        updated_by text
      )
    `,
    args: [],
  });

  const columns = await tableColumnNames("app_settings");
  const missingColumns = [
    { name: "support_phone", sql: "ALTER TABLE app_settings ADD support_phone text" },
    { name: "support_email", sql: "ALTER TABLE app_settings ADD support_email text" },
    { name: "support_hours", sql: "ALTER TABLE app_settings ADD support_hours text" },
  ];

  for (const column of missingColumns) {
    if (!columns.has(column.name)) {
      await db.$client.execute({ sql: column.sql, args: [] });
    }
  }
}

export async function getAppSettings(): Promise<AppSettingsRecord> {
  let row: typeof appSettings.$inferSelect | undefined;

  try {
    await ensureAppSettingsTableExists();
    [row] = await db
      .select()
      .from(appSettings)
      .where(eq(appSettings.settingId, appSettingsSingletonId))
      .limit(1);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "";

    if (message.toLowerCase().includes("app_settings")) {
      try {
        await ensureAppSettingsTableExists();
        [row] = await db
          .select()
          .from(appSettings)
          .where(eq(appSettings.settingId, appSettingsSingletonId))
          .limit(1);
      } catch {
        // If we still cannot create/read the table (read-only DB, locked DB, or migration not applied),
        // fall back to safe defaults to avoid crashing auth-protected pages.
        return { maintenanceEnabled: false, clientDailyStationOrderLimit: 0 };
      }
    } else {
      // Unknown DB error: fail safe in runtime to keep the app usable.
      return { maintenanceEnabled: false, clientDailyStationOrderLimit: 0 };
    }
  }

  if (row) {
    return appSettingsFromRow(row);
  }

  try {
    await ensureAppSettingsTableExists();
    await db.insert(appSettings).values({
      settingId: appSettingsSingletonId,
      maintenanceEnabled: false,
      clientDailyStationOrderLimit: 0,
      updatedAt: now(),
      updatedBy: null,
    });

    const [created] = await db
      .select()
      .from(appSettings)
      .where(eq(appSettings.settingId, appSettingsSingletonId))
      .limit(1);

    return created ? appSettingsFromRow(created) : { maintenanceEnabled: false, clientDailyStationOrderLimit: 0 };
  } catch {
    return { maintenanceEnabled: false, clientDailyStationOrderLimit: 0 };
  }
}

export async function updateAppSettings(input: {
  actorUid: string;
  actorRole: UserRole;
  maintenanceEnabled: boolean;
  maintenanceMessage?: string;
  clientDailyStationOrderLimit: number;
  supportEmail?: string;
  supportHours?: string;
  supportPhone?: string;
}): Promise<AppSettingsRecord> {
  if (input.actorRole !== "manager") {
    throw new AppError("ليست لديك صلاحية لتحديث الإعدادات.", "SETTINGS_FORBIDDEN", 403);
  }

  try {
    await ensureAppSettingsTableExists();
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "";
    throw new AppError(
      "تعذر حفظ الإعدادات لأن قاعدة البيانات غير مهيأة بعد. شغّل `npm run db:migrate` ثم أعد المحاولة.",
      message.toLowerCase().includes("readonly") ? "SETTINGS_DB_READONLY" : "SETTINGS_DB_UNAVAILABLE",
      500,
    );
  }

  const safeLimit = Number.isFinite(input.clientDailyStationOrderLimit)
    ? Math.trunc(input.clientDailyStationOrderLimit)
    : 0;

  if (safeLimit < 0 || safeLimit > 1000) {
    throw new AppError("حد المحطات اليومي غير صالح.", "SETTINGS_LIMIT_INVALID", 400);
  }

  const updatedAt = now();
  const safeMessage =
    typeof input.maintenanceMessage === "string"
      ? input.maintenanceMessage.trim().slice(0, 280) || null
      : null;
  const safeSupportPhone =
    typeof input.supportPhone === "string" ? input.supportPhone.trim().slice(0, 40) || null : null;
  const safeSupportEmail =
    typeof input.supportEmail === "string" ? input.supportEmail.trim().toLowerCase().slice(0, 120) || null : null;
  const safeSupportHours =
    typeof input.supportHours === "string" ? input.supportHours.trim().slice(0, 160) || null : null;

  try {
    await db
      .insert(appSettings)
      .values({
        settingId: appSettingsSingletonId,
        maintenanceEnabled: input.maintenanceEnabled,
        clientDailyStationOrderLimit: safeLimit,
        maintenanceMessage: safeMessage,
        supportEmail: safeSupportEmail,
        supportHours: safeSupportHours,
        supportPhone: safeSupportPhone,
        updatedAt,
        updatedBy: input.actorUid,
      })
      .onConflictDoUpdate({
        target: appSettings.settingId,
        set: {
          maintenanceEnabled: input.maintenanceEnabled,
          clientDailyStationOrderLimit: safeLimit,
          maintenanceMessage: safeMessage,
          supportEmail: safeSupportEmail,
          supportHours: safeSupportHours,
          supportPhone: safeSupportPhone,
          updatedAt,
          updatedBy: input.actorUid,
        },
      });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "";
    const lower = message.toLowerCase();
    const looksLikeMissingTable =
      lower.includes("app_settings") || lower.includes("no such table") || lower.includes("does not exist");
    const isReadonly = lower.includes("readonly") || lower.includes("read-only");

    throw new AppError(
      looksLikeMissingTable
        ? "لا يمكن حفظ الإعدادات لأن جدول الإعدادات غير موجود بقاعدة البيانات. شغّل `npm run db:migrate` ثم أعد المحاولة."
        : isReadonly
          ? "لا يمكن حفظ الإعدادات لأن قاعدة البيانات في وضع قراءة فقط. تحقق من `DATABASE_URL` وصلاحيات الملف."
          : "تعذر حفظ الإعدادات في قاعدة البيانات. حاول مرة أخرى.",
      looksLikeMissingTable ? "SETTINGS_TABLE_MISSING" : isReadonly ? "SETTINGS_DB_READONLY" : "SETTINGS_SAVE_FAILED",
      looksLikeMissingTable || isReadonly ? 500 : 400,
    );
  }

  await writeAuditLogRecord({
    actorUid: input.actorUid,
    actorRole: input.actorRole,
    action: "settings.update",
    entityType: "app_settings",
    entityId: appSettingsSingletonId,
    metadata: {
      maintenanceEnabled: input.maintenanceEnabled,
      maintenanceMessage: safeMessage ?? undefined,
      clientDailyStationOrderLimit: safeLimit,
      supportEmail: safeSupportEmail ?? undefined,
      supportHours: safeSupportHours ?? undefined,
      supportPhone: safeSupportPhone ?? undefined,
    },
  });

  return getAppSettings();
}

export interface ClockAttendanceInput {
  actorRole: UserRole;
  location: Coordinates & {
    accuracyMeters?: number;
  };
  notes?: string;
  stationId: string;
  technicianName: string;
  technicianUid: string;
}

export interface AttendanceFilters {
  clientUid?: string;
  dateFrom?: Date | null;
  dateTo?: Date | null;
  stationId?: string;
  technicianUid?: string;
}

export interface ClientStationAccessInput {
  actorUid: string;
  clientUid: string;
  stationIds: string[];
}

export interface ClientAttendanceSite {
  clientName: string;
  clientUid: string;
  locatedStationCount: number;
  stationCount: number;
}

export interface NearbyStation {
  distanceMeters: number;
  station: Station;
}

export interface CreateDailyWorkReportInput {
  actorRole: UserRole;
  photos?: string[];
  notes?: string;
  reportDate: Date;
  stationIds: string[];
  summary: string;
  technicianName: string;
  technicianUid: string;
}

export interface DailyWorkReportFilters {
  clientUid?: string;
  dateFrom?: Date | null;
  dateTo?: Date | null;
  stationId?: string;
  technicianUid?: string;
}

export interface CreateClientOrderInput {
  actorRole: UserRole;
  clientUid: string;
  clientName: string;
  coordinates?: Coordinates;
  note?: string;
  photoUrl?: string;
  stationDescription?: string;
  stationLabel: string;
  stationLocation: string;
}

export interface ClientDirectoryEntry {
  cancelledOrders: number;
  client: AppUser;
  completedOrders: number;
  inProgressOrders: number;
  latestOrderAt?: AppTimestamp;
  latestStationLocation?: string;
  pendingOrders: number;
  profile?: ClientProfile;
  stationCount: number;
  totalOrders: number;
}

export interface ClientAccountDetail {
  access: ClientStationAccess[];
  client: AppUser;
  dailyReports: DailyWorkReport[];
  orders: ClientOrderWithStation[];
  profile?: ClientProfile;
  reports: Report[];
  stations: Station[];
}

export interface UpsertClientProfileInput {
  actorRole: UserRole;
  actorUid: string;
  addresses: string[];
  clientUid: string;
  phone?: string;
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

export async function getClientByPhone(phone: string): Promise<boolean> {
  const normalizedPhone = phone.trim();

  if (!normalizedPhone) {
    return false;
  }

  const row = await db
    .select({ clientUid: clientProfiles.clientUid })
    .from(clientProfiles)
    .where(eq(clientProfiles.phone, normalizedPhone))
    .limit(1);

  return row.length > 0;
}

export interface ClientSignupDeviceReservation {
  deviceHash: string;
  existingClientUid?: string;
  reserved: boolean;
}

function hashClientSignupDeviceId(deviceId: string): string {
  return createHash("sha256").update(deviceId.trim()).digest("hex");
}

async function ensureClientSignupDevicesTableExists(): Promise<void> {
  await db.$client.execute({
    sql: `
      create table if not exists client_signup_devices (
        device_hash text primary key not null,
        client_uid text references user(id) on delete restrict,
        created_at integer not null
      )
    `,
    args: [],
  });
}

export async function reserveClientSignupDevice(deviceId: string): Promise<ClientSignupDeviceReservation> {
  const deviceHash = hashClientSignupDeviceId(deviceId);

  await ensureClientSignupDevicesTableExists();

  try {
    await db.insert(clientSignupDevices).values({
      deviceHash,
      clientUid: null,
      createdAt: now(),
    });

    return { deviceHash, reserved: true };
  } catch (error: unknown) {
    const [existing] = await db
      .select({
        clientUid: clientSignupDevices.clientUid,
      })
      .from(clientSignupDevices)
      .where(eq(clientSignupDevices.deviceHash, deviceHash))
      .limit(1);

    if (existing) {
      return {
        deviceHash,
        existingClientUid: existing.clientUid ?? undefined,
        reserved: false,
      };
    }

    throw error;
  }
}

export async function attachClientSignupDeviceToClient(input: {
  clientUid: string;
  deviceHash: string;
}): Promise<void> {
  await ensureClientSignupDevicesTableExists();
  await db
    .update(clientSignupDevices)
    .set({ clientUid: input.clientUid })
    .where(eq(clientSignupDevices.deviceHash, input.deviceHash));
}

export async function releaseClientSignupDeviceReservation(deviceHash: string): Promise<void> {
  await ensureClientSignupDevicesTableExists();
  await db
    .delete(clientSignupDevices)
    .where(and(eq(clientSignupDevices.deviceHash, deviceHash), sql`${clientSignupDevices.clientUid} is null`));
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

function auditLogsWhereClause(input: {
  action?: string;
  actorUid?: string;
  dateFrom?: Date | null;
  dateTo?: Date | null;
  entityType?: string;
}): SQL | undefined {
  const conditions = [
    input.action ? eq(auditLogs.action, input.action) : undefined,
    input.entityType ? eq(auditLogs.entityType, input.entityType) : undefined,
    input.actorUid ? eq(auditLogs.actorUid, input.actorUid) : undefined,
    input.dateFrom ? gte(auditLogs.createdAt, input.dateFrom) : undefined,
    input.dateTo ? lte(auditLogs.createdAt, input.dateTo) : undefined,
  ].filter((condition): condition is SQL => condition !== undefined);

  return conditions.length > 0 ? and(...conditions) : undefined;
}

export async function countAuditLogs(input: {
  action?: string;
  actorUid?: string;
  dateFrom?: Date | null;
  dateTo?: Date | null;
  entityType?: string;
}): Promise<number> {
  return countRows("auditLogs", auditLogsWhereClause(input));
}

export async function listAuditLogs(input: {
  action?: string;
  actorUid?: string;
  dateFrom?: Date | null;
  dateTo?: Date | null;
  entityType?: string;
  limit: number;
  offset?: number;
}): Promise<AuditLog[]> {
  const where = auditLogsWhereClause(input);

  const base = db
    .select()
    .from(auditLogs)
    .where(where)
    .orderBy(desc(auditLogs.createdAt))
    .limit(input.limit);

  const rows =
    input.offset !== undefined && input.offset > 0 ? await base.offset(input.offset) : await base;

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

async function getStationClientNames(stationIds: readonly string[]): Promise<Map<string, string>> {
  const uniqueIds = Array.from(new Set(stationIds.map((stationId) => stationId.trim()).filter(Boolean)));

  if (uniqueIds.length === 0) {
    return new Map();
  }

  const rows = await db
    .select({
      clientName: user.name,
      stationId: clientStationAccess.stationId,
    })
    .from(clientStationAccess)
    .innerJoin(user, eq(clientStationAccess.clientUid, user.id))
    .where(inArray(clientStationAccess.stationId, uniqueIds))
    .orderBy(user.name);

  return stationClientNamesByStationId(rows);
}

export async function listStationsForQrExport(input: {
  dateFrom?: Date | null;
  stationIds?: string[];
}): Promise<StationQrExportData> {
  const stationIds = input.stationIds
    ? Array.from(new Set(input.stationIds.map((stationId) => stationId.trim()).filter(Boolean)))
    : undefined;

  if (stationIds && stationIds.length === 0) {
    return { clientNamesByStationId: new Map(), stations: [] };
  }

  const conditions = [
    input.dateFrom ? gte(stations.createdAt, input.dateFrom) : undefined,
    stationIds ? inArray(stations.stationId, stationIds) : undefined,
  ].filter((condition) => condition !== undefined);

  const rows = await db
    .select()
    .from(stations)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(stations.createdAt));
  const exportStations = rows.map(stationFromRow);
  const clientNamesByStationId = await getStationClientNames(exportStations.map((station) => station.stationId));

  return { clientNamesByStationId, stations: exportStations };
}

export async function listNearbyStations(
  location: Coordinates,
  limit = 20,
  radiusMeters = stationAccessRadiusMeters,
): Promise<NearbyStation[]> {
  if (!isValidCoordinates(location)) {
    throw new AppError("إحداثيات الموقع غير صالحة.", "LOCATION_INVALID", 400);
  }

  const safeLimit = Math.min(Math.max(limit, 1), 100);
  const rows = await db.select().from(stations).where(eq(stations.isActive, true)).orderBy(stations.label);
  const activeStations = rows.map(stationFromRow);

  return stationsWithinRadius(activeStations, location, radiusMeters).slice(0, safeLimit);
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

function reportPhotoFromRow(row: typeof reportPhotos.$inferSelect): ReportPhoto {
  return {
    category: row.category,
    photoId: row.photoId,
    reportId: row.reportId,
    sortOrder: row.sortOrder,
    uploadedAt: requiredTimestamp(row.uploadedAt),
    uploadedBy: row.uploadedBy,
    url: row.url,
  };
}

async function photosByReportId(reportIds: string[]): Promise<Map<string, ReportPhoto[]>> {
  const uniqueReportIds = Array.from(new Set(reportIds.filter(Boolean)));

  if (uniqueReportIds.length === 0) {
    return new Map();
  }

  const rows = await db
    .select()
    .from(reportPhotos)
    .where(inArray(reportPhotos.reportId, uniqueReportIds))
    .orderBy(reportPhotos.sortOrder, reportPhotos.uploadedAt);
  const grouped = new Map<string, ReportPhoto[]>();

  rows.forEach((row) => {
    const values = grouped.get(row.reportId) ?? [];
    values.push(reportPhotoFromRow(row));
    grouped.set(row.reportId, values);
  });

  return grouped;
}

function withReportPhotos(report: Report, photos: ReportPhoto[] | undefined): Report {
  return {
    ...report,
    photos: photos && photos.length > 0 ? photos : undefined,
  };
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
  const reportIds = rows.map((row) => row.reportId);
  const [statuses, photos] = await Promise.all([statusesByReportId(reportIds), photosByReportId(reportIds)]);

  return rows.map((row) => withReportPhotos(reportFromRow(row, statuses.get(row.reportId) ?? []), photos.get(row.reportId)));
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

  const [statuses, photos] = await Promise.all([statusesByReportId([reportId]), photosByReportId([reportId])]);

  return withReportPhotos(reportFromRow(row, statuses.get(reportId) ?? []), photos.get(reportId));
}

export async function listReportsForTechnician(technicianUid: string, limit: number): Promise<Report[]> {
  return listReports({
    filters: { technicianUid },
    limit,
  });
}

function attendanceLocationFromRow(
  row: typeof attendanceSessions.$inferSelect,
  prefix: "clockIn" | "clockOut",
): AttendanceLocation | undefined {
  const lat = prefix === "clockIn" ? row.clockInLat : row.clockOutLat;
  const lng = prefix === "clockIn" ? row.clockInLng : row.clockOutLng;
  const stationId = prefix === "clockIn" ? row.clockInStationId : row.clockOutStationId;
  const stationLabel = prefix === "clockIn" ? row.clockInStationLabel : row.clockOutStationLabel;
  const clientUid = prefix === "clockIn" ? row.clockInClientUid : row.clockOutClientUid;
  const clientName = prefix === "clockIn" ? row.clockInClientName : row.clockOutClientName;
  const accuracyMeters = prefix === "clockIn" ? row.clockInAccuracyMeters : row.clockOutAccuracyMeters;
  const distance = prefix === "clockIn" ? row.clockInDistanceMeters : row.clockOutDistanceMeters;

  if (
    typeof lat !== "number" ||
    typeof lng !== "number" ||
    !stationId ||
    !stationLabel ||
    typeof distance !== "number"
  ) {
    return undefined;
  }

  return {
    accuracyMeters: typeof accuracyMeters === "number" ? accuracyMeters : undefined,
    clientName: clientName ?? undefined,
    clientUid: clientUid ?? undefined,
    coordinates: { lat, lng },
    distanceMeters: distance,
    stationId,
    stationLabel,
  };
}

function attendanceFromRow(row: typeof attendanceSessions.$inferSelect): AttendanceSession {
  return {
    attendanceId: row.attendanceId,
    shiftId: row.shiftId ?? undefined,
    technicianUid: row.technicianUid,
    technicianName: row.technicianName,
    clockInAt: row.clockInAt ? requiredTimestamp(row.clockInAt) : requiredTimestamp(new Date()),
    clockInLocation: attendanceLocationFromRow(row, "clockIn"),
    clockOutAt: row.clockOutAt ? requiredTimestamp(row.clockOutAt) : undefined,
    clockOutLocation: attendanceLocationFromRow(row, "clockOut"),
    notes: row.notes ?? undefined,
  };
}

async function verifyAttendanceLocation(input: ClockAttendanceInput): Promise<AttendanceLocation> {
  const coordinates = {
    lat: input.location.lat,
    lng: input.location.lng,
  };

  if (!isValidCoordinates(coordinates)) {
    throw new AppError("إحداثيات الموقع غير صالحة.", "ATTENDANCE_LOCATION_INVALID", 400);
  }

  if (
    typeof input.location.accuracyMeters === "number" &&
    input.location.accuracyMeters > maxLocationAccuracyMeters
  ) {
    throw new AppError(
      "دقة الموقع ضعيفة. اقترب من الموقع أو فعّل GPS ثم حاول مرة أخرى.",
      "ATTENDANCE_LOCATION_ACCURACY_LOW",
      400,
    );
  }

  const station = await getStationById(input.stationId);

  if (!station) {
    throw new AppError("المحطة غير موجودة.", "STATION_NOT_FOUND", 404);
  }

  if (!station.isActive) {
    throw new AppError("هذه المحطة غير نشطة.", "STATION_INACTIVE", 409);
  }

  if (!station.coordinates) {
    throw new AppError("لا توجد إحداثيات مسجلة لهذه المحطة.", "ATTENDANCE_STATION_LOCATION_MISSING", 409);
  }

  const distance = distanceMeters(coordinates, station.coordinates);

  if (distance > stationAccessRadiusMeters) {
    throw new AppError("أنت خارج نطاق هذه المحطة.", "ATTENDANCE_OUT_OF_RANGE", 403);
  }

  const [clientAccess] = await db
    .select({
      clientName: user.name,
      clientUid: clientStationAccess.clientUid,
    })
    .from(clientStationAccess)
    .innerJoin(user, eq(clientStationAccess.clientUid, user.id))
    .where(eq(clientStationAccess.stationId, station.stationId))
    .limit(1);

  return {
    accuracyMeters: input.location.accuracyMeters,
    clientName: clientAccess?.clientName,
    clientUid: clientAccess?.clientUid,
    coordinates,
    distanceMeters: Math.round(distance),
    stationId: station.stationId,
    stationLabel: station.label,
  };
}

async function writeRejectedAttendanceAudit(
  input: ClockAttendanceInput,
  action: "attendance.clock_in_rejected" | "attendance.clock_out_rejected",
  error: unknown,
): Promise<void> {
  const code = error instanceof AppError ? error.code : "ATTENDANCE_REJECTED";
  const message = error instanceof Error ? error.message : "Attendance rejected";

  await writeAuditLogRecord({
    actorUid: input.technicianUid,
    actorRole: input.actorRole,
    action,
    entityType: "attendance",
    entityId: input.technicianUid,
    metadata: {
      accuracyMeters: input.location.accuracyMeters,
      code,
      lat: input.location.lat,
      lng: input.location.lng,
      message,
      stationId: input.stationId,
    },
  });
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

  const openShift =
    input.actorRole === "technician"
      ? await requireOpenTechnicianShift(input.technicianUid)
      : await getOpenShift(input.technicianUid);

  let verifiedLocation: AttendanceLocation;

  try {
    verifiedLocation = await verifyAttendanceLocation(input);
  } catch (error: unknown) {
    await writeRejectedAttendanceAudit(input, "attendance.clock_in_rejected", error);
    throw error;
  }

  const clockInAt = now();
  const record = {
    attendanceId: crypto.randomUUID(),
    shiftId: openShift?.shiftId ?? null,
    technicianUid: input.technicianUid,
    technicianName: input.technicianName,
    clockInAt,
    clockInLat: verifiedLocation.coordinates.lat,
    clockInLng: verifiedLocation.coordinates.lng,
    clockInAccuracyMeters: verifiedLocation.accuracyMeters ?? null,
    clockInStationId: verifiedLocation.stationId,
    clockInStationLabel: verifiedLocation.stationLabel,
    clockInClientUid: verifiedLocation.clientUid ?? null,
    clockInClientName: verifiedLocation.clientName ?? null,
    clockInDistanceMeters: verifiedLocation.distanceMeters,
    clockOutAt: null,
    clockOutLat: null,
    clockOutLng: null,
    clockOutAccuracyMeters: null,
    clockOutStationId: null,
    clockOutStationLabel: null,
    clockOutClientUid: null,
    clockOutClientName: null,
    clockOutDistanceMeters: null,
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
    metadata: {
      clientUid: verifiedLocation.clientUid,
      distanceMeters: verifiedLocation.distanceMeters,
      shiftId: openShift?.shiftId,
      stationId: verifiedLocation.stationId,
    },
  });

  return {
    attendanceId: record.attendanceId,
    shiftId: record.shiftId ?? undefined,
    technicianUid: record.technicianUid,
    technicianName: record.technicianName,
    clockInAt: requiredTimestamp(clockInAt),
    clockInLocation: verifiedLocation,
    notes: input.notes,
  };
}

export async function clockOutAttendanceSession(input: ClockAttendanceInput): Promise<AttendanceSession> {
  const openSession = await getOpenAttendanceSession(input.technicianUid);

  if (!openSession) {
    throw new AppError("لا يوجد حضور مفتوح لتسجيل الانصراف.", "ATTENDANCE_NOT_FOUND", 404);
  }

  if (input.actorRole === "technician") {
    const openShift = await requireOpenTechnicianShift(input.technicianUid);
    if (openSession.shiftId !== openShift.shiftId) {
      throw new AppError("هذا الحضور غير مرتبط بالشيفت النشط.", "ATTENDANCE_SHIFT_MISMATCH", 409);
    }
  }

  if (openSession.clockInLocation?.stationId !== input.stationId) {
    throw new AppError("يجب تسجيل الانصراف من نفس المحطة.", "ATTENDANCE_STATION_MISMATCH", 409);
  }

  let verifiedLocation: AttendanceLocation;

  try {
    verifiedLocation = await verifyAttendanceLocation(input);
  } catch (error: unknown) {
    await writeRejectedAttendanceAudit(input, "attendance.clock_out_rejected", error);
    throw error;
  }

  const clockOutAt = now();
  await db
    .update(attendanceSessions)
    .set({
      clockOutAt,
      clockOutLat: verifiedLocation.coordinates.lat,
      clockOutLng: verifiedLocation.coordinates.lng,
      clockOutAccuracyMeters: verifiedLocation.accuracyMeters ?? null,
      clockOutStationId: verifiedLocation.stationId,
      clockOutStationLabel: verifiedLocation.stationLabel,
      clockOutClientUid: verifiedLocation.clientUid ?? null,
      clockOutClientName: verifiedLocation.clientName ?? null,
      clockOutDistanceMeters: verifiedLocation.distanceMeters,
      notes: input.notes ?? openSession.notes ?? null,
    })
    .where(eq(attendanceSessions.attendanceId, openSession.attendanceId));

  await writeAuditLogRecord({
    actorUid: input.technicianUid,
    actorRole: input.actorRole,
    action: "attendance.clock_out",
    entityType: "attendance",
    entityId: openSession.attendanceId,
    metadata: {
      clientUid: verifiedLocation.clientUid,
      distanceMeters: verifiedLocation.distanceMeters,
      stationId: verifiedLocation.stationId,
    },
  });

  return {
    ...openSession,
    clockOutAt: requiredTimestamp(clockOutAt),
    clockOutLocation: verifiedLocation,
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

export async function listAttendanceSessionsForAdmin(
  filters: AttendanceFilters = {},
  limit = 1000,
): Promise<AttendanceSession[]> {
  const safeLimit = Math.min(Math.max(limit, 1), 5000);
  const conditions = [
    filters.clientUid ? eq(attendanceSessions.clockInClientUid, filters.clientUid) : undefined,
    filters.stationId ? eq(attendanceSessions.clockInStationId, filters.stationId) : undefined,
    filters.technicianUid ? eq(attendanceSessions.technicianUid, filters.technicianUid) : undefined,
    filters.dateFrom ? gte(attendanceSessions.clockInAt, filters.dateFrom) : undefined,
    filters.dateTo ? lte(attendanceSessions.clockInAt, filters.dateTo) : undefined,
  ].filter((condition) => condition !== undefined);
  const rows = await db
    .select()
    .from(attendanceSessions)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(attendanceSessions.clockInAt))
    .limit(safeLimit);

  return rows.map(attendanceFromRow);
}

export async function listAttendanceSessionsForClient(clientUid: string, limit = 50): Promise<AttendanceSession[]> {
  const safeLimit = Math.min(Math.max(limit, 1), 200);
  const rows = await db
    .select()
    .from(attendanceSessions)
    .where(eq(attendanceSessions.clockInClientUid, clientUid))
    .orderBy(desc(attendanceSessions.clockInAt))
    .limit(safeLimit);

  return rows.map(attendanceFromRow);
}

function clientOrderFromRow(row: typeof clientOrders.$inferSelect): ClientOrder {
  return {
    clientName: row.clientName,
    clientUid: row.clientUid,
    coordinates:
      typeof row.proposalLat === "number" && typeof row.proposalLng === "number"
        ? { lat: row.proposalLat, lng: row.proposalLng }
        : undefined,
    decisionNote: row.decisionNote ?? undefined,
    note: row.note ?? undefined,
    orderId: row.orderId,
    photoUrl: row.photoUrl ?? undefined,
    proposalDescription: row.proposalDescription ?? undefined,
    proposalLocation: row.proposalLocation ?? undefined,
    reviewedAt: row.reviewedAt ? requiredTimestamp(row.reviewedAt) : undefined,
    reviewedBy: row.reviewedBy ?? undefined,
    stationId: row.stationId ?? undefined,
    stationLabel: row.stationLabel,
    status: row.status,
    createdAt: requiredTimestamp(row.createdAt),
  };
}

function clientProfileFromRow(row: typeof clientProfiles.$inferSelect): ClientProfile {
  return {
    clientUid: row.clientUid,
    phone: row.phone ?? undefined,
    addresses: row.addresses ?? [],
    createdAt: requiredTimestamp(row.createdAt),
    updatedAt: row.updatedAt ? requiredTimestamp(row.updatedAt) : undefined,
  };
}

export async function getClientProfile(clientUid: string): Promise<ClientProfile | null> {
  const [row] = await db.select().from(clientProfiles).where(eq(clientProfiles.clientUid, clientUid)).limit(1);

  return row ? clientProfileFromRow(row) : null;
}

function normalizeClientAddresses(addresses: string[]): string[] {
  const uniqueAddresses = new Set<string>();

  addresses.forEach((address) => {
    const trimmed = address.trim();

    if (trimmed.length > 0) {
      uniqueAddresses.add(trimmed);
    }
  });

  return Array.from(uniqueAddresses).slice(0, 8);
}

async function clientProfilesByUid(clientUids: string[]): Promise<Map<string, ClientProfile>> {
  const uniqueClientUids = Array.from(new Set(clientUids.filter(Boolean)));

  if (uniqueClientUids.length === 0) {
    return new Map();
  }

  const rows = await db.select().from(clientProfiles).where(inArray(clientProfiles.clientUid, uniqueClientUids));

  return new Map(rows.map((row) => [row.clientUid, clientProfileFromRow(row)]));
}

function clientStationAccessFromRow(row: typeof clientStationAccess.$inferSelect & {
  clientName?: string | null;
  stationLabel?: string | null;
}): ClientStationAccess {
  return {
    accessId: row.accessId,
    clientName: row.clientName ?? undefined,
    clientUid: row.clientUid,
    createdAt: requiredTimestamp(row.createdAt),
    createdBy: row.createdBy,
    stationId: row.stationId,
    stationLabel: row.stationLabel ?? undefined,
  };
}

async function clientStationIds(clientUid: string): Promise<string[]> {
  const rows = await db
    .select({ stationId: clientStationAccess.stationId })
    .from(clientStationAccess)
    .where(eq(clientStationAccess.clientUid, clientUid));

  return Array.from(new Set(rows.map((row) => row.stationId)));
}

export async function hasClientStationAccess(clientUid: string, stationId: string): Promise<boolean> {
  const row = await db.query.clientStationAccess.findFirst({
    where: and(eq(clientStationAccess.clientUid, clientUid), eq(clientStationAccess.stationId, stationId)),
  });

  return Boolean(row);
}

export async function listClientStationAccess(clientUid: string): Promise<ClientStationAccess[]> {
  const rows = await db
    .select({
      accessId: clientStationAccess.accessId,
      clientName: user.name,
      clientUid: clientStationAccess.clientUid,
      createdAt: clientStationAccess.createdAt,
      createdBy: clientStationAccess.createdBy,
      stationId: clientStationAccess.stationId,
      stationLabel: stations.label,
    })
    .from(clientStationAccess)
    .innerJoin(user, eq(clientStationAccess.clientUid, user.id))
    .innerJoin(stations, eq(clientStationAccess.stationId, stations.stationId))
    .where(eq(clientStationAccess.clientUid, clientUid))
    .orderBy(stations.label);

  return rows.map(clientStationAccessFromRow);
}

export async function listClientAttendanceSites(): Promise<ClientAttendanceSite[]> {
  const rows = await db
    .select({
      clientName: user.name,
      clientUid: clientStationAccess.clientUid,
      lat: stations.lat,
      lng: stations.lng,
      stationId: stations.stationId,
    })
    .from(clientStationAccess)
    .innerJoin(user, eq(clientStationAccess.clientUid, user.id))
    .innerJoin(stations, eq(clientStationAccess.stationId, stations.stationId))
    .where(eq(stations.isActive, true))
    .orderBy(user.name, stations.label);
  const grouped = new Map<string, ClientAttendanceSite>();

  rows.forEach((row) => {
    const entry =
      grouped.get(row.clientUid) ??
      {
        clientName: row.clientName,
        clientUid: row.clientUid,
        locatedStationCount: 0,
        stationCount: 0,
      };

    entry.stationCount += 1;

    if (typeof row.lat === "number" && typeof row.lng === "number") {
      entry.locatedStationCount += 1;
    }

    grouped.set(row.clientUid, entry);
  });

  return Array.from(grouped.values());
}

export async function replaceClientStationAccess(input: ClientStationAccessInput): Promise<void> {
  const targetClient = await getAppUser(input.clientUid);

  if (!targetClient || targetClient.role !== "client") {
    throw new AppError("العميل غير موجود.", "CLIENT_NOT_FOUND", 404);
  }

  const uniqueStationIds = Array.from(new Set(input.stationIds.map((stationId) => stationId.trim()).filter(Boolean)));

  if (uniqueStationIds.length > 0) {
    const existingStations = await db
      .select({ stationId: stations.stationId })
      .from(stations)
      .where(inArray(stations.stationId, uniqueStationIds));

    if (existingStations.length !== uniqueStationIds.length) {
      throw new AppError("بعض المحطات المحددة غير موجودة.", "CLIENT_STATIONS_INVALID", 400);
    }
  }

  await db.transaction(async (tx) => {
    await tx.delete(clientStationAccess).where(eq(clientStationAccess.clientUid, input.clientUid));

    if (uniqueStationIds.length > 0) {
      const createdAt = now();
      await tx.insert(clientStationAccess).values(
        uniqueStationIds.map((stationId) => ({
          accessId: crypto.randomUUID(),
          clientUid: input.clientUid,
          createdAt,
          createdBy: input.actorUid,
          stationId,
        })),
      );
    }

    await tx.insert(auditLogs).values({
      logId: crypto.randomUUID(),
      actorUid: input.actorUid,
      actorRole: "manager",
      action: "client_station_access.replace",
      entityType: "client",
      entityId: input.clientUid,
      createdAt: now(),
      metadata: {
        stationCount: uniqueStationIds.length,
        stationIds: uniqueStationIds,
      },
    });
  });
}

export async function listClientDirectory(): Promise<ClientDirectoryEntry[]> {
  const clientRows = await db.select().from(user).where(eq(user.role, "client")).orderBy(user.name);
  const clients = clientRows.map(appUserFromAuthUser);

  if (clients.length === 0) {
    return [];
  }

  const clientUids = clients.map((client) => client.uid);
  const [profileMap, orderRows, accessRows] = await Promise.all([
    clientProfilesByUid(clientUids),
    db.select().from(clientOrders).where(inArray(clientOrders.clientUid, clientUids)).orderBy(desc(clientOrders.createdAt)),
    db.select().from(clientStationAccess).where(inArray(clientStationAccess.clientUid, clientUids)),
  ]);
  const stationIds = Array.from(
    new Set([
      ...orderRows.map((order) => order.stationId).filter((stationId): stationId is string => stationId != null && stationId.length > 0),
      ...accessRows.map((access) => access.stationId),
    ]),
  );
  const stationLocationRows =
    stationIds.length > 0
      ? await db
          .select({
            location: stations.location,
            stationId: stations.stationId,
          })
          .from(stations)
          .where(inArray(stations.stationId, stationIds))
      : [];
  const stationLocations = new Map(stationLocationRows.map((station) => [station.stationId, station.location]));
  const latestStationByClient = new Map<string, string>();
  const stationIdsByClient = new Map<string, Set<string>>();
  const directory = new Map<string, ClientDirectoryEntry>(
    clients.map((client) => [
      client.uid,
      {
        cancelledOrders: 0,
        client,
        completedOrders: 0,
        inProgressOrders: 0,
        pendingOrders: 0,
        profile: profileMap.get(client.uid),
        stationCount: 0,
        totalOrders: 0,
      },
    ]),
  );

  accessRows.forEach((row) => {
    const stationSet = stationIdsByClient.get(row.clientUid) ?? new Set<string>();
    stationSet.add(row.stationId);
    stationIdsByClient.set(row.clientUid, stationSet);
  });

  orderRows.forEach((row) => {
    const entry = directory.get(row.clientUid);

    if (!entry) {
      return;
    }

    entry.totalOrders += 1;

    if (row.status === "pending") {
      entry.pendingOrders += 1;
    } else if (row.status === "in_progress") {
      entry.inProgressOrders += 1;
    } else if (row.status === "completed") {
      entry.completedOrders += 1;
    } else if (row.status === "cancelled") {
      entry.cancelledOrders += 1;
    }

    if (!entry.latestOrderAt) {
      entry.latestOrderAt = requiredTimestamp(row.createdAt);
      if (row.stationId != null && row.stationId.length > 0) {
        latestStationByClient.set(row.clientUid, row.stationId);
      }
    }

    const stationSet = stationIdsByClient.get(row.clientUid) ?? new Set<string>();
    if (row.stationId != null && row.stationId.length > 0) {
      stationSet.add(row.stationId);
    }
    stationIdsByClient.set(row.clientUid, stationSet);
  });

  directory.forEach((entry, clientUid) => {
    entry.stationCount = stationIdsByClient.get(clientUid)?.size ?? 0;

    const latestStationId = latestStationByClient.get(clientUid);
    entry.latestStationLocation = latestStationId ? stationLocations.get(latestStationId) : undefined;
  });

  return clients.map((client) => directory.get(client.uid)).filter((entry) => entry !== undefined);
}

export async function getClientAccountDetail(clientUid: string): Promise<ClientAccountDetail | null> {
  const [clientRow, profileRows, orderRowsInfer, clientReports, accessRows, assignedStations, dailyReports] =
    await Promise.all([
      db.query.user.findFirst({
        where: and(eq(user.id, clientUid), eq(user.role, "client")),
      }),
      db.select().from(clientProfiles).where(eq(clientProfiles.clientUid, clientUid)).limit(1),
      db.select().from(clientOrders).where(eq(clientOrders.clientUid, clientUid)).orderBy(desc(clientOrders.createdAt)),
      listReportsForClientOrderedStations(clientUid, 200),
      listClientStationAccess(clientUid),
      listOrderedStationsForClient(clientUid),
      listDailyWorkReports({ clientUid }, 200),
    ]);

  if (!clientRow) {
    return null;
  }

  const orderedStationIds = Array.from(
    new Set(orderRowsInfer.map((o) => o.stationId).filter((id): id is string => id != null && id.length > 0)),
  );

  const stationDetailRows =
    orderedStationIds.length > 0
      ? await db.select().from(stations).where(inArray(stations.stationId, orderedStationIds))
      : [];

  const stationById = new Map(stationDetailRows.map((s) => [s.stationId, s]));

  const orders: ClientOrderWithStation[] = orderRowsInfer.map((orderRow) => {
    const order = clientOrderFromRow(orderRow);
    const stationEntity = orderRow.stationId ? stationById.get(orderRow.stationId) : undefined;

    const station =
      stationEntity && stationEntity.location && stationEntity.createdAt
        ? {
            coordinates:
              typeof stationEntity.lat === "number" && typeof stationEntity.lng === "number"
                ? { lat: stationEntity.lat, lng: stationEntity.lng }
                : undefined,
            createdAt: requiredTimestamp(stationEntity.createdAt),
            description: stationEntity.description ?? undefined,
            isActive: stationEntity.isActive,
            lastVisitedAt: stationEntity.lastVisitedAt ? requiredTimestamp(stationEntity.lastVisitedAt) : undefined,
            location: stationEntity.location,
            totalReports: stationEntity.totalReports,
            zone: stationEntity.zone ?? undefined,
          }
        : undefined;

    return {
      ...order,
      station,
    };
  });

  return {
    access: accessRows,
    client: appUserFromAuthUser(clientRow),
    dailyReports,
    orders,
    profile: profileRows[0] ? clientProfileFromRow(profileRows[0]) : undefined,
    reports: clientReports,
    stations: assignedStations,
  };
}

export async function upsertClientProfile(input: UpsertClientProfileInput): Promise<ClientProfile> {
  const targetClient = await getAppUser(input.clientUid);

  if (!targetClient || targetClient.role !== "client") {
    throw new AppError("العميل غير موجود.", "CLIENT_NOT_FOUND", 404);
  }

  const timestamp = now();
  const phone = input.phone?.trim();
  const addresses = normalizeClientAddresses(input.addresses);
  const record = {
    addresses,
    clientUid: input.clientUid,
    createdAt: timestamp,
    phone: phone && phone.length > 0 ? phone : null,
    updatedAt: null,
  };

  await db
    .insert(clientProfiles)
    .values(record)
    .onConflictDoUpdate({
      target: clientProfiles.clientUid,
      set: {
        addresses,
        phone: record.phone,
        updatedAt: timestamp,
      },
    });

  await writeAuditLogRecord({
    actorUid: input.actorUid,
    actorRole: input.actorRole,
    action: "client_profile.upsert",
    entityType: "client_profile",
    entityId: input.clientUid,
    metadata: {
      addressCount: addresses.length,
      hasPhone: Boolean(record.phone),
    },
  });

  const [profileRow] = await db.select().from(clientProfiles).where(eq(clientProfiles.clientUid, input.clientUid)).limit(1);

  return profileRow ? clientProfileFromRow(profileRow) : clientProfileFromRow(record);
}

export async function createClientOrder(input: CreateClientOrderInput): Promise<ClientOrder> {
  const settings = await getAppSettings();
  const limit = settings.clientDailyStationOrderLimit;

  if (limit > 0) {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(startOfDay);
    endOfDay.setDate(endOfDay.getDate() + 1);

    const [row] = await db
      .select({ value: count() })
      .from(clientOrders)
      .where(and(eq(clientOrders.clientUid, input.clientUid), gte(clientOrders.createdAt, startOfDay), lt(clientOrders.createdAt, endOfDay)));

    const ordersToday = row?.value ?? 0;

    if (ordersToday >= limit) {
      throw new AppError(
        `تم الوصول للحد اليومي للطلبات (${limit}). حاول غدًا أو تواصل مع الإدارة.`,
        "CLIENT_DAILY_ORDER_LIMIT_REACHED",
        429,
      );
    }
  }

  const createdAt = now();
  const proposalLocationTrimmed = input.stationLocation.trim();
  const proposalDesc = input.stationDescription?.trim();
  const record = {
    clientName: input.clientName,
    clientUid: input.clientUid,
    createdAt,
    decisionNote: null as string | null,
    note: input.note ?? null,
    orderId: crypto.randomUUID(),
    photoUrl: input.photoUrl ?? null,
    proposalDescription:
      proposalDesc !== undefined && proposalDesc.length > 0 ? proposalDesc : null,
    proposalLat: input.coordinates?.lat ?? null,
    proposalLng: input.coordinates?.lng ?? null,
    proposalLocation: proposalLocationTrimmed,
    reviewedAt: null as Date | null,
    reviewedBy: null as string | null,
    stationId: null as string | null,
    stationLabel: input.stationLabel.trim(),
    status: "pending" as ClientOrderStatus,
  };

  await db.insert(clientOrders).values(record);
  await writeAuditLogRecord({
    actorUid: input.clientUid,
    actorRole: input.actorRole,
    action: "client_order.create",
    entityType: "client_order",
    entityId: record.orderId,
    metadata: { awaitingApproval: true, stationLabel: record.stationLabel },
  });

  const [inserted] = await db.select().from(clientOrders).where(eq(clientOrders.orderId, record.orderId)).limit(1);
  if (!inserted) {
    throw new AppError("تعذر استرجاع الطلب بعد الإنشاء.", "CLIENT_ORDER_CREATE_FAILED", 500);
  }

  return clientOrderFromRow(inserted);
}

export async function approveClientOrder(orderId: string, reviewerUid: string, actorRole: UserRole): Promise<void> {
  await db.transaction(async (tx) => {
    const [order] = await tx.select().from(clientOrders).where(eq(clientOrders.orderId, orderId)).limit(1);

    if (!order) {
      throw new AppError("الطلب غير موجود.", "CLIENT_ORDER_NOT_FOUND", 404);
    }
    if (order.stationId != null && order.stationId.length > 0) {
      throw new AppError("تم اعتماد هذا الطلب وإنشاء المحطة من قبل.", "CLIENT_ORDER_ALREADY_APPROVED", 409);
    }
    if (order.status !== "pending") {
      throw new AppError("لا يمكن اعتماد هذا الطلب في حالته الحالية.", "CLIENT_ORDER_APPROVE_INVALID", 409);
    }

    const stationIdGenerated = await generateNextStationId();
    const qrCodeValue = `client-station:${stationIdGenerated}:${crypto.randomUUID()}`;
    const timestamp = now();
    const locationText =
      typeof order.proposalLocation === "string" && order.proposalLocation.trim().length > 0
        ? order.proposalLocation.trim()
        : "غير محدد";

    await tx.insert(stations).values({
      createdAt: timestamp,
      createdBy: order.clientUid,
      description: order.proposalDescription ?? null,
      isActive: true,
      stationId: stationIdGenerated,
      label: order.stationLabel,
      lastVisitedAt: null,
      lastVisitedBy: null,
      lat: typeof order.proposalLat === "number" ? order.proposalLat : null,
      lng: typeof order.proposalLng === "number" ? order.proposalLng : null,
      location: locationText,
      photoUrls: order.photoUrl ? [order.photoUrl] : null,
      qrCodeValue,
      requiresImmediateSupervision: false,
      totalReports: 0,
      updatedAt: null,
      updatedBy: null,
      zone: null,
    });

    await tx
      .update(clientOrders)
      .set({
        decisionNote: null,
        reviewedAt: timestamp,
        reviewedBy: reviewerUid,
        stationId: stationIdGenerated,
        status: "in_progress",
      })
      .where(eq(clientOrders.orderId, orderId));

    await tx
      .insert(clientStationAccess)
      .values({
        accessId: crypto.randomUUID(),
        clientUid: order.clientUid,
        createdAt: timestamp,
        createdBy: order.clientUid,
        stationId: stationIdGenerated,
      })
      .onConflictDoNothing();

    await tx.insert(auditLogs).values({
      logId: crypto.randomUUID(),
      action: "client_order.approve",
      actorRole,
      actorUid: reviewerUid,
      createdAt: timestamp,
      entityId: orderId,
      entityType: "client_order",
      metadata: { stationId: stationIdGenerated },
    });
  });
}

export async function rejectClientOrder(input: {
  actorRole: UserRole;
  decisionNote?: string | undefined;
  orderId: string;
  reviewerUid: string;
}): Promise<void> {
  const note = input.decisionNote?.trim() ? input.decisionNote.trim() : null;
  const [existing] = await db.select().from(clientOrders).where(eq(clientOrders.orderId, input.orderId)).limit(1);

  if (!existing) {
    throw new AppError("الطلب غير موجود.", "CLIENT_ORDER_NOT_FOUND", 404);
  }
  if (existing.stationId != null && existing.stationId.length > 0) {
    throw new AppError(
      "لا يمكن رفض طلب تم اعتماده. استخدم تحديث الحالة لإلغاء التنفيذ إن لزم.",
      "CLIENT_ORDER_REJECT_FORBIDDEN",
      409,
    );
  }
  if (existing.status === "cancelled") {
    return;
  }
  if (existing.status !== "pending") {
    throw new AppError("لا يمكن رفض هذا الطلب في حالته الحالية.", "CLIENT_ORDER_REJECT_INVALID", 409);
  }

  const timestamp = now();

  await db
    .update(clientOrders)
    .set({
      decisionNote: note,
      reviewedAt: timestamp,
      reviewedBy: input.reviewerUid,
      status: "cancelled",
    })
    .where(eq(clientOrders.orderId, input.orderId));

  await writeAuditLogRecord({
    action: "client_order.reject",
    actorRole: input.actorRole,
    actorUid: input.reviewerUid,
    entityType: "client_order",
    entityId: input.orderId,
    metadata: { hasDecisionNote: Boolean(note) },
  });
}

export async function deleteStationIfSafe(input: {
  actorUid: string;
  actorRole: UserRole;
  stationId: string;
}): Promise<void> {
  if (input.actorRole !== "manager") {
    throw new AppError("ليست لديك صلاحية لحذف المحطة.", "STATION_DELETE_FORBIDDEN", 403);
  }

  const station = await getStationById(input.stationId);

  if (!station) {
    throw new AppError("المحطة غير موجودة.", "STATION_NOT_FOUND", 404);
  }

  await db.transaction(async (tx) => {
    // حذف سجلات الحضور المرتبطة بالمحطة
    await tx
      .delete(attendanceSessions)
      .where(
        or(
          eq(attendanceSessions.clockInStationId, input.stationId),
          eq(attendanceSessions.clockOutStationId, input.stationId),
        ),
      );

    // حذف طلبات العملاء المرتبطة بالمحطة
    await tx.delete(clientOrders).where(eq(clientOrders.stationId, input.stationId));

    // حذف سجلات المحطة من التقارير اليومية
    await tx.delete(dailyWorkReportStations).where(eq(dailyWorkReportStations.stationId, input.stationId));

    // حذف تقارير المحطة (reportPhotos و reportStatuses تُحذف تلقائيًا cascade)
    await tx.delete(reports).where(eq(reports.stationId, input.stationId));

    // حذف المحطة (clientStationAccess تُحذف تلقائيًا cascade)
    await tx.delete(stations).where(eq(stations.stationId, input.stationId));
  });

  await writeAuditLogRecord({
    actorUid: input.actorUid,
    actorRole: input.actorRole,
    action: "station.delete",
    entityType: "station",
    entityId: input.stationId,
    metadata: { label: station.label, location: station.location },
  });
}

export async function deleteClientIfSafe(input: {
  actorUid: string;
  actorRole: UserRole;
  clientUid: string;
}): Promise<void> {
  if (input.actorRole !== "manager") {
    throw new AppError("ليست لديك صلاحية لحذف العميل.", "CLIENT_DELETE_FORBIDDEN", 403);
  }

  const client = await getAppUser(input.clientUid);

  if (!client || client.role !== "client") {
    throw new AppError("العميل غير موجود.", "CLIENT_NOT_FOUND", 404);
  }

  await db.transaction(async (tx) => {
    // حذف سجلات الحضور المرتبطة بالعميل
    await tx
      .delete(attendanceSessions)
      .where(
        or(
          eq(attendanceSessions.clockInClientUid, input.clientUid),
          eq(attendanceSessions.clockOutClientUid, input.clientUid),
        ),
      );

    // حذف طلبات العميل
    await tx.delete(clientOrders).where(eq(clientOrders.clientUid, input.clientUid));

    // حذف المستخدم (clientProfiles و clientStationAccess تُحذف تلقائيًا cascade)
    await tx.delete(user).where(eq(user.id, input.clientUid));
  });

  await writeAuditLogRecord({
    actorUid: input.actorUid,
    actorRole: input.actorRole,
    action: "client.delete",
    entityType: "client",
    entityId: input.clientUid,
    metadata: { email: client.email },
  });
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
  const safeLimit = Math.min(Math.max(limit, 1), 5000);
  const rows = await db.select().from(clientOrders).orderBy(desc(clientOrders.createdAt)).limit(safeLimit);
  return rows.map(clientOrderFromRow);
}

export async function updateClientOrderStatus(
  orderId: string,
  status: ClientOrderStatus,
  reviewerUid: string,
  actorRole: UserRole,
  decisionNote?: string,
): Promise<string> {
  const [existing] = await db.select().from(clientOrders).where(eq(clientOrders.orderId, orderId)).limit(1);

  if (!existing) {
    throw new AppError("الطلب غير موجود.", "CLIENT_ORDER_NOT_FOUND", 404);
  }

  const awaitingApproval =
    (existing.stationId == null || existing.stationId.length === 0) && existing.status === "pending";

  if (awaitingApproval && status === "pending") {
    return existing.clientUid;
  }

  if (awaitingApproval) {
    if (status === "in_progress") {
      await approveClientOrder(orderId, reviewerUid, actorRole);
      return existing.clientUid;
    }

    if (status === "cancelled") {
      await rejectClientOrder({ actorRole, decisionNote, orderId, reviewerUid });
      return existing.clientUid;
    }

    throw new AppError(
      "في انتظار موافقة الإدارة يمكن اعتماد الطلب (حالة قيد التنفيذ بعد الاعتماد) أو رفضه (ملغي).",
      "CLIENT_ORDER_AWAITING_APPROVAL_TRANSITION",
      400,
    );
  }

  const timestamp = now();

  await db
    .update(clientOrders)
    .set({
      status,
      reviewedAt: timestamp,
      reviewedBy: reviewerUid,
    })
    .where(eq(clientOrders.orderId, orderId));

  await writeAuditLogRecord({
    actorRole,
    action: "client_order.status_update",
    actorUid: reviewerUid,
    entityType: "client_order",
    entityId: orderId,
    metadata: { status },
  });

  return existing.clientUid;
}

export async function listReportsForClientOrderedStations(clientUid: string, limit = 100): Promise<Report[]> {
  const stationIds = await clientStationIds(clientUid);

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

  const reportIds = rows.map((row) => row.reportId);
  const [statuses, photos] = await Promise.all([statusesByReportId(reportIds), photosByReportId(reportIds)]);
  return rows.map((row) => withReportPhotos(reportFromRow(row, statuses.get(row.reportId) ?? []), photos.get(row.reportId)));
}

export async function listOrderedStationsForClient(clientUid: string): Promise<Station[]> {
  const stationIds = await clientStationIds(clientUid);

  if (stationIds.length === 0) {
    return [];
  }

  const rows = await db.select().from(stations).where(inArray(stations.stationId, stationIds)).orderBy(desc(stations.createdAt));
  return rows.map(stationFromRow);
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
      stationLocation: station.location,
      pestTypes: input.pestTypes,
      technicianUid: input.actorUid,
      technicianName: input.technicianName,
      clientReportId: input.clientReportId,
      notes: input.notes,
      photoPaths: input.photoPaths,
      submittedAt,
      reviewStatus: "pending",
    });

    if (input.photos && input.photos.length > 0) {
      await tx.insert(reportPhotos).values(
        input.photos.map((photo, index) => ({
          category: photo.category,
          photoId: crypto.randomUUID(),
          reportId,
          sortOrder: photo.sortOrder ?? index,
          uploadedAt: submittedAt,
          uploadedBy: input.actorUid,
          url: photo.url,
        })),
      );
    }

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
        pestTypes: input.pestTypes,
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

function dailyReportPhotoFromRow(row: typeof dailyReportPhotos.$inferSelect): DailyReportPhoto {
  return {
    dailyReportId: row.dailyReportId,
    photoId: row.photoId,
    sortOrder: row.sortOrder,
    uploadedAt: requiredTimestamp(row.uploadedAt),
    uploadedBy: row.uploadedBy,
    url: row.url,
  };
}

async function dailyReportPhotosById(dailyReportIds: string[]): Promise<Map<string, DailyReportPhoto[]>> {
  const uniqueIds = Array.from(new Set(dailyReportIds.filter(Boolean)));

  if (uniqueIds.length === 0) {
    return new Map();
  }

  const rows = await db
    .select()
    .from(dailyReportPhotos)
    .where(inArray(dailyReportPhotos.dailyReportId, uniqueIds))
    .orderBy(dailyReportPhotos.sortOrder, dailyReportPhotos.uploadedAt);
  const grouped = new Map<string, DailyReportPhoto[]>();

  rows.forEach((row) => {
    const values = grouped.get(row.dailyReportId) ?? [];
    values.push(dailyReportPhotoFromRow(row));
    grouped.set(row.dailyReportId, values);
  });

  return grouped;
}

async function dailyReportStationsById(dailyReportIds: string[]): Promise<Map<string, { ids: string[]; labels: string[] }>> {
  const uniqueIds = Array.from(new Set(dailyReportIds.filter(Boolean)));

  if (uniqueIds.length === 0) {
    return new Map();
  }

  const rows = await db
    .select({
      dailyReportId: dailyWorkReportStations.dailyReportId,
      stationId: dailyWorkReportStations.stationId,
      stationLabel: stations.label,
    })
    .from(dailyWorkReportStations)
    .innerJoin(stations, eq(dailyWorkReportStations.stationId, stations.stationId))
    .where(inArray(dailyWorkReportStations.dailyReportId, uniqueIds))
    .orderBy(stations.label);
  const grouped = new Map<string, { ids: string[]; labels: string[] }>();

  rows.forEach((row) => {
    const entry = grouped.get(row.dailyReportId) ?? { ids: [], labels: [] };
    entry.ids.push(row.stationId);
    entry.labels.push(row.stationLabel);
    grouped.set(row.dailyReportId, entry);
  });

  return grouped;
}

function dailyWorkReportFromRow(
  row: typeof dailyWorkReports.$inferSelect,
  stationsForReport?: { ids: string[]; labels: string[] },
  photos?: DailyReportPhoto[],
): DailyWorkReport {
  return {
    createdAt: requiredTimestamp(row.createdAt),
    dailyReportId: row.dailyReportId,
    notes: row.notes ?? undefined,
    photos: photos && photos.length > 0 ? photos : undefined,
    reportDate: requiredTimestamp(row.reportDate),
    stationIds: stationsForReport?.ids ?? [],
    stationLabels: stationsForReport?.labels ?? [],
    summary: row.summary,
    technicianName: row.technicianName,
    technicianUid: row.technicianUid,
    updatedAt: row.updatedAt ? requiredTimestamp(row.updatedAt) : undefined,
  };
}

async function hydrateDailyWorkReports(rows: (typeof dailyWorkReports.$inferSelect)[]): Promise<DailyWorkReport[]> {
  const reportIds = rows.map((row) => row.dailyReportId);
  const [stationsByReport, photosByReport] = await Promise.all([
    dailyReportStationsById(reportIds),
    dailyReportPhotosById(reportIds),
  ]);

  return rows.map((row) =>
    dailyWorkReportFromRow(row, stationsByReport.get(row.dailyReportId), photosByReport.get(row.dailyReportId)),
  );
}

export async function createDailyWorkReport(input: CreateDailyWorkReportInput): Promise<DailyWorkReport> {
  const stationIds = Array.from(new Set(input.stationIds.map((stationId) => stationId.trim()).filter(Boolean)));

  if (stationIds.length > 0) {
    const existingStations = await db
      .select({ stationId: stations.stationId })
      .from(stations)
      .where(inArray(stations.stationId, stationIds));

    if (existingStations.length !== stationIds.length) {
      throw new AppError("بعض المحطات المحددة في التقرير اليومي غير موجودة.", "DAILY_REPORT_STATIONS_INVALID", 400);
    }
  }

  const createdAt = now();
  const dailyReportId = crypto.randomUUID();

  await db.transaction(async (tx) => {
    await tx.insert(dailyWorkReports).values({
      createdAt,
      dailyReportId,
      notes: input.notes ?? null,
      reportDate: input.reportDate,
      summary: input.summary,
      technicianName: input.technicianName,
      technicianUid: input.technicianUid,
      updatedAt: null,
    });

    if (stationIds.length > 0) {
      await tx.insert(dailyWorkReportStations).values(
        stationIds.map((stationId) => ({
          dailyReportId,
          stationId,
        })),
      );
    }

    if (input.photos && input.photos.length > 0) {
      await tx.insert(dailyReportPhotos).values(
        input.photos.map((url, index) => ({
          dailyReportId,
          photoId: crypto.randomUUID(),
          sortOrder: index,
          uploadedAt: createdAt,
          uploadedBy: input.technicianUid,
          url,
        })),
      );
    }

    await tx.insert(auditLogs).values({
      logId: crypto.randomUUID(),
      actorUid: input.technicianUid,
      actorRole: input.actorRole,
      action: "daily_report.create",
      entityType: "daily_work_report",
      entityId: dailyReportId,
      createdAt,
      metadata: {
        photoCount: input.photos?.length ?? 0,
        stationCount: stationIds.length,
        stationIds,
      },
    });
  });

  const row = await db.query.dailyWorkReports.findFirst({
    where: eq(dailyWorkReports.dailyReportId, dailyReportId),
  });

  return (await hydrateDailyWorkReports(row ? [row] : [])).at(0) ?? {
    createdAt: requiredTimestamp(createdAt),
    dailyReportId,
    notes: input.notes,
    reportDate: requiredTimestamp(input.reportDate),
    stationIds,
    stationLabels: [],
    summary: input.summary,
    technicianName: input.technicianName,
    technicianUid: input.technicianUid,
  };
}

export async function listDailyWorkReports(
  filters: DailyWorkReportFilters = {},
  limit = 100,
): Promise<DailyWorkReport[]> {
  let scopedDailyReportIds: string[] | undefined;

  if (filters.clientUid || filters.stationId) {
    const allowedStationIds = filters.clientUid ? await clientStationIds(filters.clientUid) : [];
    if (filters.clientUid && filters.stationId && !allowedStationIds.includes(filters.stationId)) {
      return [];
    }
    const stationScope = filters.stationId
      ? [filters.stationId]
      : allowedStationIds;

    if (filters.clientUid && stationScope.length === 0) {
      return [];
    }

    const rows = await db
      .select({ dailyReportId: dailyWorkReportStations.dailyReportId })
      .from(dailyWorkReportStations)
      .where(inArray(dailyWorkReportStations.stationId, stationScope));
    scopedDailyReportIds = Array.from(new Set(rows.map((row) => row.dailyReportId)));

    if (scopedDailyReportIds.length === 0) {
      return [];
    }
  }

  const conditions = [
    filters.technicianUid ? eq(dailyWorkReports.technicianUid, filters.technicianUid) : undefined,
    filters.dateFrom ? gte(dailyWorkReports.reportDate, filters.dateFrom) : undefined,
    filters.dateTo ? lte(dailyWorkReports.reportDate, filters.dateTo) : undefined,
    scopedDailyReportIds ? inArray(dailyWorkReports.dailyReportId, scopedDailyReportIds) : undefined,
  ].filter((condition) => condition !== undefined);
  const safeLimit = Math.min(Math.max(limit, 1), 500);
  const rows = await db
    .select()
    .from(dailyWorkReports)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(dailyWorkReports.reportDate), desc(dailyWorkReports.createdAt))
    .limit(safeLimit);

  return hydrateDailyWorkReports(rows);
}

export async function updateReportReviewRecord(
  reportId: string,
  input: {
    reviewNotes?: string;
    reviewStatus: SharedReviewStatus;
    reviewedBy: string;
  },
): Promise<Report | null> {
  const existing = await getReportById(reportId);

  if (!existing) {
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

  return getReportById(reportId);
}

export interface UpdateReportSubmissionInput {
  actorRole: UserRole;
  actorUid: string;
  /** When omitted, existing notes are kept. */
  notes?: string;
  pestTypes: PestTypeOption[];
  status: StatusOption[];
}

export async function updateReportSubmissionByReviewer(
  reportId: string,
  input: UpdateReportSubmissionInput,
): Promise<Report | null> {
  const existing = await getReportById(reportId);

  if (!existing) {
    return null;
  }

  const editedAt = now();

  await db.transaction(async (tx) => {
    await tx
      .update(reports)
      .set({
        ...(input.notes !== undefined ? { notes: input.notes } : {}),
        pestTypes: input.pestTypes,
        editedAt,
        editedBy: input.actorUid,
      })
      .where(eq(reports.reportId, reportId));

    await tx.delete(reportStatuses).where(eq(reportStatuses.reportId, reportId));
    await tx.insert(reportStatuses).values(input.status.map((status) => ({ reportId, status })));

    await tx.insert(auditLogs).values({
      logId: crypto.randomUUID(),
      actorUid: input.actorUid,
      actorRole: input.actorRole,
      action: "report.submission_edit",
      entityType: "report",
      entityId: reportId,
      createdAt: editedAt,
      metadata: {
        stationId: existing.stationId,
        status: input.status,
        pestTypes: input.pestTypes,
      },
    });
  });

  return getReportById(reportId);
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

export async function countRows(
  table: "attendanceSessions" | "auditLogs" | "clientOrders" | "reports" | "stations" | "users",
  condition?: SQL,
): Promise<number> {
  if (table === "attendanceSessions") {
    const [row] = await db.select({ value: count() }).from(attendanceSessions).where(condition);

    return row?.value ?? 0;
  }

  if (table === "auditLogs") {
    const [row] = await db.select({ value: count() }).from(auditLogs).where(condition);

    return row?.value ?? 0;
  }

  if (table === "clientOrders") {
    const [row] = await db.select({ value: count() }).from(clientOrders).where(condition);

    return row?.value ?? 0;
  }

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

// ─── Technician Work Schedules ─────────────────────────────────────────────

export interface UpsertWorkScheduleInput {
  actorRole: UserRole;
  actorUid: string;
  expectedDurationMinutes: number;
  hourlyRate?: number;
  isActive?: boolean;
  notes?: string;
  shiftEndTime: string;
  shiftStartTime: string;
  technicianUid: string;
  workDays: number[];
}

function workScheduleFromRow(row: typeof technicianWorkSchedules.$inferSelect): TechnicianWorkSchedule {
  return {
    scheduleId: row.scheduleId,
    technicianUid: row.technicianUid,
    workDays: row.workDays.split(",").map(Number).filter((n) => Number.isFinite(n)),
    shiftStartTime: row.shiftStartTime,
    shiftEndTime: row.shiftEndTime,
    expectedDurationMinutes: row.expectedDurationMinutes,
    hourlyRate: typeof row.hourlyRate === "number" ? row.hourlyRate : undefined,
    isActive: row.isActive,
    notes: row.notes ?? undefined,
    createdAt: requiredTimestamp(row.createdAt),
    updatedAt: row.updatedAt ? requiredTimestamp(row.updatedAt) : undefined,
    createdBy: row.createdBy,
  };
}

export async function upsertWorkSchedule(input: UpsertWorkScheduleInput): Promise<TechnicianWorkSchedule> {
  if (!["manager"].includes(input.actorRole)) {
    throw new AppError("ليست لديك صلاحية لإدارة جداول العمل.", "SCHEDULE_FORBIDDEN", 403);
  }

  const tech = await getAppUser(input.technicianUid);
  if (!tech || tech.role !== "technician") {
    throw new AppError("الفني غير موجود.", "TECHNICIAN_NOT_FOUND", 404);
  }

  const validDays = normalizeWorkDays(input.workDays);
  if (validDays.length === 0) {
    throw new AppError("يجب تحديد يوم عمل واحد على الأقل.", "SCHEDULE_DAYS_INVALID", 400);
  }

  if (!isValidShiftTime(input.shiftStartTime) || !isValidShiftTime(input.shiftEndTime)) {
    throw new AppError("توقيتات العمل غير صالحة. استخدم الصيغة HH:MM.", "SCHEDULE_TIME_INVALID", 400);
  }

  if (input.expectedDurationMinutes < 15 || input.expectedDurationMinutes > 720) {
    throw new AppError("مدة الشيفت المتوقعة يجب أن تكون بين 15 دقيقة و12 ساعة.", "SCHEDULE_DURATION_INVALID", 400);
  }

  if (input.hourlyRate !== undefined && input.hourlyRate < 0) {
    throw new AppError("سعر الساعة لا يمكن أن يكون أقل من صفر.", "SCHEDULE_RATE_INVALID", 400);
  }

  const scheduleId = crypto.randomUUID();
  const timestamp = now();

  await db.transaction(async (tx) => {
    await tx
      .update(technicianWorkSchedules)
      .set({ isActive: false, updatedAt: timestamp, updatedBy: input.actorUid })
      .where(and(eq(technicianWorkSchedules.technicianUid, input.technicianUid), eq(technicianWorkSchedules.isActive, true)));

    await tx.insert(technicianWorkSchedules).values({
      scheduleId,
      technicianUid: input.technicianUid,
      workDays: validDays.join(","),
      shiftStartTime: input.shiftStartTime,
      shiftEndTime: input.shiftEndTime,
      expectedDurationMinutes: input.expectedDurationMinutes,
      hourlyRate: input.hourlyRate ?? null,
      isActive: true,
      notes: input.notes ?? null,
      createdAt: timestamp,
      updatedAt: null,
      createdBy: input.actorUid,
      updatedBy: null,
    });

    await tx.insert(auditLogs).values({
      logId: crypto.randomUUID(),
      actorUid: input.actorUid,
      actorRole: input.actorRole,
      action: "work_schedule.upsert",
      entityType: "technician_work_schedule",
      entityId: scheduleId,
      createdAt: timestamp,
      metadata: {
        technicianUid: input.technicianUid,
        workDays: validDays,
        shiftStartTime: input.shiftStartTime,
        shiftEndTime: input.shiftEndTime,
      },
    });
  });

  const [row] = await db.select().from(technicianWorkSchedules).where(eq(technicianWorkSchedules.scheduleId, scheduleId)).limit(1);
  if (!row) throw new AppError("تعذر حفظ الجدول.", "SCHEDULE_SAVE_FAILED", 500);
  return workScheduleFromRow(row);
}

export async function getActiveWorkSchedule(technicianUid: string): Promise<TechnicianWorkSchedule | null> {
  const row = await db.query.technicianWorkSchedules.findFirst({
    where: and(
      eq(technicianWorkSchedules.technicianUid, technicianUid),
      eq(technicianWorkSchedules.isActive, true),
    ),
    orderBy: [desc(technicianWorkSchedules.createdAt)],
  });
  return row ? workScheduleFromRow(row) : null;
}

export async function listWorkSchedulesForTechnician(technicianUid: string): Promise<TechnicianWorkSchedule[]> {
  const rows = await db
    .select()
    .from(technicianWorkSchedules)
    .where(eq(technicianWorkSchedules.technicianUid, technicianUid))
    .orderBy(desc(technicianWorkSchedules.createdAt))
    .limit(20);
  return rows.map(workScheduleFromRow);
}

// ─── Technician Shifts ─────────────────────────────────────────────────────

function shiftFromRow(row: typeof technicianShifts.$inferSelect): TechnicianShift {
  return {
    shiftId: row.shiftId,
    technicianUid: row.technicianUid,
    technicianName: row.technicianName,
    scheduleId: row.scheduleId ?? undefined,
    startedAt: requiredTimestamp(row.startedAt),
    startLat: typeof row.startLat === "number" ? row.startLat : undefined,
    startLng: typeof row.startLng === "number" ? row.startLng : undefined,
    startStationId: row.startStationId ?? undefined,
    startStationLabel: row.startStationLabel ?? undefined,
    endedAt: row.endedAt ? requiredTimestamp(row.endedAt) : undefined,
    endLat: typeof row.endLat === "number" ? row.endLat : undefined,
    endLng: typeof row.endLng === "number" ? row.endLng : undefined,
    endStationId: row.endStationId ?? undefined,
    endStationLabel: row.endStationLabel ?? undefined,
    status: row.status as ShiftStatus,
    totalMinutes: typeof row.totalMinutes === "number" ? row.totalMinutes : undefined,
    expectedDurationMinutes: typeof row.expectedDurationMinutes === "number" ? row.expectedDurationMinutes : undefined,
    earlyExit: row.earlyExit,
    baseSalary: typeof row.baseSalary === "number" ? row.baseSalary : undefined,
    salaryAmount: typeof row.salaryAmount === "number" ? row.salaryAmount : undefined,
    salaryStatus: row.salaryStatus as ShiftSalaryStatus,
    notes: row.notes ?? undefined,
    createdAt: requiredTimestamp(row.createdAt),
    updatedAt: row.updatedAt ? requiredTimestamp(row.updatedAt) : undefined,
  };
}

export interface StartShiftInput {
  actorRole: UserRole;
  location: Coordinates & { accuracyMeters?: number };
  stationId: string;
  technicianName: string;
  technicianUid: string;
}

export interface StartShiftResult {
  shift: TechnicianShift;
  earlyWarning?: string; // if outside schedule window
}

export async function getOpenShift(technicianUid: string): Promise<TechnicianShift | null> {
  const row = await db.query.technicianShifts.findFirst({
    where: and(
      eq(technicianShifts.technicianUid, technicianUid),
      eq(technicianShifts.status, "active"),
    ),
    orderBy: [desc(technicianShifts.startedAt)],
  });
  return row ? shiftFromRow(row) : null;
}

export async function requireOpenTechnicianShift(technicianUid: string): Promise<TechnicianShift> {
  const openShift = await getOpenShift(technicianUid);

  if (!openShift) {
    throw new AppError("يجب بدء شيفت نشط قبل الوصول إلى عمل المحطات.", "SHIFT_REQUIRED", 403);
  }

  return openShift;
}

export async function getShiftById(shiftId: string): Promise<TechnicianShift | null> {
  const [row] = await db.select().from(technicianShifts).where(eq(technicianShifts.shiftId, shiftId)).limit(1);
  return row ? shiftFromRow(row) : null;
}

export async function startShift(input: StartShiftInput): Promise<StartShiftResult> {
  if (input.actorRole !== "technician" && input.actorRole !== "manager") {
    throw new AppError("ليست لديك صلاحية لبدء شيفت.", "SHIFT_FORBIDDEN", 403);
  }

  // Check no open shift already
  const existing = await getOpenShift(input.technicianUid);
  if (existing) {
    throw new AppError("يوجد شيفت مفتوح بالفعل. سجّل الانصراف أولاً.", "SHIFT_ALREADY_OPEN", 409);
  }

  // Geo verify — must be within 100m of ANY active station
  if (!isValidCoordinates(input.location)) {
    throw new AppError("إحداثيات الموقع غير صالحة.", "SHIFT_LOCATION_INVALID", 400);
  }

  if (typeof input.location.accuracyMeters === "number" && input.location.accuracyMeters > maxLocationAccuracyMeters) {
    throw new AppError("دقة الموقع ضعيفة. فعّل GPS وحاول مجدداً.", "SHIFT_LOCATION_ACCURACY_LOW", 400);
  }

  // Find nearest station within 100m
  const nearbyList = await listNearbyStations(input.location, 1, stationAccessRadiusMeters);
  if (nearbyList.length === 0) {
    throw new AppError(
      "لست قريباً من أي محطة (الحد الأدنى 100 متر). اقترب من محطة أولاً.",
      "SHIFT_NOT_NEAR_STATION",
      403,
    );
  }

  const nearestStation = nearbyList[0].station;
  const startedAt = now();

  // Check schedule constraints.
  let scheduleRecord: TechnicianWorkSchedule | null = null;

  if (input.actorRole === "technician") {
    scheduleRecord = await getActiveWorkSchedule(input.technicianUid);

    if (!scheduleRecord) {
      await writeAuditLogRecord({
        actorUid: input.technicianUid,
        actorRole: input.actorRole,
        action: "shift.start_rejected",
        entityType: "technician_shift",
        entityId: input.technicianUid,
        metadata: { reason: "no_active_schedule", stationId: nearestStation.stationId },
      });
      throw new AppError("لا يوجد جدول عمل نشط لحسابك. تواصل مع المدير قبل بدء الشيفت.", "SHIFT_SCHEDULE_REQUIRED", 403);
    }

    const check = isWithinScheduleWindow(scheduleRecord, startedAt);
    if (!check.allowed) {
      await writeAuditLogRecord({
        actorUid: input.technicianUid,
        actorRole: input.actorRole,
        action: "shift.start_rejected",
        entityType: "technician_shift",
        entityId: input.technicianUid,
        metadata: { reason: check.warning, scheduleId: scheduleRecord.scheduleId, stationId: nearestStation.stationId },
      });
      throw new AppError(check.warning ?? "خارج نطاق الشيفت.", "SHIFT_OUTSIDE_WINDOW", 403);
    }
  }

  const shiftId = crypto.randomUUID();

  await db.insert(technicianShifts).values({
    shiftId,
    technicianUid: input.technicianUid,
    technicianName: input.technicianName,
    scheduleId: scheduleRecord?.scheduleId ?? null,
    startedAt,
    startLat: input.location.lat,
    startLng: input.location.lng,
    startStationId: nearestStation.stationId,
    startStationLabel: nearestStation.label,
    endedAt: null,
    endLat: null,
    endLng: null,
    endStationId: null,
    endStationLabel: null,
    status: "active",
    totalMinutes: null,
    expectedDurationMinutes: scheduleRecord?.expectedDurationMinutes ?? null,
    earlyExit: false,
    baseSalary: scheduleRecord?.hourlyRate ?? null,
    salaryAmount: null,
    salaryStatus: "pending",
    notes: null,
    createdAt: startedAt,
    updatedAt: null,
  });

  await writeAuditLogRecord({
    actorUid: input.technicianUid,
    actorRole: input.actorRole,
    action: "shift.start",
    entityType: "technician_shift",
    entityId: shiftId,
    metadata: {
      stationId: nearestStation.stationId,
      scheduleId: scheduleRecord?.scheduleId,
      lat: input.location.lat,
      lng: input.location.lng,
    },
  });

  const [row] = await db.select().from(technicianShifts).where(eq(technicianShifts.shiftId, shiftId)).limit(1);
  if (!row) throw new AppError("تعذر بدء الشيفت.", "SHIFT_CREATE_FAILED", 500);

  return { shift: shiftFromRow(row) };
}

export interface EndShiftInput {
  actorRole: UserRole;
  location: Coordinates & { accuracyMeters?: number };
  notes?: string;
  stationId: string;
  technicianUid: string;
}

export interface EndShiftResult {
  shift: TechnicianShift;
  earlyExit: boolean;
  minutesWorked: number;
  earlyExitMinutes: number;
}

export async function endShift(input: EndShiftInput): Promise<EndShiftResult> {
  if (input.actorRole !== "technician" && input.actorRole !== "manager") {
    throw new AppError("ليست لديك صلاحية لإنهاء شيفت.", "SHIFT_FORBIDDEN", 403);
  }

  const openShift = await getOpenShift(input.technicianUid);
  if (!openShift) {
    throw new AppError("لا يوجد شيفت مفتوح.", "SHIFT_NOT_FOUND", 404);
  }

  const openAttendance = await getOpenAttendanceSession(input.technicianUid);
  if (openAttendance) {
    throw new AppError("سجّل الانصراف من المحطة المفتوحة قبل إنهاء الشيفت.", "SHIFT_ATTENDANCE_OPEN", 409);
  }

  if (!isValidCoordinates(input.location)) {
    throw new AppError("إحداثيات الموقع غير صالحة.", "SHIFT_LOCATION_INVALID", 400);
  }

  if (typeof input.location.accuracyMeters === "number" && input.location.accuracyMeters > maxLocationAccuracyMeters) {
    throw new AppError("دقة الموقع ضعيفة. فعّل GPS وحاول مجدداً.", "SHIFT_LOCATION_ACCURACY_LOW", 400);
  }

  // Find nearest station within 100m
  const nearbyList = await listNearbyStations(input.location, 1, stationAccessRadiusMeters);
  if (nearbyList.length === 0) {
    throw new AppError("لست قريباً من أي محطة. يجب الانصراف من قرب محطة.", "SHIFT_NOT_NEAR_STATION", 403);
  }

  const nearestStation = nearbyList[0].station;
  const endedAt = now();
  const minutesWorked = Math.round((endedAt.getTime() - openShift.startedAt.toDate().getTime()) / 60_000);
  const expectedMinutes = openShift.expectedDurationMinutes ?? 0;
  const isEarlyExit = expectedMinutes > 0 && minutesWorked < expectedMinutes;
  const earlyExitMinutes = isEarlyExit ? expectedMinutes - minutesWorked : 0;

  await db
    .update(technicianShifts)
    .set({
      endedAt,
      endLat: input.location.lat,
      endLng: input.location.lng,
      endStationId: nearestStation.stationId,
      endStationLabel: nearestStation.label,
      status: "completed",
      totalMinutes: minutesWorked,
      earlyExit: isEarlyExit,
      salaryAmount: null,
      salaryStatus: "pending",
      notes: input.notes ?? openShift.notes ?? null,
      updatedAt: now(),
    })
    .where(eq(technicianShifts.shiftId, openShift.shiftId));

  await writeAuditLogRecord({
    actorUid: input.technicianUid,
    actorRole: input.actorRole,
    action: "shift.end",
    entityType: "technician_shift",
    entityId: openShift.shiftId,
    metadata: {
      minutesWorked,
      earlyExit: isEarlyExit,
      earlyExitMinutes,
      stationId: nearestStation.stationId,
      salaryStatus: "pending",
    },
  });

  const [row] = await db.select().from(technicianShifts).where(eq(technicianShifts.shiftId, openShift.shiftId)).limit(1);
  if (!row) throw new AppError("تعذر إنهاء الشيفت.", "SHIFT_END_FAILED", 500);

  return {
    shift: shiftFromRow(row),
    earlyExit: isEarlyExit,
    minutesWorked,
    earlyExitMinutes,
  };
}

export interface ShiftFilters {
  dateFrom?: Date | null;
  dateTo?: Date | null;
  salaryStatus?: ShiftSalaryStatus | "";
  status?: ShiftStatus | "";
  technicianUid?: string;
}

export async function listShiftsForAdmin(filters: ShiftFilters = {}, limit = 200): Promise<TechnicianShift[]> {
  const safeLimit = Math.min(Math.max(limit, 1), 2000);
  const conditions = [
    filters.technicianUid ? eq(technicianShifts.technicianUid, filters.technicianUid) : undefined,
    filters.status ? eq(technicianShifts.status, filters.status) : undefined,
    filters.salaryStatus ? eq(technicianShifts.salaryStatus, filters.salaryStatus) : undefined,
    filters.dateFrom ? gte(technicianShifts.startedAt, filters.dateFrom) : undefined,
    filters.dateTo ? lte(technicianShifts.startedAt, filters.dateTo) : undefined,
  ].filter((c) => c !== undefined);

  const rows = await db
    .select()
    .from(technicianShifts)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(technicianShifts.startedAt))
    .limit(safeLimit);

  return rows.map(shiftFromRow);
}

export async function listShiftsForTechnician(technicianUid: string, limit = 50): Promise<TechnicianShift[]> {
  const safeLimit = Math.min(Math.max(limit, 1), 200);
  const rows = await db
    .select()
    .from(technicianShifts)
    .where(eq(technicianShifts.technicianUid, technicianUid))
    .orderBy(desc(technicianShifts.startedAt))
    .limit(safeLimit);
  return rows.map(shiftFromRow);
}

export type PayrollFilters = Pick<ShiftFilters, "dateFrom" | "dateTo" | "salaryStatus" | "technicianUid">;

export async function listPayrollShifts(filters: PayrollFilters = {}, limit = 200): Promise<TechnicianShift[]> {
  return listShiftsForAdmin({ ...filters, status: "completed" }, limit);
}

export async function listStationCompletionsDuringShift(input: TechnicianShift): Promise<ShiftStationCompletion[]> {
  if (input.status !== "completed" || !input.endedAt) {
    return [];
  }

  const windowStart = input.startedAt.toDate();
  const windowEnd = input.endedAt.toDate();

  const rows = await db
    .select({
      reportCount: count(),
      stationId: reports.stationId,
      stationLabel: reports.stationLabel,
    })
    .from(reports)
    .where(
      and(
        eq(reports.technicianUid, input.technicianUid),
        gte(reports.submittedAt, windowStart),
        lte(reports.submittedAt, windowEnd),
      ),
    )
    .groupBy(reports.stationId, reports.stationLabel);

  rows.sort((a, b) => b.reportCount - a.reportCount);

  return rows.map((row) => ({
    reportCount: row.reportCount,
    stationId: row.stationId,
    stationLabel: row.stationLabel,
  }));
}

export interface UpdateShiftPayrollInput {
  actorRole: UserRole;
  actorUid: string;
  notes?: string;
  salaryAmount?: number;
  salaryStatus: ShiftSalaryStatus;
  shiftId: string;
}

export async function updateShiftPayroll(input: UpdateShiftPayrollInput): Promise<TechnicianShift> {
  if (input.actorRole !== "manager") {
    throw new AppError("ليست لديك صلاحية لتعديل الرواتب.", "PAYROLL_FORBIDDEN", 403);
  }

  if (!isShiftSalaryStatus(input.salaryStatus)) {
    throw new AppError("حالة الراتب غير صالحة.", "PAYROLL_STATUS_INVALID", 400);
  }

  if (input.salaryAmount !== undefined && (!Number.isFinite(input.salaryAmount) || input.salaryAmount < 0)) {
    throw new AppError("قيمة الراتب غير صالحة.", "PAYROLL_AMOUNT_INVALID", 400);
  }

  const [existing] = await db.select().from(technicianShifts).where(eq(technicianShifts.shiftId, input.shiftId)).limit(1);
  if (!existing) throw new AppError("الشيفت غير موجود.", "SHIFT_NOT_FOUND", 404);

  if (existing.status !== "completed") {
    throw new AppError("لا يمكن تعديل راتب شيفت لم ينته بعد.", "PAYROLL_SHIFT_ACTIVE", 409);
  }

  if (input.salaryStatus === "paid" && input.salaryAmount === undefined) {
    throw new AppError("أدخل قيمة الراتب قبل اعتماد الدفع.", "PAYROLL_AMOUNT_REQUIRED", 400);
  }

  const salaryAmount = input.salaryAmount ?? null;
  const notes = input.notes?.trim() ? input.notes.trim() : null;

  await db
    .update(technicianShifts)
    .set({ notes, salaryAmount, salaryStatus: input.salaryStatus, updatedAt: now() })
    .where(eq(technicianShifts.shiftId, input.shiftId));

  await writeAuditLogRecord({
    actorUid: input.actorUid,
    actorRole: input.actorRole,
    action: "shift.payroll_update",
    entityType: "technician_shift",
    entityId: input.shiftId,
    metadata: {
      notes,
      previousSalaryAmount: existing.salaryAmount,
      previousSalaryStatus: existing.salaryStatus,
      salaryAmount,
      salaryStatus: input.salaryStatus,
    },
  });

  const [row] = await db.select().from(technicianShifts).where(eq(technicianShifts.shiftId, input.shiftId)).limit(1);
  if (!row) throw new AppError("تعذر تحديث الراتب.", "PAYROLL_UPDATE_FAILED", 500);
  return shiftFromRow(row);
}

export async function updateShiftSalaryStatus(
  shiftId: string,
  salaryStatus: ShiftSalaryStatus,
  actorUid: string,
  actorRole: UserRole,
): Promise<TechnicianShift> {
  if (actorRole !== "manager") {
    throw new AppError("ليست لديك صلاحية لتعديل حالة الراتب.", "SALARY_FORBIDDEN", 403);
  }

  const [existing] = await db.select().from(technicianShifts).where(eq(technicianShifts.shiftId, shiftId)).limit(1);
  if (!existing) throw new AppError("الشيفت غير موجود.", "SHIFT_NOT_FOUND", 404);

  return updateShiftPayroll({
    actorUid,
    actorRole,
    notes: existing.notes ?? undefined,
    salaryAmount: typeof existing.salaryAmount === "number" ? existing.salaryAmount : undefined,
    salaryStatus,
    shiftId,
  });
}
