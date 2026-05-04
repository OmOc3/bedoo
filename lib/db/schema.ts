import { relations } from "drizzle-orm";
import { customType, index, integer, real, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";
import { booleanFlagFromDriver } from "@/lib/db/boolean";
import type {
  ClientAnalysisDocumentFileType,
  ClientAnalysisDocumentCategory,
  ClientOrderStatus,
  Coordinates,
  DailyAreaTaskStatus,
  PestTypeOption,
  ReportPhotoCategory,
  ReportPhotoPaths,
  SprayStatus,
  StationInstallationStatus,
  StationType,
  StatusOption,
  UserRole,
} from "@/types";
import type { SharedReviewStatus } from "@ecopest/shared/constants";

const timestamp = (name: string) => integer(name, { mode: "timestamp_ms" });
const sqliteBoolean = customType<{
  data: boolean;
  driverData: boolean | number | bigint | string;
}>({
  dataType() {
    return "integer";
  },
  fromDriver(value) {
    return booleanFlagFromDriver(value);
  },
  toDriver(value) {
    return value ? 1 : 0;
  },
});

const booleanFlag = (name: string) => sqliteBoolean(name);

export const appSettings = sqliteTable("app_settings", {
  settingId: text("setting_id").primaryKey(),
  maintenanceEnabled: booleanFlag("maintenance_mode_enabled").notNull().default(false),
  clientDailyStationOrderLimit: integer("client_daily_order_limit").notNull().default(5),
  maintenanceMessage: text("maintenance_message"),
  supportEmail: text("support_email"),
  supportHours: text("support_hours"),
  supportPhone: text("support_phone"),
  updatedAt: timestamp("updated_at"),
  updatedBy: text("updated_by"),
});

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
    passwordChangedAt: timestamp("password_changed_at"),
    deactivatedAt: timestamp("deactivated_at"),
    deactivatedBy: text("deactivated_by"),
    reactivatedAt: timestamp("reactivated_at"),
    reactivatedBy: text("reactivated_by"),
  },
  (table) => [uniqueIndex("user_email_unique").on(table.email), index("user_role_idx").on(table.role)],
);

