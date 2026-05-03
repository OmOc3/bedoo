import type {
  SharedPestTypeOption,
  SharedReviewStatus,
  SharedStatusOption,
  SharedUserRole,
} from "./constants";

export type MobileUserRole = SharedUserRole;
export type MobileStatusOption = SharedStatusOption;
export type MobilePestTypeOption = SharedPestTypeOption;
export type MobileReviewStatus = SharedReviewStatus;
export type MobileClientOrderStatus = "cancelled" | "completed" | "in_progress" | "pending";
export type MobileShiftStatus = "active" | "completed";
export type MobileShiftSalaryStatus = "paid" | "pending" | "unpaid";

export interface MobileCoordinates {
  lat: number;
  lng: number;
}

export interface MobileReportPhotoPaths {
  after?: string;
  before?: string;
  station?: string;
}

export interface MobileAppUser {
  createdAt?: string;
  displayName: string;
  email: string;
  image?: string | null;
  isActive: boolean;
  role: MobileUserRole;
  uid: string;
}

export interface MobileStation {
  coordinates?: MobileCoordinates;
  createdAt?: string;
  createdBy?: string;
  description?: string;
  distanceMeters?: number;
  isActive: boolean;
  label: string;
  lastVisitedAt?: string;
  lastVisitedBy?: string;
  location: string;
  photoUrls?: string[];
  qrCodeValue?: string;
  requiresImmediateSupervision: boolean;
  stationId: string;
  totalReports: number;
  updatedAt?: string;
  updatedBy?: string;
  zone?: string;
}

export interface MobileReport {
  clientReportId?: string;
  notes?: string;
  pestTypes?: MobilePestTypeOption[];
  photoCount?: number;
  photoPaths?: MobileReportPhotoPaths;
  reportId: string;
  reviewNotes?: string;
  reviewStatus: MobileReviewStatus;
  stationId: string;
  stationLabel: string;
  stationLocation?: string;
  status: MobileStatusOption[];
  submittedAt?: string;
  technicianName: string;
  technicianUid: string;
}

export interface MobileAuditLog {
  action: string;
  actorRole: MobileUserRole;
  actorUid: string;
  createdAt?: string;
  entityId: string;
  entityType: string;
  logId: string;
  metadata?: Record<string, unknown>;
}

export interface MobileAttendanceLocation {
  accuracyMeters?: number;
  clientName?: string;
  clientUid?: string;
  coordinates: MobileCoordinates;
  distanceMeters: number;
  stationId: string;
  stationLabel: string;
}

export interface MobileAttendanceSession {
  attendanceId: string;
  clockInAt?: string;
  clockInLocation?: MobileAttendanceLocation;
  clockOutAt?: string;
  clockOutLocation?: MobileAttendanceLocation;
  notes?: string;
  shiftId?: string;
  technicianName: string;
  technicianUid: string;
}

export interface MobileClientOrder {
  clientName: string;
  clientUid: string;
  createdAt?: string;
  decisionNote?: string;
  note?: string;
  orderId: string;
  photoUrl?: string;
  proposalDescription?: string;
  proposalLat?: number;
  proposalLng?: number;
  proposalLocation?: string;
  reviewedAt?: string;
  reviewedBy?: string;
  stationId?: string;
  stationLabel: string;
  stationLocation?: string;
  status: MobileClientOrderStatus;
}

export interface MobileClientProfile {
  addresses: string[];
  clientUid: string;
  createdAt?: string;
  phone?: string;
  updatedAt?: string;
}

export interface MobileClientStationAccess {
  accessId: string;
  clientName?: string;
  clientUid: string;
  createdAt?: string;
  createdBy: string;
  stationId: string;
  stationLabel?: string;
}

export interface MobileClientDirectoryEntry {
  cancelledOrders: number;
  client: MobileAppUser;
  completedOrders: number;
  inProgressOrders: number;
  latestOrderAt?: string;
  latestStationLocation?: string;
  pendingOrders: number;
  profile?: MobileClientProfile;
  stationCount: number;
  totalOrders: number;
}

