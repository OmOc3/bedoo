import type {
  MobileAdminAnalytics as SharedMobileAdminAnalytics,
  MobileAdminOverview as SharedMobileAdminOverview,
  MobileAdminTasks as SharedMobileAdminTasks,
  MobileAppSettings as SharedMobileAppSettings,
  MobileAppUser as SharedMobileAppUser,
  MobileAuditLog as SharedMobileAuditLog,
  MobileClientAccountDetail as SharedMobileClientAccountDetail,
  MobileClientDirectoryEntry as SharedMobileClientDirectoryEntry,
  MobileClientOrder as SharedMobileClientOrder,
  MobileClientOrdersResponse as SharedMobileClientOrdersResponse,
  MobileClientOrderStatus,
  MobileClientProfile as SharedMobileClientProfile,
  MobileClientStationAccess as SharedMobileClientStationAccess,
  MobileCoordinates,
  MobileDailyReportPhoto as SharedMobileDailyReportPhoto,
  MobileDailyWorkReport as SharedMobileDailyWorkReport,
  MobileManagerDashboardStats as SharedMobileManagerDashboardStats,
  MobileReport as SharedMobileReport,
  MobileReportPhotoPaths,
  MobileReviewStatus,
  MobileShiftListResponse as SharedMobileShiftListResponse,
  MobileShiftMutationResponse as SharedMobileShiftMutationResponse,
  MobileStation as SharedMobileStation,
  MobileStatusOption,
  MobileSupervisorDashboardStats as SharedMobileSupervisorDashboardStats,
  MobileTechnicianShift as SharedMobileTechnicianShift,
  MobileTechnicianWorkSchedule as SharedMobileTechnicianWorkSchedule,
  MobileUserRole,
} from '@ecopest/shared/mobile';

export type UserRole = MobileUserRole;
export type StatusOption = MobileStatusOption;
export type ReviewStatus = MobileReviewStatus;
export type ClientOrderStatus = MobileClientOrderStatus;
export type Coordinates = MobileCoordinates;
export type ReportPhotoPaths = MobileReportPhotoPaths;
export type AppUser = SharedMobileAppUser;
export type MobileAppUser = SharedMobileAppUser;
export type Station = SharedMobileStation;
export type Report = SharedMobileReport;
export type MobileReviewReport = SharedMobileReport;
export type AuditLog = SharedMobileAuditLog;
export type AttendanceLocation = import('@ecopest/shared/mobile').MobileAttendanceLocation;
export type AttendanceSession = import('@ecopest/shared/mobile').MobileAttendanceSession;
export type OpenAttendanceResponse = {
  openSession: AttendanceSession | null;
};
export type MobileClientOrder = SharedMobileClientOrder;
export type MobileClientOrdersResponse = SharedMobileClientOrdersResponse;
export type MobileAdminTasks = SharedMobileAdminTasks;
export type MobileAdminAnalytics = SharedMobileAdminAnalytics;
export type MobileManagerDashboardStats = SharedMobileManagerDashboardStats;
export type MobileSupervisorDashboardStats = SharedMobileSupervisorDashboardStats;
export type MobileAdminOverview = SharedMobileAdminOverview;
export type MobileTechnicianShift = SharedMobileTechnicianShift;
export type MobileShiftListResponse = SharedMobileShiftListResponse;
export type MobileShiftMutationResponse = SharedMobileShiftMutationResponse;
export type MobileTechnicianWorkSchedule = SharedMobileTechnicianWorkSchedule;
export type MobileDailyWorkReport = SharedMobileDailyWorkReport;
export type MobileDailyReportPhoto = SharedMobileDailyReportPhoto;
export type MobileAppSettings = SharedMobileAppSettings;
export type MobileClientProfile = SharedMobileClientProfile;
export type MobileClientStationAccess = SharedMobileClientStationAccess;
export type MobileClientDirectoryEntry = SharedMobileClientDirectoryEntry;
export type MobileClientAccountDetail = SharedMobileClientAccountDetail;

export interface AppTimestamp {
  seconds: number;
  nanoseconds: number;
  toDate: () => Date;
}

export interface ApiErrorResponse {
  code: string;
  message: string;
  retryAfterSeconds?: number;
}

export interface AuthenticatedUserResponse {
  displayName: string;
  email: string;
  image?: string | null;
  isActive: boolean;
  role: UserRole;
  uid: string;
}

export interface LoginSuccessResponse {
  redirectTo: string;
  user: AuthenticatedUserResponse;
}

export interface SessionSuccessResponse {
  redirectTo: string;
}

export interface MobileWebSessionResponse {
  expiresAt: string;
  redirectTo: string;
  url: string;
}

export interface AiInsightsResult {
  alerts: string[];
  generatedAt: string;
  model?: string;
  note?: string;
  recommendations: string[];
  source: 'fallback' | 'gemini';
  summary: string;
}