export const clientSignupDevices = sqliteTable("client_signup_devices", {
  deviceHash: text("device_hash").primaryKey(),
  clientUid: text("client_uid").references(() => user.id, { onDelete: "restrict" }),
  createdAt: timestamp("created_at").notNull(),
});

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
    description: text("description"),
    zone: text("zone"),
    stationType: text("station_type").$type<StationType>().notNull().default("bait_station"),
    externalCode: text("external_code"),
    installationStatus: text("installation_status")
      .$type<StationInstallationStatus>()
      .notNull()
      .default("installed"),
    verifiedAt: timestamp("verified_at"),
    verifiedBy: text("verified_by"),
    sourceDocumentId: text("source_document_id").references(() => clientAnalysisDocuments.documentId, {
      onDelete: "set null",
    }),
    photoUrls: text("photo_urls", { mode: "json" }).$type<string[]>(),
    lat: real("lat"),
    lng: real("lng"),
    qrCodeValue: text("qr_code_value").notNull(),
    isActive: booleanFlag("is_active").notNull().default(true),
    requiresImmediateSupervision: booleanFlag("requires_immediate_supervision").notNull().default(false),
    totalReports: integer("total_reports").notNull().default(0),
    createdAt: timestamp("created_at").notNull(),
    createdBy: text("created_by").notNull(),
    updatedAt: timestamp("updated_at"),
    updatedBy: text("updated_by"),
    lastVisitedAt: timestamp("last_visited_at"),
    lastVisitedBy: text("last_visited_by"),
  },
  (table) => [
    index("stations_created_at_idx").on(table.createdAt),
    index("stations_active_idx").on(table.isActive),
    index("stations_zone_idx").on(table.zone),
    index("stations_type_idx").on(table.stationType),
    index("stations_external_code_idx").on(table.externalCode),
    index("stations_installation_status_idx").on(table.installationStatus),
    index("stations_source_document_idx").on(table.sourceDocumentId),
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
    stationLocation: text("station_location"),
    pestTypes: text("pest_types", { mode: "json" }).$type<PestTypeOption[]>(),
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

export const reportPhotos = sqliteTable(
  "report_photos",
  {
    photoId: text("photo_id").primaryKey(),
    reportId: text("report_id")
      .notNull()
      .references(() => reports.reportId, { onDelete: "cascade" }),
    category: text("category").$type<ReportPhotoCategory>().notNull(),
    url: text("url").notNull(),
    uploadedAt: timestamp("uploaded_at").notNull(),
    uploadedBy: text("uploaded_by").notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (table) => [
    index("report_photos_report_id_idx").on(table.reportId),
    index("report_photos_category_idx").on(table.category),
    index("report_photos_uploaded_at_idx").on(table.uploadedAt),
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

// Work schedule for a technician: which days and time window they are expected to work
export const technicianWorkSchedules = sqliteTable(
  "technician_work_schedules",
  {
    scheduleId: text("schedule_id").primaryKey(),
    technicianUid: text("technician_uid")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    // Comma-separated day numbers: 0=Sun,1=Mon,...,6=Sat  e.g. "0,1,2,3,4"
    workDays: text("work_days").notNull().default("0,1,2,3,4,5,6"),
    // HH:MM 24h format e.g. "08:00"
    shiftStartTime: text("shift_start_time").notNull().default("08:00"),
    // HH:MM 24h format e.g. "17:00"
    shiftEndTime: text("shift_end_time").notNull().default("17:00"),
    // Expected shift duration in minutes (used for early-exit warning)
    expectedDurationMinutes: integer("expected_duration_minutes").notNull().default(480),
    // Hourly or daily rate in whatever currency
    hourlyRate: real("hourly_rate"),
    isActive: booleanFlag("is_active").notNull().default(true),
    notes: text("notes"),
    createdAt: timestamp("created_at").notNull(),
    updatedAt: timestamp("updated_at"),
    createdBy: text("created_by").notNull(),
    updatedBy: text("updated_by"),
  },
  (table) => [
    index("tech_work_schedules_technician_uid_idx").on(table.technicianUid),
    index("tech_work_schedules_is_active_idx").on(table.isActive),
  ]
);

export const technicianShifts = sqliteTable(
  "technician_shifts",
  {
    shiftId: text("shift_id").primaryKey(),
    technicianUid: text("technician_uid")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    technicianName: text("technician_name").notNull(),
    // Link to the schedule used, if any
    scheduleId: text("schedule_id").references(() => technicianWorkSchedules.scheduleId, { onDelete: "set null" }),
    startedAt: timestamp("started_at").notNull(),
    startLat: real("start_lat"),
    startLng: real("start_lng"),
    startStationId: text("start_station_id"),
    startStationLabel: text("start_station_label"),
    endedAt: timestamp("ended_at"),
    endLat: real("end_lat"),
    endLng: real("end_lng"),
    endStationId: text("end_station_id"),
    endStationLabel: text("end_station_label"),
    status: text("status").notNull().default("active"), // active, completed
    totalHours: real("total_hours"),
    totalMinutes: integer("total_minutes"),
    expectedDurationMinutes: integer("expected_duration_minutes"),
    earlyExit: booleanFlag("early_exit").notNull().default(false),
    baseSalary: real("base_salary"),
    salaryAmount: real("salary_amount"),
    salaryStatus: text("salary_status").notNull().default("pending"), // pending, paid, unpaid
    notes: text("notes"),
    createdAt: timestamp("created_at").notNull(),
    updatedAt: timestamp("updated_at"),
  },
  (table) => [
    index("technician_shifts_technician_uid_idx").on(table.technicianUid),
    index("technician_shifts_started_at_idx").on(table.startedAt),
    index("technician_shifts_status_idx").on(table.status),
    index("technician_shifts_salary_status_idx").on(table.salaryStatus),
  ]
);

export const attendanceSessions = sqliteTable(
  "attendance_sessions",
  {
    attendanceId: text("attendance_id").primaryKey(),
    shiftId: text("shift_id").references(() => technicianShifts.shiftId, { onDelete: "cascade" }),
    technicianUid: text("technician_uid")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    technicianName: text("technician_name").notNull(),
    clockInAt: timestamp("clock_in_at").notNull(),
    clockInLat: real("clock_in_lat"),
    clockInLng: real("clock_in_lng"),
    clockInAccuracyMeters: real("clock_in_accuracy_meters"),
    clockInStationId: text("clock_in_station_id").references(() => stations.stationId, { onDelete: "restrict" }),
    clockInStationLabel: text("clock_in_station_label"),
    clockInClientUid: text("clock_in_client_uid").references(() => user.id, { onDelete: "restrict" }),
    clockInClientName: text("clock_in_client_name"),
    clockInDistanceMeters: real("clock_in_distance_meters"),
    clockOutAt: timestamp("clock_out_at"),
    clockOutLat: real("clock_out_lat"),
    clockOutLng: real("clock_out_lng"),
    clockOutAccuracyMeters: real("clock_out_accuracy_meters"),
    clockOutStationId: text("clock_out_station_id").references(() => stations.stationId, { onDelete: "restrict" }),
    clockOutStationLabel: text("clock_out_station_label"),
    clockOutClientUid: text("clock_out_client_uid").references(() => user.id, { onDelete: "restrict" }),
    clockOutClientName: text("clock_out_client_name"),
    clockOutDistanceMeters: real("clock_out_distance_meters"),
    notes: text("notes"),
    createdAt: timestamp("created_at").notNull(),
  },
  (table) => [
    index("attendance_sessions_technician_uid_idx").on(table.technicianUid),
    index("attendance_sessions_clock_in_idx").on(table.clockInAt),
    index("attendance_sessions_clock_out_idx").on(table.clockOutAt),
    index("attendance_sessions_clock_in_client_idx").on(table.clockInClientUid),
    index("attendance_sessions_clock_in_station_idx").on(table.clockInStationId),
  ],
);

export const clientOrders = sqliteTable(
  "client_orders",
  {
    orderId: text("order_id").primaryKey(),
    clientUid: text("client_uid")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    clientName: text("client_name").notNull(),
    /** Assigned after manager/supervisor approval; null while awaiting approval */
    stationId: text("station_id").references(() => stations.stationId, { onDelete: "restrict" }),
    stationLabel: text("station_label").notNull(),
    /** Snapshot for display before a station row exists */
    proposalLocation: text("proposal_location"),
    proposalDescription: text("proposal_description"),
    proposalLat: real("proposal_lat"),
    proposalLng: real("proposal_lng"),
    note: text("note"),
    photoUrl: text("photo_url"),
    status: text("status").$type<ClientOrderStatus>().notNull().default("pending"),
    createdAt: timestamp("created_at").notNull(),
    reviewedAt: timestamp("reviewed_at"),
    reviewedBy: text("reviewed_by"),
    decisionNote: text("decision_note"),
  },
  (table) => [
    index("client_orders_client_uid_idx").on(table.clientUid),
    index("client_orders_station_id_idx").on(table.stationId),
    index("client_orders_status_idx").on(table.status),
    index("client_orders_created_at_idx").on(table.createdAt),
  ],
);

export const clientProfiles = sqliteTable(
  "client_profiles",
  {
    clientUid: text("client_uid")
      .primaryKey()
      .references(() => user.id, { onDelete: "cascade" }),
    phone: text("phone"),
    addresses: text("addresses", { mode: "json" }).$type<string[]>(),
    createdAt: timestamp("created_at").notNull(),
    updatedAt: timestamp("updated_at"),
  },
  (table) => [index("client_profiles_updated_at_idx").on(table.updatedAt)],
);

export const clientStationAccess = sqliteTable(
  "client_station_access",
  {
    accessId: text("access_id").primaryKey(),
    clientUid: text("client_uid")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    stationId: text("station_id")
      .notNull()
      .references(() => stations.stationId, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").notNull(),
    createdBy: text("created_by").notNull(),
    stationVisibleToClient: booleanFlag("station_visible_to_client").notNull().default(false),
    reportsVisibleToClient: booleanFlag("reports_visible_to_client").notNull().default(false),
    visibilityUpdatedAt: timestamp("visibility_updated_at"),
    visibilityUpdatedBy: text("visibility_updated_by"),
  },
  (table) => [
    uniqueIndex("client_station_access_unique").on(table.clientUid, table.stationId),
    index("client_station_access_client_uid_idx").on(table.clientUid),
    index("client_station_access_station_id_idx").on(table.stationId),
    index("client_station_access_station_visible_idx").on(table.stationVisibleToClient),
    index("client_station_access_reports_visible_idx").on(table.reportsVisibleToClient),
  ],
);

export const clientAnalysisDocuments = sqliteTable(
  "client_analysis_documents",
  {
    documentId: text("document_id").primaryKey(),
    clientUid: text("client_uid")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    documentCategory: text("document_category")
      .$type<ClientAnalysisDocumentCategory>()
      .notNull()
      .default("import_source"),
    fileName: text("file_name").notNull(),
    fileType: text("file_type").$type<ClientAnalysisDocumentFileType>().notNull(),
    fileUrl: text("file_url").notNull(),
    isVisibleToClient: booleanFlag("is_visible_to_client").notNull().default(true),
    uploadedBy: text("uploaded_by").notNull(),
    uploadedByRole: text("uploaded_by_role").$type<UserRole>().notNull(),
    publishedAt: timestamp("published_at"),
    publishedBy: text("published_by"),
    createdAt: timestamp("created_at").notNull(),
    updatedAt: timestamp("updated_at"),
  },
  (table) => [
    index("client_analysis_documents_client_uid_idx").on(table.clientUid),
    index("client_analysis_documents_visible_idx").on(table.isVisibleToClient),
    index("client_analysis_documents_category_idx").on(table.documentCategory),
    index("client_analysis_documents_created_at_idx").on(table.createdAt),
  ],
);

export const clientStationImportBatches = sqliteTable(
  "client_station_import_batches",
  {
    batchId: text("batch_id").primaryKey(),
    clientUid: text("client_uid")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    sourceDocumentId: text("source_document_id").references(() => clientAnalysisDocuments.documentId, {
      onDelete: "set null",
    }),
    sourceName: text("source_name").notNull(),
    status: text("status").notNull().default("applied"),
    rowCount: integer("row_count").notNull().default(0),
    readyCount: integer("ready_count").notNull().default(0),
    blockedCount: integer("blocked_count").notNull().default(0),
    warningCount: integer("warning_count").notNull().default(0),
    createdAt: timestamp("created_at").notNull(),
    createdBy: text("created_by").notNull(),
    appliedAt: timestamp("applied_at"),
    appliedBy: text("applied_by"),
    summary: text("summary", { mode: "json" }).$type<Record<string, unknown>>(),
  },
  (table) => [
    index("client_station_import_batches_client_uid_idx").on(table.clientUid),
    index("client_station_import_batches_status_idx").on(table.status),
    index("client_station_import_batches_created_at_idx").on(table.createdAt),
  ],
);

export const clientStationImportRows = sqliteTable(
  "client_station_import_rows",
  {
    rowId: text("row_id").primaryKey(),
    batchId: text("batch_id")
      .notNull()
      .references(() => clientStationImportBatches.batchId, { onDelete: "cascade" }),
    rowNumber: integer("row_number").notNull(),
    clientUid: text("client_uid").notNull(),
    sourceFile: text("source_file").notNull(),
    sourceReleaseDate: text("source_release_date"),
    zone: text("zone"),
    stationType: text("station_type").$type<StationType>().notNull(),
    externalCode: text("external_code"),
    label: text("label").notNull(),
    location: text("location").notNull(),
    description: text("description"),
    installationStatus: text("installation_status").$type<StationInstallationStatus>().notNull(),
    notes: text("notes"),
    lat: real("lat"),
    lng: real("lng"),
    sourceDocumentId: text("source_document_id"),
    duplicateStationId: text("duplicate_station_id"),
    stationId: text("station_id").references(() => stations.stationId, { onDelete: "set null" }),
    status: text("status").notNull(),
    issues: text("issues", { mode: "json" }).$type<string[]>().notNull(),
    createdAt: timestamp("created_at").notNull(),
  },
  (table) => [
    index("client_station_import_rows_batch_id_idx").on(table.batchId),
    index("client_station_import_rows_status_idx").on(table.status),
    index("client_station_import_rows_station_id_idx").on(table.stationId),
  ],
);

export const clientServiceAreas = sqliteTable(
  "client_service_areas",
  {
    areaId: text("area_id").primaryKey(),
    clientUid: text("client_uid")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    location: text("location").notNull(),
    description: text("description"),
    lat: real("lat"),
    lng: real("lng"),
    qrCodeValue: text("qr_code_value").notNull(),
    isActive: booleanFlag("is_active").notNull().default(true),
    createdAt: timestamp("created_at").notNull(),
    createdBy: text("created_by").notNull(),
    updatedAt: timestamp("updated_at"),
    updatedBy: text("updated_by"),
  },
  (table) => [
    index("client_service_areas_client_uid_idx").on(table.clientUid),
    index("client_service_areas_active_idx").on(table.isActive),
    index("client_service_areas_created_at_idx").on(table.createdAt),
  ],
);

export const dailyAreaTasks = sqliteTable(
  "daily_area_tasks",
  {
    taskId: text("task_id").primaryKey(),
    areaId: text("area_id")
      .notNull()
      .references(() => clientServiceAreas.areaId, { onDelete: "cascade" }),
    clientUid: text("client_uid")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    technicianUid: text("technician_uid")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    scheduledDate: text("scheduled_date").notNull(),
    status: text("status").$type<DailyAreaTaskStatus>().notNull().default("pending_manager_approval"),
    sprayStatus: text("spray_status").$type<SprayStatus>(),
    notes: text("notes"),
    clientVisible: booleanFlag("client_visible").notNull().default(false),
    createdAt: timestamp("created_at").notNull(),
    createdBy: text("created_by").notNull(),
    createdByRole: text("created_by_role").$type<UserRole>().notNull(),
    approvedAt: timestamp("approved_at"),
    approvedBy: text("approved_by"),
    completedAt: timestamp("completed_at"),
    completedBy: text("completed_by"),
    publishedAt: timestamp("published_at"),
    publishedBy: text("published_by"),
    updatedAt: timestamp("updated_at"),
  },
  (table) => [
    uniqueIndex("daily_area_tasks_unique_area_tech_date").on(table.areaId, table.technicianUid, table.scheduledDate),
    index("daily_area_tasks_area_id_idx").on(table.areaId),
    index("daily_area_tasks_client_uid_idx").on(table.clientUid),
    index("daily_area_tasks_technician_uid_idx").on(table.technicianUid),
    index("daily_area_tasks_status_idx").on(table.status),
    index("daily_area_tasks_scheduled_date_idx").on(table.scheduledDate),
    index("daily_area_tasks_client_visible_idx").on(table.clientVisible),
  ],
);

export const dailyAreaTaskScans = sqliteTable(
  "daily_area_task_scans",
  {
    scanId: text("scan_id").primaryKey(),
    taskId: text("task_id")
      .notNull()
      .references(() => dailyAreaTasks.taskId, { onDelete: "cascade" }),
    technicianUid: text("technician_uid")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    sprayStatus: text("spray_status").$type<SprayStatus>().notNull(),
    notes: text("notes"),
    createdAt: timestamp("created_at").notNull(),
  },
  (table) => [
    index("daily_area_task_scans_task_id_idx").on(table.taskId),
    index("daily_area_task_scans_technician_uid_idx").on(table.technicianUid),
    index("daily_area_task_scans_created_at_idx").on(table.createdAt),
  ],
);

export const dailyWorkReports = sqliteTable(
  "daily_work_reports",
  {
    dailyReportId: text("daily_report_id").primaryKey(),
    technicianUid: text("technician_uid")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    technicianName: text("technician_name").notNull(),
    reportDate: timestamp("report_date").notNull(),
    summary: text("summary").notNull(),
    notes: text("notes"),
    createdAt: timestamp("created_at").notNull(),
    updatedAt: timestamp("updated_at"),
  },
  (table) => [
    index("daily_work_reports_technician_uid_idx").on(table.technicianUid),
    index("daily_work_reports_report_date_idx").on(table.reportDate),
    index("daily_work_reports_created_at_idx").on(table.createdAt),
  ],
);

export const dailyWorkReportStations = sqliteTable(
  "daily_work_report_stations",
  {
    dailyReportId: text("daily_report_id")
      .notNull()
      .references(() => dailyWorkReports.dailyReportId, { onDelete: "cascade" }),
    stationId: text("station_id")
      .notNull()
      .references(() => stations.stationId, { onDelete: "restrict" }),
  },
  (table) => [
    uniqueIndex("daily_work_report_stations_unique").on(table.dailyReportId, table.stationId),
    index("daily_work_report_stations_report_idx").on(table.dailyReportId),
    index("daily_work_report_stations_station_idx").on(table.stationId),
  ],
);

export const dailyReportPhotos = sqliteTable(
  "daily_report_photos",
  {
    photoId: text("photo_id").primaryKey(),
    dailyReportId: text("daily_report_id")
      .notNull()
      .references(() => dailyWorkReports.dailyReportId, { onDelete: "cascade" }),
    url: text("url").notNull(),
    uploadedAt: timestamp("uploaded_at").notNull(),
    uploadedBy: text("uploaded_by").notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (table) => [
    index("daily_report_photos_report_idx").on(table.dailyReportId),
    index("daily_report_photos_uploaded_at_idx").on(table.uploadedAt),
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
  clientAccess: many(clientStationAccess),
  dailyReports: many(dailyWorkReportStations),
  reports: many(reports),
}));

export const clientAnalysisDocumentRelations = relations(clientAnalysisDocuments, ({ one }) => ({
  client: one(user, {
    fields: [clientAnalysisDocuments.clientUid],
    references: [user.id],
  }),
}));

export const clientServiceAreaRelations = relations(clientServiceAreas, ({ many, one }) => ({
  client: one(user, {
    fields: [clientServiceAreas.clientUid],
    references: [user.id],
  }),
  tasks: many(dailyAreaTasks),
}));

export const dailyAreaTaskRelations = relations(dailyAreaTasks, ({ many, one }) => ({
  area: one(clientServiceAreas, {
    fields: [dailyAreaTasks.areaId],
    references: [clientServiceAreas.areaId],
  }),
  scans: many(dailyAreaTaskScans),
}));

export const dailyAreaTaskScanRelations = relations(dailyAreaTaskScans, ({ one }) => ({
  task: one(dailyAreaTasks, {
    fields: [dailyAreaTaskScans.taskId],
    references: [dailyAreaTasks.taskId],
  }),
}));

export const reportRelations = relations(reports, ({ many, one }) => ({
  photos: many(reportPhotos),
  station: one(stations, {
    fields: [reports.stationId],
    references: [stations.stationId],
  }),
  statuses: many(reportStatuses),
}));

export const dailyWorkReportRelations = relations(dailyWorkReports, ({ many }) => ({
  photos: many(dailyReportPhotos),
  stations: many(dailyWorkReportStations),
}));

export const technicianWorkScheduleRelations = relations(technicianWorkSchedules, ({ one, many }) => ({
  technician: one(user, {
    fields: [technicianWorkSchedules.technicianUid],
    references: [user.id],
  }),
  shifts: many(technicianShifts),
}));

export const technicianShiftRelations = relations(technicianShifts, ({ many, one }) => ({
  attendanceSessions: many(attendanceSessions),
  schedule: one(technicianWorkSchedules, {
    fields: [technicianShifts.scheduleId],
    references: [technicianWorkSchedules.scheduleId],
  }),
}));

export const attendanceSessionRelations = relations(attendanceSessions, ({ one }) => ({
  shift: one(technicianShifts, {
    fields: [attendanceSessions.shiftId],
    references: [technicianShifts.shiftId],
  }),
}));

export function coordinatesFromRow(row: { lat: number | null; lng: number | null }): Coordinates | undefined {
  return typeof row.lat === "number" && typeof row.lng === "number" ? { lat: row.lat, lng: row.lng } : undefined;
}
