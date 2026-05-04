import "server-only";

import { buildReportTrend, buildStatusCounts, buildTechnicianStats, buildZoneStats } from "@/lib/analytics";
import {
  countRows,
  listAppUsers,
  listAttendanceSessionsForAdmin,
  listAuditLogs,
  listClientDirectory,
  listClientOrders,
  listReports,
  listStations,
  type ClientDirectoryEntry,
} from "@/lib/db/repositories";
import { i18n, roleLabels, statusOptionLabels } from "@/lib/i18n";
import { getOperationTasks } from "@/lib/operations-tasks";
import { getManagerDashboardStats, type ManagerDashboardStats } from "@/lib/stats/dashboard-stats";
import type {
  AiDataCoverageItem,
  AiInsightsResult,
  AppTimestamp,
  AppUser,
  AttendanceSession,
  AuditLog,
  ClientOrder,
  Report,
  Station,
} from "@/types";

const aiFullReportLimits = {
  attendanceSessions: 2000,
  auditLogs: 1500,
  clientOrders: 2000,
  clients: 2000,
  reports: 5000,
  stations: 3000,
  users: 2000,
} as const;

export interface ManagerAiReportPayload {
  analytics: {
    statusSummary: Record<string, unknown>[];
    technicians: Record<string, unknown>[];
    trend: Record<string, unknown>[];
    zones: Record<string, unknown>[];
  };
  coverage: AiDataCoverageItem[];
  datasets: {
    attendanceSessions: Record<string, unknown>[];
    auditLogs: Record<string, unknown>[];
    clientOrders: Record<string, unknown>[];
    clients: Record<string, unknown>[];
    reports: Record<string, unknown>[];
    stations: Record<string, unknown>[];
    users: Record<string, unknown>[];
  };
  generatedAt: string;
  metrics: {
    inactiveStations: number;
    openAttendanceSessions: number;
    pendingClientOrders: number;
    pendingReports: number;
    rejectedReports: number;
    staleStations: number;
    stationsMissingCoordinates: number;
  };
  operationTasks: {
    inactiveStationIds: string[];
    pendingReportIds: string[];
    staleStationIds: string[];
    totals: {
      inactiveStations: number;
      pendingReports: number;
      staleStations: number;
    };
    truncatedStationScan: boolean;
  };
  requestedBy: {
    displayName: string;
    role: AppUser["role"];
    uid: string;
  };
  safetyNotice: string;
  stats: ManagerDashboardStats;
}

export interface ManagerAiReportInput {
  requestedBy: AppUser;
}

export interface ManagerAiReportData {
  coverage: AiDataCoverageItem[];
  payload: ManagerAiReportPayload;
}

