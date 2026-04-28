import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EcoPestIcon, type EcoPestIconName } from '@/components/icons';
import {
  BottomSheet,
  Card,
  EmptyState,
  InputField,
  MobileTopBar,
  PrimaryButton,
  ReportCard,
  ScreenShell,
  SecondaryButton,
  StatusChip,
  SyncBanner,
  useToast,
} from '@/components/ecopest-ui';
import { ThemedText } from '@/components/themed-text';
import { BottomTabInset, Fonts, Radius, Shadow, Spacing, TouchTarget, Typography } from '@/constants/theme';
import { useLanguage } from '@/contexts/language-context';
import { useTheme } from '@/hooks/use-theme';
import { useReviewReports } from '@/hooks/use-review-reports';
import { useTeamUsers } from '@/hooks/use-team-users';
import { useCurrentUser } from '@/lib/auth';
import { isMobileAdminRole } from '@/lib/auth-routes';
import { apiGet, apiPatch, apiPost } from '@/lib/sync/api-client';
import { pickAndUploadImage } from '@/lib/upload-image';
import type {
  AuditLog,
  MobileAdminOverview,
  MobileAppUser,
  MobileManagerDashboardStats,
  MobileReviewReport,
  Report,
  Station,
  UserRole,
} from '@/lib/sync/types';

type AdminSection = 'overview' | 'reports' | 'stations' | 'tasks' | 'team' | 'audit';
type ReviewFilter = Report['reviewStatus'] | 'all';
type UserRoleFilter = UserRole | 'all';
type StationSheetMode = 'create' | 'edit';

interface StationFormState {
  description: string;
  label: string;
  lat: string;
  lng: string;
  location: string;
  requiresImmediateSupervision: boolean;
  stationId?: string;
  zone: string;
}

interface UserFormState {
  displayName: string;
  email: string;
  password: string;
  role: UserRole;
  image?: string;
}

const emptyStationForm: StationFormState = {
  description: '',
  label: '',
  lat: '',
  lng: '',
  location: '',
  requiresImmediateSupervision: false,
  zone: '',
};

const emptyUserForm: UserFormState = {
  displayName: '',
  email: '',
  password: '',
  role: 'technician',
};

const adminCopy = {
  ar: {
    accessCode: 'كود الدخول',
    accessCodePlaceholder: '8 أحرف أو أرقام على الأقل',
    action: 'الإجراء',
    active: 'نشط',
    activeStations: 'المحطات النشطة',
    activeTeam: 'أعضاء نشطون',
    actor: 'الفاعل',
    adminTools: 'أدوات الإدارة',
    analytics: 'التحليلات',
    analyticsRange: 'آخر 90 يوم',
    audit: 'سجل العمليات',
    auditFilters: 'فلاتر السجل',
    auditHint: 'سجل العمليات الحساسة من نفس قاعدة بيانات الويب.',
    codeSaved: 'تم تحديث كود الدخول.',
    createStation: 'إضافة محطة',
    createUser: 'إضافة مستخدم',
    dashboardBody: 'ادارة كاملة من الفون',
    dateUnavailable: 'غير متاح',
    editStation: 'تعديل المحطة',
    entity: 'الكيان',
    exportCsv: 'تصدير CSV',
    exportReady: 'ملف CSV جاهز',
    inactive: 'غير نشط',
    inactiveStations: 'محطات غير نشطة',
    latestReports: 'أحدث التقارير',
    loadAuditError: 'تعذر تحميل سجل العمليات.',
    loadOverviewError: 'تعذر تحميل ملخص الإدارة.',
    loadStationsError: 'تعذر تحميل المحطات.',
    managerOnly: 'متاح للمدير فقط',
    manageUser: 'إدارة المستخدم',
    noAudit: 'لا توجد عمليات مطابقة.',
    noReports: 'لا توجد تقارير مطابقة.',
    noStations: 'لا توجد محطات مطابقة.',
    noTasks: 'لا توجد مهام حالية.',
    overview: 'نظرة عامة',
    pendingReports: 'تقارير بانتظار المراجعة',
    pendingReviews: 'بانتظار المراجعة',
    qrLink: 'رابط QR',
    reportFilters: 'فلاتر التقارير',
    reports: 'التقارير',
    reportsThisWeek: 'تقارير آخر 7 أيام',
    review: 'مراجعة',
    reviewNotes: 'ملاحظات المراجعة',
    reviewSaved: 'تم حفظ المراجعة.',
    roleSaved: 'تم تحديث الدور.',
    saveChanges: 'حفظ التعديلات',
    search: 'بحث',
    smartBrief: 'موجز تشغيلي',
    staleStations: 'محطات تحتاج متابعة',
    stationSaved: 'تم حفظ المحطة.',
    stations: 'المحطات',
    tasks: 'مهام اليوم',
    team: 'الفريق',
    toggleSaved: 'تم تحديث الحالة.',
    totalReports: 'إجمالي التقارير',
    totalStations: 'إجمالي المحطات',
    totalUsers: 'إجمالي المستخدمين',
    userSaved: 'تم حفظ المستخدم.',
    zonePerformance: 'الأداء حسب المنطقة',
  },
  en: {
    accessCode: 'Access code',
    accessCodePlaceholder: 'At least 8 letters or numbers',
    action: 'Action',
    active: 'Active',
    activeStations: 'Active stations',
    activeTeam: 'Active team',
    actor: 'Actor',
    adminTools: 'Admin tools',
    analytics: 'Analytics',
    analyticsRange: 'Last 90 days',
    audit: 'Audit log',
    auditFilters: 'Audit filters',
    auditHint: 'Sensitive operations from the same web database.',
    codeSaved: 'Access code updated.',
    createStation: 'Add station',
    createUser: 'Add user',
    dashboardBody: 'Mobile manager and supervisor tools with the same web permissions, adapted for touch workflows.',
    dateUnavailable: 'Unavailable',
    editStation: 'Edit station',
    entity: 'Entity',
    exportCsv: 'Export CSV',
    exportReady: 'CSV is ready',
    inactive: 'Inactive',
    inactiveStations: 'Inactive stations',
    latestReports: 'Latest reports',
    loadAuditError: 'Could not load audit logs.',
    loadOverviewError: 'Could not load admin summary.',
    loadStationsError: 'Could not load stations.',
    managerOnly: 'Manager only',
    manageUser: 'Manage user',
    noAudit: 'No matching operations.',
    noReports: 'No matching reports.',
    noStations: 'No matching stations.',
    noTasks: 'No current tasks.',
    overview: 'Overview',
    pendingReports: 'Reports pending review',
    pendingReviews: 'Pending review',
    qrLink: 'QR link',
    reportFilters: 'Report filters',
    reports: 'Reports',
    reportsThisWeek: 'Reports last 7 days',
    review: 'Review',
    reviewNotes: 'Review notes',
    reviewSaved: 'Review saved.',
    roleSaved: 'Role updated.',
    saveChanges: 'Save changes',
    search: 'Search',
    smartBrief: 'Operations brief',
    staleStations: 'Stations needing follow-up',
    stationSaved: 'Station saved.',
    stations: 'Stations',
    tasks: 'Today tasks',
    team: 'Team',
    toggleSaved: 'Status updated.',
    totalReports: 'Total reports',
    totalStations: 'Total stations',
    totalUsers: 'Total users',
    userSaved: 'User saved.',
    zonePerformance: 'Zone performance',
  },
} as const;

