import { relations } from "drizzle-orm";
import { index, integer, real, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";
import type { Coordinates, ReportPhotoPaths, StatusOption, UserRole } from "@/types";
import type { SharedReviewStatus } from "@/lib/shared/constants";

const timestamp = (name: string) => integer(name, { mode: "timestamp_ms" });
const booleanFlag = (name: string) => integer(name, { mode: "boolean" });

export const user = sqliteTable(
  "user",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    email: text("email").notNull(),
    emailVerified: booleanFlag("email_verified").notNull().default(true),
    image: text("image"),
    createdAt: timestamp("created_at").notNull(),
    updatedAt: timestamp("updated_at").notNull(),
    role: text("role").$type<UserRole>().notNull().default("technician"),
    banned: booleanFlag("banned").notNull().default(false),
    banReason: text("ban_reason"),
    banExpires: timestamp("ban_expires"),
  },
  (table) => [uniqueIndex("user_email_unique").on(table.email), index("user_role_idx").on(table.role)],
);

export const session = sqliteTable(
  "session",
  {
    id: text("id").primaryKey(),
    token: text("token").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at").notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    impersonatedBy: text("impersonated_by"),
    createdAt: timestamp("created_at").notNull(),
    updatedAt: timestamp("updated_at").notNull(),
  },
  (table) => [
    uniqueIndex("session_token_unique").on(table.token),
    index("session_user_id_idx").on(table.userId),
  ],
);

export const account = sqliteTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at"),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
    scope: text("scope"),
    password: text("password"),
    createdAt: timestamp("created_at").notNull(),
    updatedAt: timestamp("updated_at").notNull(),
  },
  (table) => [
    index("account_user_id_idx").on(table.userId),
    index("account_provider_account_idx").on(table.providerId, table.accountId),
  ],
);

export const verification = sqliteTable(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").notNull(),
    updatedAt: timestamp("updated_at").notNull(),
  },
  (table) => [index("verification_identifier_idx").on(table.identifier)],
);

export const rateLimit = sqliteTable("rateLimit", {
  key: text("key").primaryKey(),
  count: integer("count").notNull(),
  lastRequest: integer("last_request").notNull(),
});

export const loginRateLimit = sqliteTable("login_rate_limit", {
  key: text("key").primaryKey(),
  attempts: integer("attempts").notNull().default(0),
  windowStartAt: integer("window_start_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
  lockedUntil: integer("locked_until"),
});

export const stations = sqliteTable(
  "stations",
  {
    stationId: text("station_id").primaryKey(),
    label: text("label").notNull(),
    location: text("location").notNull(),
    zone: text("zone"),
    lat: real("lat"),
    lng: real("lng"),
    qrCodeValue: text("qr_code_value").notNull(),
    isActive: booleanFlag("is_active").notNull().default(true),
    totalReports: integer("total_reports").notNull().default(0),
    createdAt: timestamp("created_at").notNull(),
    createdBy: text("created_by").notNull(),
    updatedAt: timestamp("updated_at"),
    updatedBy: text("updated_by"),
    lastVisitedAt: timestamp("last_visited_at"),
  },
  (table) => [
    index("stations_created_at_idx").on(table.createdAt),
    index("stations_active_idx").on(table.isActive),
    index("stations_zone_idx").on(table.zone),
  ],
);

export const reports = sqliteTable(
  "reports",
  {
    reportId: text("report_id").primaryKey(),
    stationId: text("station_id")
      .notNull()
      .references(() => stations.stationId, { onDelete: "restrict" }),
    stationLabel: text("station_label").notNull(),
    technicianUid: text("technician_uid").notNull(),
    technicianName: text("technician_name").notNull(),
    clientReportId: text("client_report_id"),
    notes: text("notes"),
    photoPaths: text("photo_paths", { mode: "json" }).$type<ReportPhotoPaths>(),
    submittedAt: timestamp("submitted_at").notNull(),
    reviewStatus: text("review_status").$type<SharedReviewStatus>().notNull().default("pending"),
    editedAt: timestamp("edited_at"),
    editedBy: text("edited_by"),
    reviewedAt: timestamp("reviewed_at"),
    reviewedBy: text("reviewed_by"),
    reviewNotes: text("review_notes"),
  },
  (table) => [
    index("reports_station_id_idx").on(table.stationId),
    index("reports_technician_uid_idx").on(table.technicianUid),
    index("reports_review_status_idx").on(table.reviewStatus),
    index("reports_submitted_at_idx").on(table.submittedAt),
    uniqueIndex("reports_client_report_id_unique").on(table.technicianUid, table.clientReportId),
  ],
);

export const reportStatuses = sqliteTable(
  "report_statuses",
  {
    reportId: text("report_id")
      .notNull()
      .references(() => reports.reportId, { onDelete: "cascade" }),
    status: text("status").$type<StatusOption>().notNull(),
  },
  (table) => [
    index("report_statuses_report_id_idx").on(table.reportId),
    index("report_statuses_status_idx").on(table.status),
  ],
);

export const auditLogs = sqliteTable(
  "audit_logs",
  {
    logId: text("log_id").primaryKey(),
    actorUid: text("actor_uid").notNull(),
    actorRole: text("actor_role").$type<UserRole>().notNull(),
    action: text("action").notNull(),
    entityType: text("entity_type").notNull(),
    entityId: text("entity_id").notNull(),
    createdAt: timestamp("created_at").notNull(),
    metadata: text("metadata", { mode: "json" }).$type<Record<string, unknown>>(),
  },
  (table) => [
    index("audit_logs_created_at_idx").on(table.createdAt),
    index("audit_logs_action_idx").on(table.action),
    index("audit_logs_actor_uid_idx").on(table.actorUid),
    index("audit_logs_entity_idx").on(table.entityType, table.entityId),
  ],
);

export const mobileWebSessions = sqliteTable("mobile_web_sessions", {
  tokenHash: text("token_hash").primaryKey(),
  uid: text("uid").notNull(),
  role: text("role").$type<UserRole>().notNull(),
  redirectTo: text("redirect_to").notNull(),
  cookieHeader: text("cookie_header").notNull(),
  createdAt: timestamp("created_at").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
});

export const stationRelations = relations(stations, ({ many }) => ({
  reports: many(reports),
}));

export const reportRelations = relations(reports, ({ many, one }) => ({
  station: one(stations, {
    fields: [reports.stationId],
    references: [stations.stationId],
  }),
  statuses: many(reportStatuses),
}));

export function coordinatesFromRow(row: { lat: number | null; lng: number | null }): Coordinates | undefined {
  return typeof row.lat === "number" && typeof row.lng === "number" ? { lat: row.lat, lng: row.lng } : undefined;
}