export interface MobileClientAccountDetail {
  access: MobileClientStationAccess[];
  client: MobileAppUser;
  dailyReports: MobileDailyWorkReport[];
  orders: MobileClientOrder[];
  profile?: MobileClientProfile;
  reports: MobileReport[];
  stations: MobileStation[];
}

export interface MobileDailyReportPhoto {
  dailyReportId: string;
  photoId: string;
  sortOrder: number;
  uploadedAt?: string;
  uploadedBy: string;
  url: string;
}

export interface MobileDailyWorkReport {
  createdAt?: string;
  dailyReportId: string;
  notes?: string;
  photos?: MobileDailyReportPhoto[];
  reportDate?: string;
  stationIds: string[];
  stationLabels: string[];
  summary: string;
  technicianName: string;
  technicianUid: string;
  updatedAt?: string;
}

export interface MobileTechnicianWorkSchedule {
  createdAt?: string;
  createdBy: string;
  expectedDurationMinutes: number;
  hourlyRate?: number;
  isActive: boolean;
  notes?: string;
  scheduleId: string;
  shiftEndTime: string;
  shiftStartTime: string;
  technicianUid: string;
  updatedAt?: string;
  workDays: number[];
}

export interface MobileTechnicianShift {
  baseSalary?: number;
  createdAt?: string;
  earlyExit: boolean;
  endLat?: number;
  endLng?: number;
  endStationId?: string;
  endStationLabel?: string;
  endedAt?: string;
  expectedDurationMinutes?: number;
  notes?: string;
  salaryAmount?: number;
  salaryStatus: MobileShiftSalaryStatus;
  scheduleId?: string;
  shiftId: string;
  startLat?: number;
  startLng?: number;
  startStationId?: string;
  startStationLabel?: string;
  startedAt?: string;
  status: MobileShiftStatus;
  technicianName: string;
  technicianUid: string;
  totalMinutes?: number;
  updatedAt?: string;
}

export interface MobileShiftListResponse {
  openShift: MobileTechnicianShift | null;
  shifts: MobileTechnicianShift[];
}

export interface MobileShiftMutationResponse {
  earlyExit?: boolean;
  earlyExitMinutes?: number;
  minutesWorked?: number;
  shift: MobileTechnicianShift;
}

export interface MobileAppSettings {
  clientDailyStationOrderLimit: number;
  maintenanceEnabled: boolean;
  maintenanceMessage?: string;
  supportContact?: {
    email?: string;
    hours?: string;
    phone?: string;
  };
}

export interface MobileClientOrdersResponse {
  orders: MobileClientOrder[];
  attendanceSessions?: MobileAttendanceSession[];
  reports?: MobileReport[];
  stations?: MobileStation[];
}

export interface MobileAdminTasks {
  inactiveStations: MobileStation[];
  pendingReports: MobileReport[];
  staleStations: MobileStation[];
  totals: {
    inactiveStations: number;
    pendingReports: number;
    staleStations: number;
  };
  truncatedStationScan: boolean;
}

export interface MobileAdminAnalytics {
  rangeDays: number;
  reportsTruncated: boolean;
  stationsTruncated: boolean;
  statusSummary: {
    count: number;
    status: MobileStatusOption;
  }[];
  technicians: {
    pending: number;
    reports: number;
    technicianName: string;
    technicianUid: string;
  }[];
  zones: {
    activeStations: number;
    reports: number;
    stations: number;
    zone: string;
  }[];
}

export interface MobileManagerDashboardStats {
  activeStations: number;
  pendingReviewReports: number;
  reportsThisWeek: number;
  technicians: number;
  totalReports: number;
  totalStations: number;
}

export interface MobileSupervisorDashboardStats {
  activeStations: number;
  pendingReviewReports: number;
  reportsToday: number;
  totalReports: number;
}

export interface MobileAdminOverview {
  analytics?: MobileAdminAnalytics;
  latestReports: MobileReport[];
  role: "manager" | "supervisor";
  stats: MobileManagerDashboardStats | MobileSupervisorDashboardStats;
  tasks: MobileAdminTasks;
}