function timestampToIso(value: AppTimestamp | undefined): string | undefined {
  if (!value) {
    return undefined;
  }

  const date = value.toDate();

  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

function timestampToDate(value: AppTimestamp | undefined): Date | null {
  if (!value) {
    return null;
  }

  const date = value.toDate();

  return Number.isNaN(date.getTime()) ? null : date;
}

function photoCount(report: Report): number {
  return (
    Number(Boolean(report.photoPaths?.before)) +
    Number(Boolean(report.photoPaths?.after)) +
    Number(Boolean(report.photoPaths?.station))
  );
}

function coverageItem(input: {
  includedRows: number;
  key: string;
  label: string;
  totalRows: number;
}): AiDataCoverageItem {
  return {
    ...input,
    truncated: input.includedRows < input.totalRows,
  };
}

function serializeUser(user: AppUser): Record<string, unknown> {
  return {
    uid: user.uid,
    displayName: user.displayName,
    email: user.email,
    role: user.role,
    roleLabel: roleLabels[user.role],
    isActive: user.isActive,
    createdAt: timestampToIso(user.createdAt),
  };
}

function serializeStation(station: Station): Record<string, unknown> {
  return {
    stationId: station.stationId,
    label: station.label,
    location: station.location,
    description: station.description,
    zone: station.zone,
    coordinates: station.coordinates,
    isActive: station.isActive,
    requiresImmediateSupervision: station.requiresImmediateSupervision,
    totalReports: station.totalReports,
    photoCount: station.photoUrls?.length ?? 0,
    hasQrCode: station.qrCodeValue.trim().length > 0,
    createdAt: timestampToIso(station.createdAt),
    createdBy: station.createdBy,
    updatedAt: timestampToIso(station.updatedAt),
    updatedBy: station.updatedBy,
    lastVisitedAt: timestampToIso(station.lastVisitedAt),
    lastVisitedBy: station.lastVisitedBy,
  };
}

function serializeReport(report: Report): Record<string, unknown> {
  return {
    reportId: report.reportId,
    stationId: report.stationId,
    stationLabel: report.stationLabel,
    technicianUid: report.technicianUid,
    technicianName: report.technicianName,
    status: report.status.map((status) => ({
      label: statusOptionLabels[status],
      value: status,
    })),
    clientReportId: report.clientReportId,
    notes: report.notes,
    photoCount: photoCount(report),
    submittedAt: timestampToIso(report.submittedAt),
    reviewStatus: report.reviewStatus,
    reviewedAt: timestampToIso(report.reviewedAt),
    reviewedBy: report.reviewedBy,
    reviewNotes: report.reviewNotes,
  };
}

function serializeAuditLog(log: AuditLog): Record<string, unknown> {
  return {
    logId: log.logId,
    actorUid: log.actorUid,
    actorRole: log.actorRole,
    action: log.action,
    entityType: log.entityType,
    entityId: log.entityId,
    createdAt: timestampToIso(log.createdAt),
    metadata: log.metadata,
  };
}

function serializeClientOrder(order: ClientOrder): Record<string, unknown> {
  return {
    orderId: order.orderId,
    clientUid: order.clientUid,
    clientName: order.clientName,
    stationId: order.stationId,
    stationLabel: order.stationLabel,
    note: order.note,
    hasPhoto: Boolean(order.photoUrl),
    status: order.status,
    createdAt: timestampToIso(order.createdAt),
    reviewedAt: timestampToIso(order.reviewedAt),
    reviewedBy: order.reviewedBy,
  };
}

function serializeClient(entry: ClientDirectoryEntry): Record<string, unknown> {
  return {
    uid: entry.client.uid,
    displayName: entry.client.displayName,
    email: entry.client.email,
    isActive: entry.client.isActive,
    createdAt: timestampToIso(entry.client.createdAt),
    phone: entry.profile?.phone,
    addresses: entry.profile?.addresses ?? [],
    totalOrders: entry.totalOrders,
    pendingOrders: entry.pendingOrders,
    inProgressOrders: entry.inProgressOrders,
    completedOrders: entry.completedOrders,
    cancelledOrders: entry.cancelledOrders,
    stationCount: entry.stationCount,
    latestOrderAt: timestampToIso(entry.latestOrderAt),
    latestStationLocation: entry.latestStationLocation,
  };
}

function serializeAttendanceSession(session: AttendanceSession): Record<string, unknown> {
  const clockInAt = timestampToDate(session.clockInAt);
  const clockOutAt = timestampToDate(session.clockOutAt);
  const durationMinutes =
    clockInAt && clockOutAt ? Math.max(0, Math.round((clockOutAt.getTime() - clockInAt.getTime()) / 60_000)) : undefined;

  return {
    attendanceId: session.attendanceId,
    technicianUid: session.technicianUid,
    technicianName: session.technicianName,
    clockInAt: timestampToIso(session.clockInAt),
    clockOutAt: timestampToIso(session.clockOutAt),
    durationMinutes,
    isOpen: !session.clockOutAt,
    notes: session.notes,
  };
}

function reportRange(reports: Report[]): { rangeFrom: Date; rangeTo: Date } {
  const dates = reports
    .map((report) => timestampToDate(report.submittedAt))
    .filter((date): date is Date => date !== null)
    .sort((a, b) => a.getTime() - b.getTime());

  if (dates.length === 0) {
    const now = new Date();

    return {
      rangeFrom: now,
      rangeTo: now,
    };
  }

  return {
    rangeFrom: dates[0],
    rangeTo: dates[dates.length - 1],
  };
}

export async function buildManagerAiReportData({ requestedBy }: ManagerAiReportInput): Promise<ManagerAiReportData> {
  const [
    totalAttendanceSessions,
    totalAuditLogs,
    totalClientOrders,
    totalReports,
    totalStations,
    totalUsers,
    allStations,
    allUsers,
    reportRows,
    auditLogRows,
    clientOrderRows,
    clientDirectoryRows,
    attendanceRows,
    stats,
    tasks,
  ] = await Promise.all([
    countRows("attendanceSessions"),
    countRows("auditLogs"),
    countRows("clientOrders"),
    countRows("reports"),
    countRows("stations"),
    countRows("users"),
    listStations(),
    listAppUsers(),
    listReports({ limit: aiFullReportLimits.reports + 1 }),
    listAuditLogs({ limit: aiFullReportLimits.auditLogs + 1 }),
    listClientOrders(aiFullReportLimits.clientOrders + 1),
    listClientDirectory(),
    listAttendanceSessionsForAdmin({}, aiFullReportLimits.attendanceSessions + 1),
    getManagerDashboardStats(),
    getOperationTasks(50),
  ]);
  const stations = allStations.slice(0, aiFullReportLimits.stations);
  const users = allUsers.slice(0, aiFullReportLimits.users);
  const reports = reportRows.slice(0, aiFullReportLimits.reports);
  const auditLogs = auditLogRows.slice(0, aiFullReportLimits.auditLogs);
  const clientOrders = clientOrderRows.slice(0, aiFullReportLimits.clientOrders);
  const clients = clientDirectoryRows.slice(0, aiFullReportLimits.clients);
  const attendanceSessions = attendanceRows.slice(0, aiFullReportLimits.attendanceSessions);
  const { rangeFrom, rangeTo } = reportRange(reports);
  const coverage = [
    coverageItem({
      key: "users",
      label: "المستخدمون",
      includedRows: users.length,
      totalRows: totalUsers,
    }),
    coverageItem({
      key: "clients",
      label: "العملاء",
      includedRows: clients.length,
      totalRows: clientDirectoryRows.length,
    }),
    coverageItem({
      key: "stations",
      label: "المحطات",
      includedRows: stations.length,
      totalRows: totalStations,
    }),
    coverageItem({
      key: "reports",
      label: "التقارير",
      includedRows: reports.length,
      totalRows: totalReports,
    }),
    coverageItem({
      key: "clientOrders",
      label: "طلبات العملاء",
      includedRows: clientOrders.length,
      totalRows: totalClientOrders,
    }),
    coverageItem({
      key: "attendanceSessions",
      label: "الحضور والانصراف",
      includedRows: attendanceSessions.length,
      totalRows: totalAttendanceSessions,
    }),
    coverageItem({
      key: "auditLogs",
      label: "سجل العمليات",
      includedRows: auditLogs.length,
      totalRows: totalAuditLogs,
    }),
  ];

  return {
    coverage,
    payload: {
      analytics: {
        zones: buildZoneStats(stations, reports).map((zone) => ({ ...zone })),
        technicians: buildTechnicianStats(reports).map((technician) => ({ ...technician })),
        statusSummary: buildStatusCounts(reports).map((status) => ({
          ...status,
          label: statusOptionLabels[status.status],
        })),
        trend: buildReportTrend(reports, rangeFrom, rangeTo, "ar-EG").slice(-36).map((point) => ({ ...point })),
      },
      coverage,
      datasets: {
        attendanceSessions: attendanceSessions.map(serializeAttendanceSession),
        auditLogs: auditLogs.map(serializeAuditLog),
        clientOrders: clientOrders.map(serializeClientOrder),
        clients: clients.map(serializeClient),
        reports: reports.map(serializeReport),
        stations: stations.map(serializeStation),
        users: users.map(serializeUser),
      },
      generatedAt: new Date().toISOString(),
      metrics: {
        inactiveStations: stations.filter((station) => !station.isActive).length,
        openAttendanceSessions: attendanceSessions.filter((session) => !session.clockOutAt).length,
        pendingClientOrders: clientOrders.filter((order) => order.status === "pending").length,
        pendingReports: reports.filter((report) => report.reviewStatus === "pending").length,
        rejectedReports: reports.filter((report) => report.reviewStatus === "rejected").length,
        staleStations: tasks.totals.staleStations,
        stationsMissingCoordinates: stations.filter((station) => !station.coordinates).length,
      },
      operationTasks: {
        inactiveStationIds: tasks.inactiveStations.map((station) => station.stationId),
        pendingReportIds: tasks.pendingReports.map((report) => report.reportId),
        staleStationIds: tasks.staleStations.map((station) => station.stationId),
        totals: tasks.totals,
        truncatedStationScan: tasks.truncatedStationScan,
      },
      requestedBy: {
        uid: requestedBy.uid,
        displayName: requestedBy.displayName,
        role: requestedBy.role,
      },
      safetyNotice:
        "هذه اللقطة تشمل بيانات التشغيل التي يراها المدير، مع استبعاد أسرار المصادقة والجلسات وكلمات المرور والتوكنات وقيم QR الخام.",
      stats,
    },
  };
}

export function buildFallbackManagerReport(payload: ManagerAiReportPayload): AiInsightsResult {
  const truncatedDatasets = payload.coverage.filter((item) => item.truncated);
  const coverageText = payload.coverage
    .map((item) => `${item.label}: ${item.includedRows}/${item.totalRows}`)
    .join("، ");
  const alerts = [
    payload.metrics.pendingReports > 0 ? `يوجد ${payload.metrics.pendingReports} تقرير بانتظار المراجعة.` : null,
    payload.metrics.pendingClientOrders > 0 ? `يوجد ${payload.metrics.pendingClientOrders} طلب عميل لم يبدأ بعد.` : null,
    payload.metrics.openAttendanceSessions > 0 ? `يوجد ${payload.metrics.openAttendanceSessions} جلسة حضور مفتوحة.` : null,
    payload.metrics.inactiveStations > 0 ? `يوجد ${payload.metrics.inactiveStations} محطة غير نشطة.` : null,
    truncatedDatasets.length > 0 ? "تم الوصول إلى حد آمن لبعض مجموعات البيانات، راجع نطاق التغطية." : null,
  ].filter((value): value is string => Boolean(value));
  const dataQualityNotes = [
    payload.metrics.stationsMissingCoordinates > 0
      ? `${payload.metrics.stationsMissingCoordinates} محطة بدون إحداثيات GPS.`
      : "إحداثيات المحطات مكتملة ضمن البيانات المقروءة.",
    payload.operationTasks.truncatedStationScan ? "تم تقليم فحص مهام المحطات بسبب حجم البيانات." : "فحص مهام المحطات داخل الحد الآمن.",
    truncatedDatasets.length > 0
      ? `مجموعات مقلمة: ${truncatedDatasets.map((item) => item.label).join("، ")}.`
      : "لم يتم تقليم أي مجموعة بيانات في التقرير.",
  ];

  return {
    summary: `تمت قراءة بيانات التشغيل للمدير: ${payload.stats.totalStations} محطة، ${payload.stats.totalReports} تقرير، ${payload.stats.technicians} فني، و${payload.stats.pendingReviewReports} تقرير بانتظار المراجعة.`,
    fullReport: `يغطي التقرير البيانات التالية: ${coverageText}. المؤشرات الأساسية تظهر ${payload.metrics.pendingReports} تقريرًا معلقًا، ${payload.metrics.pendingClientOrders} طلب عميل معلق، و${payload.metrics.openAttendanceSessions} جلسة حضور مفتوحة.`,
    alerts,
    recommendations: [
      payload.metrics.pendingReports > 0
        ? "ابدأ بمراجعة التقارير المعلقة حسب الأقدمية ثم حسب المحطات المتكررة."
        : "استمر في إغلاق التقارير أولًا بأول للحفاظ على زمن مراجعة منخفض.",
      payload.metrics.pendingClientOrders > 0 ? "راجع طلبات العملاء المعلقة وحول الجاهز منها إلى تنفيذ." : "راقب طلبات العملاء الجديدة يوميًا.",
      payload.metrics.staleStations > 0 ? "رتب زيارة للمحطات المتأخرة أو غير النشطة ضمن خطة اليوم." : "حافظ على وتيرة الزيارات الحالية للمحطات.",
      payload.metrics.stationsMissingCoordinates > 0 ? "استكمل إحداثيات المحطات الناقصة لتحسين المتابعة الميدانية." : "استخدم بيانات المواقع الحالية لدعم توزيع الفنيين.",
    ],
    sections: [
      {
        title: "نطاق البيانات",
        body: "تم بناء التقرير من Snapshot مباشر من قاعدة البيانات التشغيلية.",
        items: payload.coverage.map((item) => `${item.label}: ${item.includedRows} من ${item.totalRows}`),
      },
      {
        title: "التشغيل",
        body: "ملخص لحالة المحطات والتقارير الحالية.",
        items: [
          `المحطات النشطة: ${payload.stats.activeStations} من ${payload.stats.totalStations}`,
          `تقارير آخر 7 أيام: ${payload.stats.reportsThisWeek}`,
          `تقارير مرفوضة ضمن البيانات المقروءة: ${payload.metrics.rejectedReports}`,
        ],
      },
      {
        title: "المتابعة",
        body: "أهم نقاط المتابعة الإدارية.",
        items: [
          `تقارير بانتظار المراجعة: ${payload.metrics.pendingReports}`,
          `طلبات عملاء معلقة: ${payload.metrics.pendingClientOrders}`,
          `جلسات حضور مفتوحة: ${payload.metrics.openAttendanceSessions}`,
        ],
      },
    ],
    dataQualityNotes,
    dataCoverage: payload.coverage,
    generatedAt: new Intl.DateTimeFormat("ar-EG", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date()),
    note: i18n.insights.missingKey,
    source: "fallback",
  };
}