function isManagerStats(stats: MobileAdminOverview['stats'] | undefined): stats is MobileManagerDashboardStats {
  return Boolean(stats && 'totalStations' in stats);
}

function formatDate(value: string | undefined, locale: string, fallback: string): string {
  if (!value) {
    return fallback;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return fallback;
  }

  return new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

function reportTime(report: MobileReviewReport): number {
  return report.submittedAt ? new Date(report.submittedAt).getTime() || 0 : 0;
}

function stationTime(station: Station): number {
  return station.lastVisitedAt ? new Date(station.lastVisitedAt).getTime() || 0 : 0;
}

function metadataSummary(metadata: Record<string, unknown> | undefined): string {
  if (!metadata) {
    return '-';
  }

  return Object.entries(metadata)
    .slice(0, 3)
    .map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(', ') : String(value)}`)
    .join('، ');
}

function stationHealth(station: Station): { label: string; tone: 'danger' | 'neutral' | 'success' | 'warning' } {
  if (!station.isActive) {
    return { label: 'غير نشطة', tone: 'neutral' };
  }

  if (!station.lastVisitedAt) {
    return { label: 'لم تزر بعد', tone: 'warning' };
  }

  const ageDays = Math.floor((Date.now() - new Date(station.lastVisitedAt).getTime()) / 86400000);

  if (ageDays >= 30) {
    return { label: 'متأخرة', tone: 'danger' };
  }

  if (ageDays >= 14) {
    return { label: 'تحتاج متابعة', tone: 'warning' };
  }

  return { label: 'مستقرة', tone: 'success' };
}

function buildStationPayload(form: StationFormState):
  | {
      coordinates?: { lat: number; lng: number };
      description?: string;
      label: string;
      location: string;
      requiresImmediateSupervision: boolean;
      zone?: string;
    }
  | null {
  const label = form.label.trim();
  const location = form.location.trim();

  if (!label || !location) {
    return null;
  }

  const lat = form.lat.trim();
  const lng = form.lng.trim();
  const coordinates =
    lat || lng
      ? {
          lat: Number(lat),
          lng: Number(lng),
        }
      : undefined;

  if (coordinates && (!Number.isFinite(coordinates.lat) || !Number.isFinite(coordinates.lng))) {
    return null;
  }

  return {
    label,
    location,
    requiresImmediateSupervision: form.requiresImmediateSupervision,
    ...(coordinates ? { coordinates } : {}),
    ...(form.description.trim() ? { description: form.description.trim() } : {}),
    ...(form.zone.trim() ? { zone: form.zone.trim() } : {}),
  };
}

function MetricCard({ icon, label, value }: { icon: EcoPestIconName; label: string; value: string }) {
  const theme = useTheme();

  return (
    <View style={[styles.metricCard, Shadow.sm, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
      <EcoPestIcon color={theme.primary} name={icon} size={25} />
      <View style={styles.metricCopy}>
        <ThemedText type="small" themeColor="textSecondary" style={styles.metricLabel}>
          {label}
        </ThemedText>
        <ThemedText style={styles.metricValue}>{value}</ThemedText>
      </View>
    </View>
  );
}

function SectionPill({
  active,
  icon,
  label,
  onPress,
}: {
  active: boolean;
  icon: EcoPestIconName;
  label: string;
  onPress: () => void;
}) {
  const theme = useTheme();
  const { isRtl } = useLanguage();

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={[
        styles.sectionPill,
        {
          backgroundColor: active ? theme.primary : theme.backgroundElement,
          borderColor: active ? theme.primary : theme.border,
          flexDirection: 'row',
        },
      ]}>
      <EcoPestIcon color={active ? theme.onPrimary : theme.textSecondary} name={icon} size={18} />
      <ThemedText type="smallBold" style={{ color: active ? theme.onPrimary : theme.text }}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

function FilterPill({ active, label, onPress }: { active: boolean; label: string; onPress: () => void }) {
  const theme = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={[
        styles.filterPill,
        {
          backgroundColor: active ? theme.backgroundSelected : theme.backgroundElement,
          borderColor: active ? theme.primary : theme.border,
        },
      ]}>
      <ThemedText type="smallBold" style={{ color: active ? theme.primary : theme.textSecondary }}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

function SectionHeader({ action, subtitle, title }: { action?: React.ReactNode; subtitle?: string; title: string }) {
  const { isRtl } = useLanguage();

  return (
    <View style={[styles.sectionHeaderRow, { flexDirection: 'row' }]}>
      <View style={styles.sectionHeaderCopy}>
        <ThemedText type="title">{title}</ThemedText>
        {subtitle ? (
          <ThemedText type="small" themeColor="textSecondary">
            {subtitle}
          </ThemedText>
        ) : null}
      </View>
      {action}
    </View>
  );
}

export default function AdminScreen() {
  const currentUser = useCurrentUser();
  const { isRtl, language, roleLabels, statusOptionLabels, strings } = useLanguage();
  const theme = useTheme();
  const { showToast } = useToast();
  const t = adminCopy[language];
  const locale = language === 'ar' ? 'ar-EG' : 'en-US';
  const role = currentUser?.profile.role;
  const isAdminUser = role ? isMobileAdminRole(role) : false;
  const isManager = role === 'manager';
  const [activeSection, setActiveSection] = useState<AdminSection>('overview');
  const [overview, setOverview] = useState<MobileAdminOverview | null>(null);
  const [overviewLoading, setOverviewLoading] = useState(true);
  const [overviewError, setOverviewError] = useState<string | null>(null);
  const [stations, setStations] = useState<Station[]>([]);
  const [stationsLoading, setStationsLoading] = useState(false);
  const [stationsError, setStationsError] = useState<string | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditError, setAuditError] = useState<string | null>(null);
  const [auditFilters, setAuditFilters] = useState({ action: '', actorUid: '', entityType: '' });
  const [reportFilter, setReportFilter] = useState<ReviewFilter>('all');
  const [reportSearch, setReportSearch] = useState('');
  const [stationSearch, setStationSearch] = useState('');
  const [teamSearch, setTeamSearch] = useState('');
  const [teamRoleFilter, setTeamRoleFilter] = useState<UserRoleFilter>('all');
  const [reviewingReportId, setReviewingReportId] = useState<string | null>(null);
  const [selectedReport, setSelectedReport] = useState<MobileReviewReport | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [stationSheetMode, setStationSheetMode] = useState<StationSheetMode>('create');
  const [stationSheetVisible, setStationSheetVisible] = useState(false);
  const [stationForm, setStationForm] = useState<StationFormState>(emptyStationForm);
  const [savingStation, setSavingStation] = useState(false);
  const [creatingUser, setCreatingUser] = useState(false);
  const [userCreateVisible, setUserCreateVisible] = useState(false);
  const [userForm, setUserForm] = useState<UserFormState>(emptyUserForm);
  const [selectedUser, setSelectedUser] = useState<MobileAppUser | null>(null);
  const [selectedUserRole, setSelectedUserRole] = useState<UserRole>('technician');
  const [selectedUserCode, setSelectedUserCode] = useState('');
  const [selectedUserName, setSelectedUserName] = useState('');
  const [savingUserAction, setSavingUserAction] = useState(false);
  const [exportCsv, setExportCsv] = useState('');
  const [exportLoading, setExportLoading] = useState(false);
  const [exportVisible, setExportVisible] = useState(false);
  const reviews = useReviewReports({ genericLoadError: strings.adminPortal.reviewLoadError });
  const team = useTeamUsers({
    genericLoadError: strings.team.genericLoadError,
    unsupportedApi: strings.team.unsupportedApi,
  });

  const sections = useMemo(
    () =>
      [
        { id: 'overview', icon: 'dashboard', label: t.overview },
        { id: 'reports', icon: 'file-text', label: t.reports },
        ...(isManager ? [{ id: 'stations', icon: 'target', label: t.stations } as const] : []),
        { id: 'tasks', icon: 'alert-circle', label: t.tasks },
        ...(isManager ? [{ id: 'team', icon: 'user', label: t.team } as const] : []),
        ...(isManager ? [{ id: 'audit', icon: 'shield', label: t.audit } as const] : []),
      ] satisfies { id: AdminSection; icon: EcoPestIconName; label: string }[],
    [isManager, t],
  );

  const loadOverview = useCallback(async (): Promise<void> => {
    setOverviewLoading(true);

    try {
      const data = await apiGet<MobileAdminOverview>('/api/mobile/admin/overview', {
        authRequiredMessage: strings.auth.sessionExpired,
        fallbackErrorMessage: t.loadOverviewError,
        networkErrorMessage: t.loadOverviewError,
      });

      setOverview(data);
      setOverviewError(null);
    } catch (loadError: unknown) {
      setOverview(null);
      setOverviewError(loadError instanceof Error ? loadError.message : t.loadOverviewError);
    } finally {
      setOverviewLoading(false);
    }
  }, [strings.auth.sessionExpired, t.loadOverviewError]);

  const loadStations = useCallback(async (): Promise<void> => {
    if (!isManager) {
      return;
    }

    setStationsLoading(true);

    try {
      const data = await apiGet<Station[]>('/api/mobile/stations', {
        authRequiredMessage: strings.auth.sessionExpired,
        fallbackErrorMessage: t.loadStationsError,
        networkErrorMessage: t.loadStationsError,
      });

      setStations([...data].sort((first, second) => stationTime(second) - stationTime(first)));
      setStationsError(null);
    } catch (loadError: unknown) {
      setStations([]);
      setStationsError(loadError instanceof Error ? loadError.message : t.loadStationsError);
    } finally {
      setStationsLoading(false);
    }
  }, [isManager, strings.auth.sessionExpired, t.loadStationsError]);

  const loadAudit = useCallback(async (): Promise<void> => {
    if (!isManager) {
      return;
    }

    const params = new URLSearchParams();
    Object.entries(auditFilters).forEach(([key, value]) => {
      const cleanValue = value.trim();

      if (cleanValue) {
        params.set(key, cleanValue);
      }
    });

    setAuditLoading(true);

    try {
      const data = await apiGet<AuditLog[]>(`/api/mobile/admin/audit${params.size ? `?${params.toString()}` : ''}`, {
        authRequiredMessage: strings.auth.sessionExpired,
        fallbackErrorMessage: t.loadAuditError,
        networkErrorMessage: t.loadAuditError,
      });

      setAuditLogs(data);
      setAuditError(null);
    } catch (loadError: unknown) {
      setAuditLogs([]);
      setAuditError(loadError instanceof Error ? loadError.message : t.loadAuditError);
    } finally {
      setAuditLoading(false);
    }
  }, [auditFilters, isManager, strings.auth.sessionExpired, t.loadAuditError]);

  const refreshAll = useCallback(async (): Promise<void> => {
    await Promise.all([loadOverview(), reviews.refresh(), team.refresh(), loadStations(), loadAudit()]);
  }, [loadAudit, loadOverview, loadStations, reviews, team]);

  useEffect(() => {
    if (!isAdminUser) {
      return;
    }

    void loadOverview();
    void loadStations();
    void loadAudit();
  }, [isAdminUser, loadAudit, loadOverview, loadStations]);

  useEffect(() => {
    if (!sections.some((section) => section.id === activeSection)) {
      setActiveSection('overview');
    }
  }, [activeSection, sections]);

  const reviewCounts = useMemo(
    () => ({
      pending: reviews.reports.filter((report) => report.reviewStatus === 'pending').length,
      rejected: reviews.reports.filter((report) => report.reviewStatus === 'rejected').length,
      reviewed: reviews.reports.filter((report) => report.reviewStatus === 'reviewed').length,
    }),
    [reviews.reports],
  );

  const visibleReports = useMemo(() => {
    const cleanQuery = reportSearch.trim().toLowerCase();

    return reviews.reports
      .filter((report) => (reportFilter === 'all' ? true : report.reviewStatus === reportFilter))
      .filter((report) => {
        if (!cleanQuery) {
          return true;
        }

        const haystack = `${report.stationId} ${report.stationLabel} ${report.technicianName} ${report.technicianUid}`.toLowerCase();
        return haystack.includes(cleanQuery);
      })
      .sort((first, second) => reportTime(second) - reportTime(first));
  }, [reportFilter, reportSearch, reviews.reports]);

  const visibleStations = useMemo(() => {
    const cleanQuery = stationSearch.trim().toLowerCase();

    return stations.filter((station) => {
      if (!cleanQuery) {
        return true;
      }

      const haystack = `${station.stationId} ${station.label} ${station.location} ${station.zone ?? ''}`.toLowerCase();
      return haystack.includes(cleanQuery);
    });
  }, [stationSearch, stations]);

  const visibleUsers = useMemo(() => {
    const cleanQuery = teamSearch.trim().toLowerCase();

    return team.users.filter((user) => {
      if (teamRoleFilter !== 'all' && user.role !== teamRoleFilter) {
        return false;
      }

      if (!cleanQuery) {
        return true;
      }

      const haystack = `${user.displayName} ${user.email} ${user.uid}`.toLowerCase();
      return haystack.includes(cleanQuery);
    });
  }, [team.users, teamRoleFilter, teamSearch]);

  async function updateReview(report: MobileReviewReport, reviewStatus: Report['reviewStatus'], notes = ''): Promise<void> {
    setReviewingReportId(report.reportId);

    try {
      await apiPatch<{ success: boolean }, { reviewNotes?: string; reviewStatus: Report['reviewStatus'] }>(
        `/api/mobile/reports/${encodeURIComponent(report.reportId)}/review`,
        {
          reviewStatus,
          ...(notes.trim() ? { reviewNotes: notes.trim() } : {}),
        },
        {
          authRequiredMessage: strings.auth.sessionExpired,
          fallbackErrorMessage: strings.adminPortal.reviewError,
          networkErrorMessage: strings.adminPortal.reviewError,
        },
      );
      await Promise.all([reviews.refresh(), loadOverview()]);
      setSelectedReport(null);
      setReviewNotes('');
      showToast(t.reviewSaved, 'success');
      await successHaptic();
    } catch (reviewError: unknown) {
      showToast(reviewError instanceof Error ? reviewError.message : strings.adminPortal.reviewError, 'error');
      await errorHaptic();
    } finally {
      setReviewingReportId(null);
    }
  }

  function openStationSheet(mode: StationSheetMode, station?: Station): void {
    setStationSheetMode(mode);
    setStationForm(
      station
        ? {
            stationId: station.stationId,
            label: station.label,
            location: station.location,
            description: station.description ?? '',
            zone: station.zone ?? '',
            lat: station.coordinates ? String(station.coordinates.lat) : '',
            lng: station.coordinates ? String(station.coordinates.lng) : '',
            requiresImmediateSupervision: Boolean(station.requiresImmediateSupervision),
          }
        : emptyStationForm,
    );
    setStationSheetVisible(true);
  }

  async function submitStation(): Promise<void> {
    const payload = buildStationPayload(stationForm);

    if (!payload) {
      showToast(t.loadStationsError, 'error');
      await errorHaptic();
      return;
    }

    setSavingStation(true);

    try {
      if (stationSheetMode === 'create') {
        await apiPost<{ label: string; qrCodeValue: string; stationId: string }, typeof payload>('/api/mobile/stations', payload, {
          authRequiredMessage: strings.auth.sessionExpired,
          fallbackErrorMessage: t.loadStationsError,
          networkErrorMessage: t.loadStationsError,
        });
      } else if (stationForm.stationId) {
        await apiPatch<Station, typeof payload>(`/api/mobile/stations/${encodeURIComponent(stationForm.stationId)}`, payload, {
          authRequiredMessage: strings.auth.sessionExpired,
          fallbackErrorMessage: t.loadStationsError,
          networkErrorMessage: t.loadStationsError,
        });
      }

      setStationSheetVisible(false);
      await Promise.all([loadStations(), loadOverview()]);
      showToast(t.stationSaved, 'success');
      await successHaptic();
    } catch (stationError: unknown) {
      showToast(stationError instanceof Error ? stationError.message : t.loadStationsError, 'error');
      await errorHaptic();
    } finally {
      setSavingStation(false);
    }
  }

  async function toggleStation(station: Station): Promise<void> {
    try {
      await apiPatch<Station, { action: 'toggleActive' }>(
        `/api/mobile/stations/${encodeURIComponent(station.stationId)}`,
        { action: 'toggleActive' },
        {
          authRequiredMessage: strings.auth.sessionExpired,
          fallbackErrorMessage: t.loadStationsError,
          networkErrorMessage: t.loadStationsError,
        },
      );
      await Promise.all([loadStations(), loadOverview()]);
      showToast(t.toggleSaved, 'success');
      await successHaptic();
    } catch (stationError: unknown) {
      showToast(stationError instanceof Error ? stationError.message : t.loadStationsError, 'error');
      await errorHaptic();
    }
  }

  async function submitUser(): Promise<void> {
    if (!userForm.displayName.trim() || !userForm.email.trim() || !userForm.password.trim()) {
      showToast(strings.errors.unexpected, 'error');
      await errorHaptic();
      return;
    }

    setCreatingUser(true);

    try {
      await apiPost<MobileAppUser, UserFormState>('/api/mobile/users', userForm, {
        authRequiredMessage: strings.auth.sessionExpired,
        fallbackErrorMessage: strings.team.genericLoadError,
        networkErrorMessage: strings.team.genericLoadError,
      });
      setUserCreateVisible(false);
      setUserForm(emptyUserForm);
      await Promise.all([team.refresh(), loadOverview()]);
      showToast(t.userSaved, 'success');
      await successHaptic();
    } catch (userError: unknown) {
      showToast(userError instanceof Error ? userError.message : strings.team.genericLoadError, 'error');
      await errorHaptic();
    } finally {
      setCreatingUser(false);
    }
  }

  function openUserSheet(user: MobileAppUser): void {
    setSelectedUser(user);
    setSelectedUserRole(user.role);
    setSelectedUserCode('');
    setSelectedUserName(user.displayName);
  }

  async function patchSelectedUser(payload: Partial<Pick<MobileAppUser, 'isActive' | 'role' | 'displayName' | 'image'>> & { password?: string }, successMessage: string): Promise<void> {
    if (!selectedUser) {
      return;
    }

    setSavingUserAction(true);

    try {
      const updatedUser = await apiPatch<MobileAppUser, typeof payload>(`/api/mobile/users/${encodeURIComponent(selectedUser.uid)}`, payload, {
        authRequiredMessage: strings.auth.sessionExpired,
        fallbackErrorMessage: strings.team.genericLoadError,
        networkErrorMessage: strings.team.genericLoadError,
      });
      setSelectedUser(updatedUser);
      setSelectedUserRole(updatedUser.role);
      setSelectedUserCode('');
      setSelectedUserName(updatedUser.displayName);
      await Promise.all([team.refresh(), loadOverview()]);
      showToast(successMessage, 'success');
      await successHaptic();
    } catch (userError: unknown) {
      showToast(userError instanceof Error ? userError.message : strings.team.genericLoadError, 'error');
      await errorHaptic();
    } finally {
      setSavingUserAction(false);
    }
  }

  async function openExport(): Promise<void> {
    setExportLoading(true);

    try {
      const csv = await apiGet<string>('/api/reports/export', {
        authRequiredMessage: strings.auth.sessionExpired,
        fallbackErrorMessage: strings.errors.unexpected,
        networkErrorMessage: strings.errors.unexpected,
      });

      setExportCsv(csv);
      setExportVisible(true);
      showToast(t.exportReady, 'success');
    } catch (exportError: unknown) {
      showToast(exportError instanceof Error ? exportError.message : strings.errors.unexpected, 'error');
      await errorHaptic();
    } finally {
      setExportLoading(false);
    }
  }

  function renderOverview() {
    const stats = overview?.stats;
    const analytics = overview?.analytics;

    return (
      <View style={styles.sectionStack}>
        {overviewLoading ? <ActivityIndicator color={theme.primary} /> : null}
        {overviewError ? <SyncBanner body={overviewError} title={t.loadOverviewError} tone="warning" /> : null}

        <View style={[styles.metricsGrid, { flexDirection: 'row' }]}>
          {isManagerStats(stats) ? (
            <>
              <MetricCard icon="target" label={t.totalStations} value={String(stats.totalStations)} />
              <MetricCard icon="check-circle" label={t.activeStations} value={String(stats.activeStations)} />
              <MetricCard icon="file-text" label={t.totalReports} value={String(stats.totalReports)} />
              <MetricCard icon="radio-tower" label={t.reportsThisWeek} value={String(stats.reportsThisWeek)} />
              <MetricCard icon="alert-circle" label={t.pendingReviews} value={String(stats.pendingReviewReports)} />
              <MetricCard icon="user" label={t.activeTeam} value={String(team.users.filter((user) => user.isActive).length)} />
            </>
          ) : stats ? (
            <>
              <MetricCard icon="file-text" label={t.totalReports} value={String(stats.totalReports)} />
              <MetricCard icon="radio-tower" label={t.reportsThisWeek} value={String('reportsToday' in stats ? stats.reportsToday : 0)} />
              <MetricCard icon="alert-circle" label={t.pendingReviews} value={String(stats.pendingReviewReports)} />
              <MetricCard icon="check-circle" label={t.activeStations} value={String(stats.activeStations)} />
            </>
          ) : null}
        </View>

        {analytics ? (
          <Card>
            <View style={[styles.headerRow, { flexDirection: 'row' }]}>
              <StatusChip label={t.analyticsRange} tone="info" />
              <EcoPestIcon color={theme.primary} name="dashboard" size={24} />
            </View>
            <ThemedText type="title">{t.smartBrief}</ThemedText>
            <ThemedText themeColor="textSecondary">
              {`${t.totalStations}: ${isManagerStats(stats) ? stats.totalStations : 0}، ${t.pendingReviews}: ${reviewCounts.pending}`}
            </ThemedText>
            {analytics.zones[0] ? (
              <ThemedText type="small" themeColor="textSecondary">
                {`${t.zonePerformance}: ${analytics.zones[0].zone} - ${analytics.zones[0].reports} ${t.reports}`}
              </ThemedText>
            ) : null}
          </Card>
        ) : null}

        {analytics ? (
          <View style={styles.analysisGrid}>
            <Card>
              <ThemedText type="title">{t.zonePerformance}</ThemedText>
              {analytics.zones.slice(0, 4).map((zone) => (
                <View key={zone.zone} style={[styles.dataRow, { flexDirection: 'row' }]}>
                  <ThemedText type="smallBold" style={styles.dataRowTitle}>
                    {zone.zone}
                  </ThemedText>
                  <StatusChip label={`${zone.reports}`} tone="info" />
                </View>
              ))}
            </Card>
            <Card>
              <ThemedText type="title">{t.analytics}</ThemedText>
              {analytics.statusSummary.slice(0, 4).map((item) => (
                <View key={item.status} style={[styles.dataRow, { flexDirection: 'row' }]}>
                  <ThemedText type="smallBold" style={styles.dataRowTitle}>
                    {statusOptionLabels[item.status]}
                  </ThemedText>
                  <StatusChip label={`${item.count}`} tone="warning" />
                </View>
              ))}
            </Card>
          </View>
        ) : null}

        <SectionHeader title={t.latestReports} />
        <View style={styles.reportList}>
          {(overview?.latestReports ?? []).slice(0, 5).map((report) => (
            <ReportCard
              createdAt={report.submittedAt}
              key={report.reportId}
              notes={report.notes}
              reviewStatus={report.reviewStatus}
              stationId={report.stationId}
              stationLabel={`${report.stationLabel} · ${report.technicianName}`}
              status={report.status}
            />
          ))}
        </View>
      </View>
    );
  }

  function renderReports() {
    return (
      <View style={styles.sectionStack}>
        <SectionHeader
          action={
            <SecondaryButton icon="link" loading={exportLoading} onPress={() => void openExport()}>
              {t.exportCsv}
            </SecondaryButton>
          }
          subtitle={t.reportFilters}
          title={t.reports}
        />
        {reviews.error ? <SyncBanner body={reviews.error} title={strings.adminPortal.reviewLoadError} tone="warning" /> : null}
        <InputField label={t.search} onChangeText={setReportSearch} value={reportSearch} />
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={[styles.filterRow, { flexDirection: 'row' }]}>
            {(['all', 'pending', 'reviewed', 'rejected'] as const).map((filter) => (
              <FilterPill
                active={reportFilter === filter}
                key={filter}
                label={filter === 'all' ? strings.history.filterAll : strings.reviewStatus[filter]}
                onPress={() => setReportFilter(filter)}
              />
            ))}
          </View>
        </ScrollView>

        {!reviews.loading && visibleReports.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
            <EmptyState subtitle={t.noReports} title={t.reports} />
          </View>
        ) : null}

        <View style={styles.reportList}>
          {visibleReports.map((report) => {
            const isReviewing = reviewingReportId === report.reportId;

            return (
              <ReportCard
                action={
                  <View style={[styles.reviewActions, { flexDirection: 'row' }]}>
                    <SecondaryButton
                      disabled={isReviewing}
                      icon="check"
                      loading={isReviewing}
                      onPress={() => void updateReview(report, 'reviewed')}>
                      {strings.adminPortal.reviewApprove}
                    </SecondaryButton>
                    <SecondaryButton
                      disabled={isReviewing}
                      icon="alert-circle"
                      loading={isReviewing}
                      onPress={() => void updateReview(report, 'rejected')}>
                      {strings.adminPortal.reviewReject}
                    </SecondaryButton>
                    <SecondaryButton
                      icon="edit"
                      onPress={() => {
                        setSelectedReport(report);
                        setReviewNotes(report.reviewNotes ?? '');
                      }}>
                      {t.review}
                    </SecondaryButton>
                  </View>
                }
                createdAt={report.submittedAt}
                key={report.reportId}
                notes={report.notes ?? report.reviewNotes}
                reviewStatus={report.reviewStatus}
                stationId={report.stationId}
                stationLabel={`${report.stationLabel} · ${report.technicianName}`}
                status={report.status}
              />
            );
          })}
        </View>
      </View>
    );
  }

  function renderStations() {
    return (
      <View style={styles.sectionStack}>
        <SectionHeader
          action={
            <SecondaryButton icon="target" onPress={() => openStationSheet('create')}>
              {t.createStation}
            </SecondaryButton>
          }
          title={t.stations}
        />
        {stationsError ? <SyncBanner body={stationsError} title={t.loadStationsError} tone="warning" /> : null}
        <InputField label={t.search} onChangeText={setStationSearch} value={stationSearch} />
        {stationsLoading ? <ActivityIndicator color={theme.primary} /> : null}
        {!stationsLoading && visibleStations.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
            <EmptyState actionLabel={t.createStation} onAction={() => openStationSheet('create')} subtitle={t.noStations} title={t.stations} />
          </View>
        ) : null}
        <View style={styles.cardList}>
          {visibleStations.map((station) => {
            const health = stationHealth(station);

            return (
              <Card key={station.stationId}>
                <View style={[styles.headerRow, { flexDirection: 'row' }]}>
                  <View style={styles.summaryCopy}>
                    <ThemedText type="title">{station.label}</ThemedText>
                    <ThemedText selectable type="small" themeColor="textSecondary">
                      #{station.stationId} · {station.location}
                    </ThemedText>
                  </View>
                  <StatusChip label={station.isActive ? t.active : t.inactive} tone={station.isActive ? 'success' : 'neutral'} />
                </View>
                <View style={[styles.metaRow, { flexDirection: 'row' }]}>
                  <StatusChip label={health.label} tone={health.tone} />
                  {station.zone ? <StatusChip label={station.zone} tone="info" /> : null}
                  {station.requiresImmediateSupervision ? <StatusChip label={t.pendingReports} tone="warning" /> : null}
                </View>
                <ThemedText type="small" themeColor="textSecondary">
                  {`${strings.scan.stationLastVisit}: ${formatDate(station.lastVisitedAt, locale, t.dateUnavailable)}`}
                </ThemedText>
                {station.qrCodeValue ? (
                  <ThemedText selectable type="code" themeColor="textSecondary">
                    {station.qrCodeValue}
                  </ThemedText>
                ) : null}
                <View style={[styles.reviewActions, { flexDirection: 'row' }]}>
                  <SecondaryButton icon="edit" onPress={() => openStationSheet('edit', station)}>
                    {strings.actions.edit}
                  </SecondaryButton>
                  <SecondaryButton icon={station.isActive ? 'alert-circle' : 'check'} onPress={() => void toggleStation(station)}>
                    {station.isActive ? strings.settings.disabled : strings.settings.enabled}
                  </SecondaryButton>
                </View>
              </Card>
            );
          })}
        </View>
      </View>
    );
  }

  function renderTasks() {
    const tasks = overview?.tasks;
    const hasTasks = Boolean(tasks && (tasks.pendingReports.length || tasks.staleStations.length || tasks.inactiveStations.length));

    return (
      <View style={styles.sectionStack}>
        <SectionHeader title={t.tasks} />
        {!hasTasks ? (
          <View style={[styles.emptyCard, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
            <EmptyState subtitle={t.noTasks} title={t.tasks} />
          </View>
        ) : null}
        {tasks ? (
          <>
            <TaskGroup
              reports={tasks.pendingReports}
              title={`${t.pendingReports} (${tasks.totals.pendingReports})`}
              onReview={(report) => {
                setActiveSection('reports');
                setSelectedReport(report);
                setReviewNotes(report.reviewNotes ?? '');
              }}
            />
            <StationTaskGroup stations={tasks.staleStations} title={`${t.staleStations} (${tasks.totals.staleStations})`} />
            <StationTaskGroup stations={tasks.inactiveStations} title={`${t.inactiveStations} (${tasks.totals.inactiveStations})`} />
          </>
        ) : null}
      </View>
    );
  }

  function renderTeam() {
    return (
      <View style={styles.sectionStack}>
        <SectionHeader
          action={
            <SecondaryButton icon="user" onPress={() => setUserCreateVisible(true)}>
              {t.createUser}
            </SecondaryButton>
          }
          title={t.team}
        />
        {team.error ? <SyncBanner body={team.error} title={strings.team.loadErrorTitle} tone="warning" /> : null}
        <InputField label={t.search} onChangeText={setTeamSearch} value={teamSearch} />
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={[styles.filterRow, { flexDirection: 'row' }]}>
            {(['all', 'technician', 'supervisor', 'manager'] as const).map((filter) => (
              <FilterPill
                active={teamRoleFilter === filter}
                key={filter}
                label={filter === 'all' ? strings.team.filterAll : roleLabels[filter]}
                onPress={() => setTeamRoleFilter(filter)}
              />
            ))}
          </View>
        </ScrollView>
        <View style={[styles.metricsGrid, { flexDirection: 'row' }]}>
          <MetricCard icon="user" label={t.totalUsers} value={String(team.users.length)} />
          <MetricCard icon="check-circle" label={t.activeTeam} value={String(team.users.filter((user) => user.isActive).length)} />
        </View>
        <View style={styles.cardList}>
          {visibleUsers.map((user) => (
            <Card key={user.uid}>
              <View style={[styles.headerRow, { flexDirection: 'row' }]}>
                <View style={styles.summaryCopy}>
                  <ThemedText type="title">{user.displayName}</ThemedText>
                  <ThemedText selectable type="small" themeColor="textSecondary">
                    {user.email}
                  </ThemedText>
                </View>
                <StatusChip label={user.isActive ? strings.team.activeStatus : strings.team.inactiveStatus} tone={user.isActive ? 'success' : 'neutral'} />
              </View>
              <View style={[styles.metaRow, { flexDirection: 'row' }]}>
                <StatusChip label={roleLabels[user.role]} tone="info" />
                <StatusChip label={formatDate(user.createdAt, locale, t.dateUnavailable)} tone="neutral" />
              </View>
              <SecondaryButton icon="settings" onPress={() => openUserSheet(user)}>
                {t.manageUser}
              </SecondaryButton>
            </Card>
          ))}
        </View>
      </View>
    );
  }

  function renderAudit() {
    return (
      <View style={styles.sectionStack}>
        <SectionHeader subtitle={t.auditHint} title={t.audit} />
        {auditError ? <SyncBanner body={auditError} title={t.loadAuditError} tone="warning" /> : null}
        <Card>
          <ThemedText type="title">{t.auditFilters}</ThemedText>
          <InputField label={t.action} onChangeText={(value) => setAuditFilters((current) => ({ ...current, action: value }))} value={auditFilters.action} />
          <InputField label={t.entity} onChangeText={(value) => setAuditFilters((current) => ({ ...current, entityType: value }))} value={auditFilters.entityType} />
          <InputField label={t.actor} contentDirection="ltr" onChangeText={(value) => setAuditFilters((current) => ({ ...current, actorUid: value }))} value={auditFilters.actorUid} />
          <PrimaryButton icon="search" loading={auditLoading} onPress={() => void loadAudit()}>
            {strings.actions.filter}
          </PrimaryButton>
        </Card>
        {!auditLoading && auditLogs.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
            <EmptyState subtitle={t.noAudit} title={t.audit} />
          </View>
        ) : null}
        <View style={styles.cardList}>
          {auditLogs.map((log) => (
            <Card key={log.logId}>
              <View style={[styles.headerRow, { flexDirection: 'row' }]}>
                <View style={styles.summaryCopy}>
                  <ThemedText type="title">{log.action}</ThemedText>
                  <ThemedText selectable type="small" themeColor="textSecondary">
                    {formatDate(log.createdAt, locale, t.dateUnavailable)}
                  </ThemedText>
                </View>
                <StatusChip label={roleLabels[log.actorRole]} tone="info" />
              </View>
              <ThemedText selectable type="code" themeColor="textSecondary">
                {`${log.entityType}: ${log.entityId}`}
              </ThemedText>
              <ThemedText selectable type="small" themeColor="textSecondary">
                {metadataSummary(log.metadata)}
              </ThemedText>
            </Card>
          ))}
        </View>
      </View>
    );
  }

  function renderActiveSection() {
    if (activeSection === 'reports') {
      return renderReports();
    }

    if (activeSection === 'stations') {
      return isManager ? renderStations() : renderOverview();
    }

    if (activeSection === 'tasks') {
      return renderTasks();
    }

    if (activeSection === 'team') {
      return isManager ? renderTeam() : renderOverview();
    }

    if (activeSection === 'audit') {
      return isManager ? renderAudit() : renderOverview();
    }

    return renderOverview();
  }

  if (!currentUser || !role) {
    return (
      <ScreenShell>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.centerContent}>
            <ThemedText type="title">{strings.actions.loading}</ThemedText>
          </View>
        </SafeAreaView>
      </ScreenShell>
    );
  }

  if (!isAdminUser) {
    return (
      <ScreenShell>
        <SafeAreaView style={styles.safeArea}>
          <ScrollView contentContainerStyle={styles.scrollContent} contentInsetAdjustmentBehavior="automatic" showsVerticalScrollIndicator={false}>
            <MobileTopBar leftIcon="arrow-left" leftLabel={strings.actions.back} onLeftPress={() => router.replace('/(tabs)')} title={strings.adminPortal.title} />
            <Card variant="warning">
              <StatusChip label={roleLabels[role]} tone="warning" />
              <ThemedText type="title">{strings.errors.accessDeniedTitle}</ThemedText>
              <ThemedText themeColor="textSecondary">{strings.adminPortal.technicianRedirect}</ThemedText>
              <PrimaryButton onPress={() => router.replace('/(tabs)')}>{strings.actions.back}</PrimaryButton>
            </Card>
          </ScrollView>
        </SafeAreaView>
      </ScreenShell>
    );
  }

  return (
    <ScreenShell>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.scrollContent} contentInsetAdjustmentBehavior="automatic" showsVerticalScrollIndicator={false}>
          <MobileTopBar
            leftIcon="menu"
            leftLabel={strings.actions.menu}
            onLeftPress={() => router.push('/(tabs)')}
            onRightPress={() => router.push('/(tabs)/settings')}
            rightIcon="settings"
            rightLabel={strings.tabs.settings}
            title={t.adminTools}
          />

          <Card>
            <View style={[styles.headerRow, { flexDirection: 'row' }]}>
              <StatusChip label={roleLabels[role]} tone="info" />
              <ThemedText selectable type="small" themeColor="textSecondary">
                {currentUser.profile.displayName}
              </ThemedText>
            </View>
            <ThemedText type="subtitle">{isManager ? strings.dashboard.managerTitle : strings.dashboard.supervisorTitle}</ThemedText>
            <ThemedText themeColor="textSecondary">{t.dashboardBody}</ThemedText>
            <PrimaryButton icon="check-cloud" loading={overviewLoading || reviews.loading || team.loading} onPress={() => void refreshAll()}>
              {strings.actions.syncNow}
            </PrimaryButton>
          </Card>

          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={[styles.sectionsRow, { flexDirection: 'row' }]}>
              {sections.map((section) => (
                <SectionPill
                  active={activeSection === section.id}
                  icon={section.icon}
                  key={section.id}
                  label={section.label}
                  onPress={() => setActiveSection(section.id)}
                />
              ))}
            </View>
          </ScrollView>

          {renderActiveSection()}
        </ScrollView>

        <BottomSheet
          onDismiss={() => {
            setSelectedReport(null);
            setReviewNotes('');
          }}
          title={selectedReport ? `${t.review}: ${selectedReport.stationLabel}` : undefined}
          visible={Boolean(selectedReport)}>
          {selectedReport ? (
            <View style={styles.sheetStack}>
              <ReportCard
                createdAt={selectedReport.submittedAt}
                notes={selectedReport.notes}
                reviewStatus={selectedReport.reviewStatus}
                stationId={selectedReport.stationId}
                stationLabel={`${selectedReport.stationLabel} · ${selectedReport.technicianName}`}
                status={selectedReport.status}
              />
              <InputField label={t.reviewNotes} multiline onChangeText={setReviewNotes} value={reviewNotes} />
              <View style={[styles.reviewActions, { flexDirection: 'row' }]}>
                <PrimaryButton
                  icon="check"
                  loading={reviewingReportId === selectedReport.reportId}
                  onPress={() => void updateReview(selectedReport, 'reviewed', reviewNotes)}>
                  {strings.adminPortal.reviewApprove}
                </PrimaryButton>
                <SecondaryButton
                  icon="alert-circle"
                  loading={reviewingReportId === selectedReport.reportId}
                  onPress={() => void updateReview(selectedReport, 'rejected', reviewNotes)}>
                  {strings.adminPortal.reviewReject}
                </SecondaryButton>
              </View>
            </View>
          ) : null}
        </BottomSheet>

        <BottomSheet
          onDismiss={() => setStationSheetVisible(false)}
          title={stationSheetMode === 'create' ? t.createStation : t.editStation}
          visible={stationSheetVisible}>
          <View style={styles.sheetStack}>
            <InputField label={strings.report.stationLabel} onChangeText={(value) => setStationForm((current) => ({ ...current, label: value }))} value={stationForm.label} />
            <InputField label={strings.scan.stationLocation} onChangeText={(value) => setStationForm((current) => ({ ...current, location: value }))} value={stationForm.location} />
            <InputField label={strings.scan.stationZone} onChangeText={(value) => setStationForm((current) => ({ ...current, zone: value }))} value={stationForm.zone} />
            <InputField label={strings.report.notesLabel} multiline onChangeText={(value) => setStationForm((current) => ({ ...current, description: value }))} value={stationForm.description} />
            <View style={[styles.coordinateRow, { flexDirection: 'row' }]}>
              <View style={styles.coordinateInput}>
                <InputField contentDirection="ltr" label="Lat" onChangeText={(value) => setStationForm((current) => ({ ...current, lat: value }))} value={stationForm.lat} />
              </View>
              <View style={styles.coordinateInput}>
                <InputField contentDirection="ltr" label="Lng" onChangeText={(value) => setStationForm((current) => ({ ...current, lng: value }))} value={stationForm.lng} />
              </View>
            </View>
            <Pressable
              accessibilityRole="checkbox"
              onPress={() => setStationForm((current) => ({ ...current, requiresImmediateSupervision: !current.requiresImmediateSupervision }))}
              style={[
                styles.checkboxRow,
                {
                  backgroundColor: stationForm.requiresImmediateSupervision ? theme.warningSoft : theme.backgroundElement,
                  borderColor: stationForm.requiresImmediateSupervision ? theme.warningStrong : theme.border,
                  flexDirection: 'row',
                },
              ]}>
              <EcoPestIcon color={stationForm.requiresImmediateSupervision ? theme.warningStrong : theme.textSecondary} name="alert-circle" size={22} />
              <ThemedText type="smallBold">{t.pendingReports}</ThemedText>
            </Pressable>
            <PrimaryButton icon="check" loading={savingStation} onPress={() => void submitStation()}>
              {stationSheetMode === 'create' ? t.createStation : t.saveChanges}
            </PrimaryButton>
          </View>
        </BottomSheet>

        <BottomSheet onDismiss={() => setUserCreateVisible(false)} title={t.createUser} visible={userCreateVisible}>
          <View style={styles.sheetStack}>
            <InputField label={strings.auth.account} onChangeText={(value) => setUserForm((current) => ({ ...current, displayName: value }))} value={userForm.displayName} />
            <InputField contentDirection="ltr" label={strings.auth.email} onChangeText={(value) => setUserForm((current) => ({ ...current, email: value }))} value={userForm.email} />
            <InputField contentDirection="ltr" label={t.accessCode} onChangeText={(value) => setUserForm((current) => ({ ...current, password: value }))} placeholder={t.accessCodePlaceholder} value={userForm.password} />
            <SecondaryButton icon="camera" onPress={async () => {
              const url = await pickAndUploadImage();
              if (url) setUserForm(c => ({ ...c, image: url }));
            }}>
              {userForm.image ? 'تم اختيار صورة' : 'إضافة صورة (اختياري)'}
            </SecondaryButton>
            <View style={[styles.filterRow, { flexDirection: 'row' }]}>
              {(['technician', 'supervisor', 'manager'] as const).map((nextRole) => (
                <FilterPill
                  active={userForm.role === nextRole}
                  key={nextRole}
                  label={roleLabels[nextRole]}
                  onPress={() => setUserForm((current) => ({ ...current, role: nextRole }))}
                />
              ))}
            </View>
            <PrimaryButton icon="user" loading={creatingUser} onPress={() => void submitUser()}>
              {t.createUser}
            </PrimaryButton>
          </View>
        </BottomSheet>

        <BottomSheet
          onDismiss={() => setSelectedUser(null)}
          title={selectedUser ? `${t.manageUser}: ${selectedUser.displayName}` : undefined}
          visible={Boolean(selectedUser)}>
          {selectedUser ? (
            <View style={styles.sheetStack}>
              <StatusChip label={selectedUser.isActive ? strings.team.activeStatus : strings.team.inactiveStatus} tone={selectedUser.isActive ? 'success' : 'neutral'} />
              <ThemedText selectable type="small" themeColor="textSecondary">
                {selectedUser.email}
              </ThemedText>
              <View style={[styles.filterRow, { flexDirection: 'row' }]}>
                {(['technician', 'supervisor', 'manager'] as const).map((nextRole) => (
                  <FilterPill
                    active={selectedUserRole === nextRole}
                    key={nextRole}
                    label={roleLabels[nextRole]}
                    onPress={() => setSelectedUserRole(nextRole)}
                  />
                ))}
              </View>
              <SecondaryButton
                disabled={selectedUser.uid === currentUser.profile.uid}
                icon="camera"
                loading={savingUserAction}
                onPress={async () => {
                  const url = await pickAndUploadImage(selectedUser.uid);
                  if (url) {
                     await patchSelectedUser({ image: url }, "تم تحديث الصورة بنجاح");
                  }
                }}>
                تحديث الصورة
              </SecondaryButton>
              <SecondaryButton
                disabled={selectedUser.uid === currentUser.profile.uid}
                icon="camera"
                loading={savingUserAction}
                onPress={async () => {
                  const url = await pickAndUploadImage(selectedUser.uid);
                  if (url) {
                     await patchSelectedUser({ image: url }, "تم تحديث الصورة بنجاح");
                  }
                }}>
                تحديث الصورة
              </SecondaryButton>
              <SecondaryButton
                disabled={selectedUser.uid === currentUser.profile.uid}
                icon="check"
                loading={savingUserAction}
                onPress={() => void patchSelectedUser({ role: selectedUserRole }, t.roleSaved)}>
                {t.roleSaved}
              </SecondaryButton>
              <InputField label="الاسم" onChangeText={setSelectedUserName} value={selectedUserName} />
              <SecondaryButton
                icon="edit"
                loading={savingUserAction}
                onPress={() => void patchSelectedUser({ displayName: selectedUserName }, "تم تحديث الاسم")}>
                تحديث الاسم
              </SecondaryButton>
              <InputField contentDirection="ltr" label={t.accessCode} onChangeText={setSelectedUserCode} placeholder={t.accessCodePlaceholder} value={selectedUserCode} />
              <SecondaryButton
                icon="key"
                loading={savingUserAction}
                onPress={() => void patchSelectedUser({ password: selectedUserCode }, t.codeSaved)}>
                {t.codeSaved}
              </SecondaryButton>
              <SecondaryButton
                disabled={selectedUser.uid === currentUser.profile.uid}
                icon={selectedUser.isActive ? 'alert-circle' : 'check'}
                loading={savingUserAction}
                onPress={() => void patchSelectedUser({ isActive: !selectedUser.isActive }, t.toggleSaved)}>
                {selectedUser.isActive ? strings.settings.disabled : strings.settings.enabled}
              </SecondaryButton>
            </View>
          ) : null}
        </BottomSheet>

        <BottomSheet
          onDismiss={() => setExportVisible(false)}
          title={t.exportReady}
          visible={exportVisible}>
          <View style={styles.sheetStack}>
            <ThemedText selectable type="code" style={styles.exportText}>
              {exportCsv}
            </ThemedText>
          </View>
        </BottomSheet>
      </SafeAreaView>
    </ScreenShell>
  );
}

function TaskGroup({
  onReview,
  reports,
  title,
}: {
  onReview: (report: MobileReviewReport) => void;
  reports: MobileReviewReport[];
  title: string;
}) {
  if (reports.length === 0) {
    return null;
  }

  return (
    <View style={styles.sectionStack}>
      <ThemedText type="title">{title}</ThemedText>
      {reports.map((report) => (
        <ReportCard
          action={
            <SecondaryButton icon="edit" onPress={() => onReview(report)}>
              مراجعة
            </SecondaryButton>
          }
          createdAt={report.submittedAt}
          key={report.reportId}
          notes={report.notes}
          reviewStatus={report.reviewStatus}
          stationId={report.stationId}
          stationLabel={`${report.stationLabel} · ${report.technicianName}`}
          status={report.status}
        />
      ))}
    </View>
  );
}

function StationTaskGroup({ stations, title }: { stations: Station[]; title: string }) {
  const { isRtl } = useLanguage();

  if (stations.length === 0) {
    return null;
  }

  return (
    <View style={styles.sectionStack}>
      <ThemedText type="title">{title}</ThemedText>
      {stations.map((station) => {
        const health = stationHealth(station);

        return (
          <Card key={station.stationId}>
            <View style={[styles.headerRow, { flexDirection: 'row' }]}>
              <View style={styles.summaryCopy}>
                <ThemedText type="smallBold">{station.label}</ThemedText>
                <ThemedText selectable type="small" themeColor="textSecondary">
                  #{station.stationId} · {station.location}
                </ThemedText>
              </View>
              <StatusChip label={health.label} tone={health.tone} />
            </View>
          </Card>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  analysisGrid: {
    gap: Spacing.md,
  },
  cardList: {
    gap: Spacing.md,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
  },
  checkboxRow: {
    alignItems: 'center',
    borderRadius: Radius.md,
    borderWidth: 1,
    gap: Spacing.sm,
    minHeight: TouchTarget,
    padding: Spacing.md,
  },
  coordinateInput: {
    flex: 1,
  },
  coordinateRow: {
    gap: Spacing.md,
  },
  dataRow: {
    alignItems: 'center',
    gap: Spacing.sm,
    justifyContent: 'space-between',
  },
  dataRowTitle: {
    flex: 1,
  },
  emptyCard: {
    borderRadius: Radius.lg,
    borderWidth: 1,
  },
  exportText: {
    lineHeight: 20,
  },
  filterPill: {
    alignItems: 'center',
    borderRadius: Radius.full,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 42,
    paddingHorizontal: Spacing.md,
  },
  filterRow: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  headerRow: {
    alignItems: 'flex-start',
    gap: Spacing.sm,
    justifyContent: 'space-between',
  },
  metaRow: {
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  metricCard: {
    alignItems: 'flex-start',
    borderRadius: Radius.lg,
    borderWidth: 1,
    flex: 1,
    gap: Spacing.md,
    minHeight: 112,
    minWidth: 142,
    padding: Spacing.lg,
  },
  metricCopy: {
    gap: Spacing.xs,
    width: '100%',
  },
  metricLabel: {
    textAlign: 'right',
  },
  metricValue: {
    fontFamily: Fonts.sansHeavy,
    fontSize: Typography.fontSize.xxl,
    textAlign: 'right',
  },
  metricsGrid: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  reportList: {
    gap: Spacing.md,
  },
  reviewActions: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  safeArea: {
    flex: 1,
    width: '100%',
  },
  scrollContent: {
    gap: Spacing.lg,
    paddingBottom: BottomTabInset + Spacing.xl,
  },
  sectionHeaderCopy: {
    flex: 1,
    gap: Spacing.xs,
  },
  sectionHeaderRow: {
    alignItems: 'center',
    gap: Spacing.md,
    justifyContent: 'space-between',
  },
  sectionPill: {
    alignItems: 'center',
    borderRadius: Radius.full,
    borderWidth: 1,
    gap: Spacing.xs,
    minHeight: 44,
    paddingHorizontal: Spacing.md,
  },
  sectionStack: {
    gap: Spacing.md,
  },
  sectionsRow: {
    flexDirection: 'row-reverse',
    gap: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  sheetStack: {
    gap: Spacing.md,
  },
  summaryCopy: {
    flex: 1,
    gap: Spacing.xs,
  },
});
