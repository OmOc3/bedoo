import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  Card,
  EmptyState,
  InputField,
  MobileTopBar,
  PrimaryButton,
  ScreenShell,
  SecondaryButton,
  StatusChip,
  SyncBanner,
  useToast,
} from '@/components/ecopest-ui';
import { ThemedText } from '@/components/themed-text';
import { BottomTabInset, Radius, Shadow, Spacing } from '@/constants/theme';
import { useLanguage } from '@/contexts/language-context';
import { useTheme } from '@/hooks/use-theme';
import { useCurrentUser } from '@/lib/auth';
import { isMobileAdminRole } from '@/lib/auth-routes';
import { errorHaptic, successHaptic, warningHaptic } from '@/lib/haptics';
import { languageDateLocales } from '@/lib/i18n';
import { apiGet, apiPatch } from '@/lib/sync/api-client';
import type {
  MobileAppSettings,
  MobileAppUser,
  MobileClientDirectoryEntry,
  MobileDailyWorkReport,
  MobileShiftListResponse,
  MobileTechnicianShift,
  MobileTechnicianWorkSchedule,
} from '@/lib/sync/types';

type ManagementSection = 'settings' | 'schedules' | 'shifts' | 'daily' | 'clients';

interface SettingsForm {
  clientDailyStationOrderLimit: string;
  maintenanceEnabled: boolean;
  maintenanceMessage: string;
  supportEmail: string;
  supportHours: string;
  supportPhone: string;
}

interface ScheduleForm {
  expectedDurationMinutes: string;
  hourlyRate: string;
  notes: string;
  shiftEndTime: string;
  shiftStartTime: string;
  workDaysText: string;
}

const emptySettingsForm: SettingsForm = {
  clientDailyStationOrderLimit: '0',
  maintenanceEnabled: false,
  maintenanceMessage: '',
  supportEmail: '',
  supportHours: '',
  supportPhone: '',
};

const emptyScheduleForm: ScheduleForm = {
  expectedDurationMinutes: '540',
  hourlyRate: '',
  notes: '',
  shiftEndTime: '17:00',
  shiftStartTime: '08:00',
  workDaysText: '0,1,2,3,4',
};

const managementCopy = {
  ar: {
    active: 'نشط',
    clients: 'العملاء',
    clientsDirectory: 'دليل العملاء',
    completed: 'مكتمل',
    daily: 'اليومية',
    dailyReports: 'التقارير اليومية',
    dateUnavailable: 'غير متاح',
    earlyCheckout: 'انصراف مبكر',
    editSettingsError: 'تعذر حفظ الإعدادات.',
    editScheduleError: 'تعذر حفظ جدول الفني.',
    fullManagement: 'إدارة كاملة',
    heroManager: 'أدوات المدير',
    heroSupervisor: 'أدوات المشرف',
    heroBody: 'شاشات Native للخصائص التي كانت ناقصة من الموبايل: الشيفتات، اليومية، الإعدادات، والعملاء.',
    inactive: 'غير نشط',
    loadClientsError: 'تعذر تحميل العملاء.',
    loadDailyReportsError: 'تعذر تحميل التقارير اليومية.',
    loadManagementError: 'تعذر تحميل بيانات الإدارة.',
    loadScheduleError: 'تعذر تحميل جدول الفني.',
    loadSettingsError: 'تعذر تحميل الإعدادات.',
    loadShiftsError: 'تعذر تحميل الشيفتات.',
    loadTechniciansError: 'تعذر تحميل الفنيين.',
    maintenance: 'صيانة',
    maintenanceDisabled: 'إلغاء الصيانة',
    maintenanceEnabled: 'صيانة مفعلة',
    maintenanceMessage: 'رسالة الصيانة',
    maintenanceNormal: 'تشغيل عادي',
    maintenanceToggle: 'تفعيل الصيانة',
    manageSchedule: 'إدارة الجدول',
    minutes: 'دقيقة',
    noClientsBody: 'لا توجد حسابات عملاء.',
    noClientsTitle: 'لا توجد عملاء',
    noDailyReportsBody: 'لا توجد تقارير يومية.',
    noDailyReportsTitle: 'لا توجد تقارير',
    noScheduleBody: 'لا توجد حسابات فنيين متاحة.',
    noScheduleTitle: 'لا توجد جداول',
    noShiftsBody: 'لا توجد شيفتات مطابقة.',
    noShiftsTitle: 'لا توجد شيفتات',
    openOrders: 'مفتوحة',
    orders: 'طلبات',
    salary: 'الراتب',
    salaryPaid: 'مدفوع',
    salaryPending: 'معلق',
    salaryUnpaid: 'غير مدفوع',
    saveSchedule: 'حفظ جدول الفني',
    saveSettings: 'حفظ الإعدادات',
    scheduleCreated: 'سيتم إنشاء جدول جديد لهذا الفني.',
    scheduleDays: 'أيام',
    scheduleSaved: 'تم حفظ جدول الفني.',
    scheduleTitlePrefix: 'جدول',
    scheduleUpdatedPrefix: 'آخر تحديث:',
    schedules: 'جداول الفنيين',
    selectWorkDay: 'حدد يوم عمل واحد على الأقل.',
    settings: 'الإعدادات',
    settingsSaved: 'تم حفظ الإعدادات.',
    settingsTitle: 'إعدادات النظام',
    shiftDurationMinutes: 'مدة الشيفت بالدقائق',
    shiftEnd: 'نهاية الشيفت',
    shiftStart: 'بداية الشيفت',
    shifts: 'الشيفتات',
    shiftsAndPayroll: 'الشيفتات والرواتب',
    station: 'محطة',
    stations: 'محطات',
    supportEmail: 'بريد الدعم',
    supportHours: 'مواعيد الدعم',
    supportPhone: 'هاتف الدعم',
    syncErrorTitle: 'تعذر التحديث',
    updateSalaryError: 'تعذر تحديث الراتب.',
    updateSalarySaved: 'تم تحديث الراتب.',
    workDays: 'أيام العمل',
    hourlyRate: 'سعر الساعة',
    notes: 'ملاحظات',
    clientDailyLimit: 'حد طلبات العميل اليومي',
  },
  en: {
    active: 'Active',
    clients: 'Clients',
    clientsDirectory: 'Client directory',
    completed: 'Completed',
    daily: 'Daily',
    dailyReports: 'Daily reports',
    dateUnavailable: 'Unavailable',
    earlyCheckout: 'Early checkout',
    editSettingsError: 'Could not save settings.',
    editScheduleError: 'Could not save the technician schedule.',
    fullManagement: 'Management',
    heroManager: 'Manager tools',
    heroSupervisor: 'Supervisor tools',
    heroBody: 'Native screens for mobile management: shifts, daily reports, settings, and clients.',
    inactive: 'Inactive',
    loadClientsError: 'Could not load clients.',
    loadDailyReportsError: 'Could not load daily reports.',
    loadManagementError: 'Could not load management data.',
    loadScheduleError: 'Could not load the technician schedule.',
    loadSettingsError: 'Could not load settings.',
    loadShiftsError: 'Could not load shifts.',
    loadTechniciansError: 'Could not load technicians.',
    maintenance: 'Maintenance',
    maintenanceDisabled: 'Disable maintenance',
    maintenanceEnabled: 'Maintenance enabled',
    maintenanceMessage: 'Maintenance message',
    maintenanceNormal: 'Normal operation',
    maintenanceToggle: 'Enable maintenance',
    manageSchedule: 'Manage schedule',
    minutes: 'minutes',
    noClientsBody: 'No client accounts are available.',
    noClientsTitle: 'No clients',
    noDailyReportsBody: 'No daily reports are available.',
    noDailyReportsTitle: 'No reports',
    noScheduleBody: 'No technician accounts are available.',
    noScheduleTitle: 'No schedules',
    noShiftsBody: 'No matching shifts.',
    noShiftsTitle: 'No shifts',
    openOrders: 'Open',
    orders: 'Orders',
    salary: 'Salary',
    salaryPaid: 'Paid',
    salaryPending: 'Pending',
    salaryUnpaid: 'Unpaid',
    saveSchedule: 'Save technician schedule',
    saveSettings: 'Save settings',
    scheduleCreated: 'A new schedule will be created for this technician.',
    scheduleDays: 'days',
    scheduleSaved: 'Technician schedule saved.',
    scheduleTitlePrefix: 'Schedule',
    scheduleUpdatedPrefix: 'Last updated:',
    schedules: 'Technician schedules',
    selectWorkDay: 'Select at least one work day.',
    settings: 'Settings',
    settingsSaved: 'Settings saved.',
    settingsTitle: 'System settings',
    shiftDurationMinutes: 'Shift duration in minutes',
    shiftEnd: 'Shift end',
    shiftStart: 'Shift start',
    shifts: 'Shifts',
    shiftsAndPayroll: 'Shifts and payroll',
    station: 'station',
    stations: 'Stations',
    supportEmail: 'Support email',
    supportHours: 'Support hours',
    supportPhone: 'Support phone',
    syncErrorTitle: 'Could not refresh',
    updateSalaryError: 'Could not update salary.',
    updateSalarySaved: 'Salary updated.',
    workDays: 'Work days',
    hourlyRate: 'Hourly rate',
    notes: 'Notes',
    clientDailyLimit: 'Daily client order limit',
  },
} as const;

type ManagementCopy = (typeof managementCopy)[keyof typeof managementCopy];

function settingsFormFromResponse(settings: MobileAppSettings | null): SettingsForm {
  if (!settings) {
    return emptySettingsForm;
  }

  return {
    clientDailyStationOrderLimit: String(settings.clientDailyStationOrderLimit),
    maintenanceEnabled: settings.maintenanceEnabled,
    maintenanceMessage: settings.maintenanceMessage ?? '',
    supportEmail: settings.supportContact?.email ?? '',
    supportHours: settings.supportContact?.hours ?? '',
    supportPhone: settings.supportContact?.phone ?? '',
  };
}

function scheduleFormFromResponse(schedule: MobileTechnicianWorkSchedule | null): ScheduleForm {
  if (!schedule) {
    return emptyScheduleForm;
  }

  return {
    expectedDurationMinutes: String(schedule.expectedDurationMinutes),
    hourlyRate: typeof schedule.hourlyRate === 'number' ? String(schedule.hourlyRate) : '',
    notes: schedule.notes ?? '',
    shiftEndTime: schedule.shiftEndTime,
    shiftStartTime: schedule.shiftStartTime,
    workDaysText: schedule.workDays.join(','),
  };
}

function parseWorkDays(value: string): number[] {
  return Array.from(
    new Set(
      value
        .split(/[\s,،]+/)
        .map((item) => Number(item.trim()))
        .filter((item) => Number.isInteger(item) && item >= 0 && item <= 6),
    ),
  ).sort((first, second) => first - second);
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

function SectionPill({ active, label, onPress }: { active: boolean; label: string; onPress: () => void }) {
  const theme = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={[
        styles.sectionPill,
        {
          backgroundColor: active ? theme.primary : theme.backgroundElement,
          borderColor: active ? theme.primary : theme.border,
        },
      ]}>
      <ThemedText type="smallBold" style={{ color: active ? theme.onPrimary : theme.text }}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

function ShiftAdminCard({
  locale,
  onUpdateSalary,
  shift,
  text,
  updatingShiftId,
}: {
  locale: string;
  onUpdateSalary: (shift: MobileTechnicianShift, salaryStatus: 'paid' | 'pending' | 'unpaid') => void;
  shift: MobileTechnicianShift;
  text: ManagementCopy;
  updatingShiftId: string | null;
}) {
  const isUpdating = updatingShiftId === shift.shiftId;

  return (
    <Card>
      <View style={[styles.cardHeader, { flexDirection: 'row' }]}>
        <View style={styles.cardCopy}>
          <ThemedText type="title">{shift.technicianName}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
          {formatDate(shift.startedAt, locale, text.dateUnavailable)}
          </ThemedText>
        </View>
        <StatusChip label={shift.status === 'active' ? text.active : text.completed} tone={shift.status === 'active' ? 'warning' : 'success'} />
      </View>
      <View style={[styles.metaRow, { flexDirection: 'row' }]}>
        <StatusChip label={`${text.salary}: ${shift.salaryStatus}`} tone={shift.salaryStatus === 'paid' ? 'success' : 'neutral'} />
        {typeof shift.totalMinutes === 'number' ? <StatusChip label={`${shift.totalMinutes} ${text.minutes}`} tone="info" /> : null}
        {shift.earlyExit ? <StatusChip label={text.earlyCheckout} tone="warning" /> : null}
      </View>
      <View style={[styles.actionsRow, { flexDirection: 'row' }]}>
        <SecondaryButton loading={isUpdating} onPress={() => onUpdateSalary(shift, 'pending')} selected={shift.salaryStatus === 'pending'} stretch>
          {text.salaryPending}
        </SecondaryButton>
        <SecondaryButton loading={isUpdating} onPress={() => onUpdateSalary(shift, 'unpaid')} selected={shift.salaryStatus === 'unpaid'} stretch>
          {text.salaryUnpaid}
        </SecondaryButton>
        <SecondaryButton loading={isUpdating} onPress={() => onUpdateSalary(shift, 'paid')} selected={shift.salaryStatus === 'paid'} stretch>
          {text.salaryPaid}
        </SecondaryButton>
      </View>
    </Card>
  );
}

export default function ManagementScreen() {
  const currentUser = useCurrentUser();
  const theme = useTheme();
  const { language, roleLabels, strings } = useLanguage();
  const { showToast } = useToast();
  const locale = languageDateLocales[language];
  const t = managementCopy[language];
  const role = currentUser?.profile.role;
  const isAdmin = role ? isMobileAdminRole(role) : false;
  const isManager = role === 'manager';
  const [activeSection, setActiveSection] = useState<ManagementSection>('settings');
  const [settings, setSettings] = useState<MobileAppSettings | null>(null);
  const [settingsForm, setSettingsForm] = useState<SettingsForm>(emptySettingsForm);
  const [shifts, setShifts] = useState<MobileTechnicianShift[]>([]);
  const [dailyReports, setDailyReports] = useState<MobileDailyWorkReport[]>([]);
  const [clients, setClients] = useState<MobileClientDirectoryEntry[]>([]);
  const [technicians, setTechnicians] = useState<MobileAppUser[]>([]);
  const [selectedTechnicianUid, setSelectedTechnicianUid] = useState('');
  const [schedule, setSchedule] = useState<MobileTechnicianWorkSchedule | null>(null);
  const [scheduleForm, setScheduleForm] = useState<ScheduleForm>(emptyScheduleForm);
  const [loading, setLoading] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [savingSchedule, setSavingSchedule] = useState(false);
  const [scheduleLoading, setScheduleLoading] = useState(false);
  const [updatingShiftId, setUpdatingShiftId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const sections = useMemo(
    () =>
      [
        { id: 'settings' as const, label: t.settings, managerOnly: true },
        { id: 'schedules' as const, label: t.schedules, managerOnly: true },
        { id: 'shifts' as const, label: t.shifts, managerOnly: false },
        { id: 'daily' as const, label: t.daily, managerOnly: false },
        { id: 'clients' as const, label: t.clients, managerOnly: true },
      ].filter((section) => !section.managerOnly || isManager),
    [isManager, t.clients, t.daily, t.schedules, t.settings, t.shifts],
  );
  const resolvedActiveSection = sections.some((section) => section.id === activeSection)
    ? activeSection
    : sections[0]?.id ?? 'shifts';
  const selectedTechnician = useMemo(
    () => technicians.find((technician) => technician.uid === selectedTechnicianUid) ?? null,
    [selectedTechnicianUid, technicians],
  );

  const loadData = useCallback(async (): Promise<void> => {
    if (!isAdmin) {
      return;
    }

    setLoading(true);

    try {
      const [settingsData, shiftsData, dailyData, clientsData, usersData] = await Promise.all([
        apiGet<MobileAppSettings>('/api/mobile/settings', { fallbackErrorMessage: t.loadSettingsError }),
        apiGet<MobileShiftListResponse>('/api/mobile/shifts', { fallbackErrorMessage: t.loadShiftsError }),
        apiGet<MobileDailyWorkReport[]>('/api/mobile/daily-reports', { fallbackErrorMessage: t.loadDailyReportsError }),
        isManager
          ? apiGet<MobileClientDirectoryEntry[]>('/api/mobile/clients', { fallbackErrorMessage: t.loadClientsError })
          : Promise.resolve([]),
        isManager ? apiGet<MobileAppUser[]>('/api/mobile/users', { fallbackErrorMessage: t.loadTechniciansError }) : Promise.resolve([]),
      ]);

      setSettings(settingsData);
      setSettingsForm(settingsFormFromResponse(settingsData));
      setShifts(shiftsData.shifts);
      setDailyReports(dailyData);
      setClients(clientsData);
      setTechnicians(usersData.filter((user) => user.role === 'technician'));
      setError(null);
    } catch (loadError: unknown) {
      setError(loadError instanceof Error ? loadError.message : t.loadManagementError);
    } finally {
      setLoading(false);
    }
  }, [isAdmin, isManager, t.loadClientsError, t.loadDailyReportsError, t.loadManagementError, t.loadSettingsError, t.loadShiftsError, t.loadTechniciansError]);

  useFocusEffect(
    useCallback(() => {
      void loadData();
    }, [loadData]),
  );

  async function saveSettings(): Promise<void> {
    setSavingSettings(true);

    try {
      const nextSettings = await apiPatch<MobileAppSettings, Record<string, unknown>>(
        '/api/mobile/settings',
        {
          clientDailyStationOrderLimit: Number(settingsForm.clientDailyStationOrderLimit),
          maintenanceEnabled: settingsForm.maintenanceEnabled,
          maintenanceMessage: settingsForm.maintenanceMessage,
          supportEmail: settingsForm.supportEmail,
          supportHours: settingsForm.supportHours,
          supportPhone: settingsForm.supportPhone,
        },
        { fallbackErrorMessage: t.editSettingsError },
      );

      setSettings(nextSettings);
      setSettingsForm(settingsFormFromResponse(nextSettings));
      showToast(t.settingsSaved, 'success');
      await successHaptic();
    } catch (saveError: unknown) {
      showToast(saveError instanceof Error ? saveError.message : t.editSettingsError, 'error');
      await errorHaptic();
    } finally {
      setSavingSettings(false);
    }
  }

  async function openSchedule(technician: MobileAppUser): Promise<void> {
    setSelectedTechnicianUid(technician.uid);
    setScheduleLoading(true);

    try {
      const nextSchedule = await apiGet<MobileTechnicianWorkSchedule | null>(
        `/api/mobile/schedules/${encodeURIComponent(technician.uid)}`,
        { fallbackErrorMessage: t.loadScheduleError },
      );
      setSchedule(nextSchedule);
      setScheduleForm(scheduleFormFromResponse(nextSchedule));
    } catch (scheduleError: unknown) {
      showToast(scheduleError instanceof Error ? scheduleError.message : t.loadScheduleError, 'error');
      await errorHaptic();
    } finally {
      setScheduleLoading(false);
    }
  }

  async function saveSchedule(): Promise<void> {
    if (!selectedTechnicianUid) {
      await warningHaptic();
      return;
    }

    const workDays = parseWorkDays(scheduleForm.workDaysText);

    if (workDays.length === 0) {
      showToast(t.selectWorkDay, 'warning');
      await warningHaptic();
      return;
    }

    setSavingSchedule(true);

    try {
      const nextSchedule = await apiPatch<
        MobileTechnicianWorkSchedule,
        {
          expectedDurationMinutes: number;
          hourlyRate?: number;
          notes?: string;
          shiftEndTime: string;
          shiftStartTime: string;
          workDays: number[];
        }
      >(
        `/api/mobile/schedules/${encodeURIComponent(selectedTechnicianUid)}`,
        {
          expectedDurationMinutes: Number(scheduleForm.expectedDurationMinutes),
          hourlyRate: scheduleForm.hourlyRate.trim() ? Number(scheduleForm.hourlyRate) : undefined,
          notes: scheduleForm.notes.trim() || undefined,
          shiftEndTime: scheduleForm.shiftEndTime.trim(),
          shiftStartTime: scheduleForm.shiftStartTime.trim(),
          workDays,
        },
        { fallbackErrorMessage: t.editScheduleError },
      );
      setSchedule(nextSchedule);
      setScheduleForm(scheduleFormFromResponse(nextSchedule));
      showToast(t.scheduleSaved, 'success');
      await successHaptic();
    } catch (scheduleError: unknown) {
      showToast(scheduleError instanceof Error ? scheduleError.message : t.editScheduleError, 'error');
      await errorHaptic();
    } finally {
      setSavingSchedule(false);
    }
  }

  async function updateSalary(shift: MobileTechnicianShift, salaryStatus: 'paid' | 'pending' | 'unpaid'): Promise<void> {
    if (!isManager || shift.status !== 'completed') {
      await warningHaptic();
      return;
    }

    setUpdatingShiftId(shift.shiftId);

    try {
      await apiPatch<MobileTechnicianShift, Record<string, unknown>>(
        `/api/mobile/shifts/${encodeURIComponent(shift.shiftId)}`,
        {
          salaryAmount: salaryStatus === 'paid' ? (shift.salaryAmount ?? shift.baseSalary ?? 0) : undefined,
          salaryStatus,
        },
        { fallbackErrorMessage: t.updateSalaryError },
      );
      await loadData();
      showToast(t.updateSalarySaved, 'success');
      await successHaptic();
    } catch (salaryError: unknown) {
      showToast(salaryError instanceof Error ? salaryError.message : t.updateSalaryError, 'error');
      await errorHaptic();
    } finally {
      setUpdatingShiftId(null);
    }
  }

  function renderSettings() {
    if (!isManager) {
      return null;
    }

    return (
      <Card>
        <View style={[styles.cardHeader, { flexDirection: 'row' }]}>
          <View style={styles.cardCopy}>
            <ThemedText type="title">{t.settingsTitle}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {settings?.maintenanceEnabled ? t.maintenanceEnabled : t.maintenanceNormal}
            </ThemedText>
          </View>
          <StatusChip label={settingsForm.maintenanceEnabled ? t.maintenance : t.active} tone={settingsForm.maintenanceEnabled ? 'warning' : 'success'} />
        </View>
        <SecondaryButton
          icon="sliders"
          selected={settingsForm.maintenanceEnabled}
          onPress={() => setSettingsForm((current) => ({ ...current, maintenanceEnabled: !current.maintenanceEnabled }))}>
          {settingsForm.maintenanceEnabled ? t.maintenanceDisabled : t.maintenanceToggle}
        </SecondaryButton>
        <InputField label={t.maintenanceMessage} multiline onChangeText={(value) => setSettingsForm((current) => ({ ...current, maintenanceMessage: value }))} value={settingsForm.maintenanceMessage} />
        <InputField
          contentDirection="ltr"
          label={t.clientDailyLimit}
          onChangeText={(value) => setSettingsForm((current) => ({ ...current, clientDailyStationOrderLimit: value }))}
          value={settingsForm.clientDailyStationOrderLimit}
        />
        <InputField contentDirection="ltr" label={t.supportPhone} onChangeText={(value) => setSettingsForm((current) => ({ ...current, supportPhone: value }))} value={settingsForm.supportPhone} />
        <InputField contentDirection="ltr" label={t.supportEmail} onChangeText={(value) => setSettingsForm((current) => ({ ...current, supportEmail: value }))} value={settingsForm.supportEmail} />
        <InputField label={t.supportHours} onChangeText={(value) => setSettingsForm((current) => ({ ...current, supportHours: value }))} value={settingsForm.supportHours} />
        <PrimaryButton icon="check" loading={savingSettings} onPress={() => void saveSettings()}>
          {t.saveSettings}
        </PrimaryButton>
      </Card>
    );
  }

  function renderSchedules() {
    if (!isManager) {
      return null;
    }

    return (
      <View style={styles.sectionStack}>
        <ThemedText type="title">{t.schedules}</ThemedText>
        {technicians.length === 0 && !loading ? <EmptyState subtitle={t.noScheduleBody} title={t.noScheduleTitle} /> : null}
        {technicians.map((technician) => (
          <Card key={technician.uid}>
            <View style={[styles.cardHeader, { flexDirection: 'row' }]}>
              <View style={styles.cardCopy}>
                <ThemedText type="title">{technician.displayName}</ThemedText>
                <ThemedText selectable type="small" themeColor="textSecondary">
                  {technician.email}
                </ThemedText>
              </View>
              <StatusChip label={technician.isActive ? t.active : t.inactive} tone={technician.isActive ? 'success' : 'neutral'} />
            </View>
            <SecondaryButton
              icon="sliders"
              loading={scheduleLoading && selectedTechnicianUid === technician.uid}
              onPress={() => void openSchedule(technician)}
              selected={selectedTechnicianUid === technician.uid}>
              {t.manageSchedule}
            </SecondaryButton>
          </Card>
        ))}
        {selectedTechnician ? (
          <Card>
            <View style={[styles.cardHeader, { flexDirection: 'row' }]}>
              <View style={styles.cardCopy}>
                <ThemedText type="title">{t.scheduleTitlePrefix} {selectedTechnician.displayName}</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {schedule ? `${t.scheduleUpdatedPrefix} ${formatDate(schedule.updatedAt ?? schedule.createdAt, locale, t.dateUnavailable)}` : t.scheduleCreated}
                </ThemedText>
              </View>
              <StatusChip label={`${parseWorkDays(scheduleForm.workDaysText).length} ${t.scheduleDays}`} tone="info" />
            </View>
            <InputField
              contentDirection="ltr"
              label={t.workDays}
              onChangeText={(value) => setScheduleForm((current) => ({ ...current, workDaysText: value }))}
              placeholder="0,1,2,3,4"
              value={scheduleForm.workDaysText}
            />
            <View style={[styles.coordinateRow, { flexDirection: 'row' }]}>
              <View style={styles.coordinateInput}>
                <InputField
                  contentDirection="ltr"
                  label={t.shiftStart}
                  onChangeText={(value) => setScheduleForm((current) => ({ ...current, shiftStartTime: value }))}
                  value={scheduleForm.shiftStartTime}
                />
              </View>
              <View style={styles.coordinateInput}>
                <InputField
                  contentDirection="ltr"
                  label={t.shiftEnd}
                  onChangeText={(value) => setScheduleForm((current) => ({ ...current, shiftEndTime: value }))}
                  value={scheduleForm.shiftEndTime}
                />
              </View>
            </View>
            <InputField
              contentDirection="ltr"
              label={t.shiftDurationMinutes}
              onChangeText={(value) => setScheduleForm((current) => ({ ...current, expectedDurationMinutes: value }))}
              value={scheduleForm.expectedDurationMinutes}
            />
            <InputField
              contentDirection="ltr"
              label={t.hourlyRate}
              onChangeText={(value) => setScheduleForm((current) => ({ ...current, hourlyRate: value }))}
              value={scheduleForm.hourlyRate}
            />
            <InputField
              label={t.notes}
              multiline
              onChangeText={(value) => setScheduleForm((current) => ({ ...current, notes: value }))}
              value={scheduleForm.notes}
            />
            <PrimaryButton icon="check" loading={savingSchedule} onPress={() => void saveSchedule()}>
              {t.saveSchedule}
            </PrimaryButton>
          </Card>
        ) : null}
      </View>
    );
  }

  function renderShifts() {
    return (
      <View style={styles.sectionStack}>
        <ThemedText type="title">{t.shiftsAndPayroll}</ThemedText>
        {shifts.length === 0 && !loading ? <EmptyState subtitle={t.noShiftsBody} title={t.noShiftsTitle} /> : null}
        {shifts.map((shift) => (
          <ShiftAdminCard key={shift.shiftId} locale={locale} onUpdateSalary={(nextShift, status) => void updateSalary(nextShift, status)} shift={shift} text={t} updatingShiftId={updatingShiftId} />
        ))}
      </View>
    );
  }

  function renderDailyReports() {
    return (
      <View style={styles.sectionStack}>
        <ThemedText type="title">{t.dailyReports}</ThemedText>
        {dailyReports.length === 0 && !loading ? <EmptyState subtitle={t.noDailyReportsBody} title={t.noDailyReportsTitle} /> : null}
        {dailyReports.map((report) => (
          <Card key={report.dailyReportId}>
            <View style={[styles.cardHeader, { flexDirection: 'row' }]}>
              <View style={styles.cardCopy}>
                <ThemedText type="title">{report.summary}</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {report.technicianName} · {formatDate(report.reportDate, locale, t.dateUnavailable)}
                </ThemedText>
              </View>
              <StatusChip label={`${report.stationIds.length} ${t.station}`} tone="info" />
            </View>
          </Card>
        ))}
      </View>
    );
  }

  function renderClients() {
    if (!isManager) {
      return null;
    }

    return (
      <View style={styles.sectionStack}>
        <ThemedText type="title">{t.clientsDirectory}</ThemedText>
        {clients.length === 0 && !loading ? <EmptyState subtitle={t.noClientsBody} title={t.noClientsTitle} /> : null}
        {clients.map((entry) => (
          <Card key={entry.client.uid}>
            <View style={[styles.cardHeader, { flexDirection: 'row' }]}>
              <View style={styles.cardCopy}>
                <ThemedText type="title">{entry.client.displayName}</ThemedText>
                <ThemedText selectable type="small" themeColor="textSecondary">
                  {entry.client.email}
                </ThemedText>
              </View>
              <StatusChip label={entry.client.isActive ? t.active : t.inactive} tone={entry.client.isActive ? 'success' : 'neutral'} />
            </View>
            <View style={[styles.metaRow, { flexDirection: 'row' }]}>
              <StatusChip label={`${t.orders}: ${entry.totalOrders}`} tone="info" />
              <StatusChip label={`${t.stations}: ${entry.stationCount}`} tone="neutral" />
              <StatusChip label={`${t.openOrders}: ${entry.pendingOrders + entry.inProgressOrders}`} tone="warning" />
            </View>
          </Card>
        ))}
      </View>
    );
  }

  function renderActiveSection() {
    if (resolvedActiveSection === 'schedules') {
      return renderSchedules();
    }

    if (resolvedActiveSection === 'shifts') {
      return renderShifts();
    }

    if (resolvedActiveSection === 'daily') {
      return renderDailyReports();
    }

    if (resolvedActiveSection === 'clients') {
      return renderClients();
    }

    return renderSettings();
  }

  if (currentUser && !isAdmin) {
    return (
      <ScreenShell>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.centerContent}>
            <StatusChip label={role ? roleLabels[role] : ''} tone="warning" />
            <ThemedText type="title">{strings.errors.accessDeniedTitle}</ThemedText>
            <PrimaryButton onPress={() => router.replace('/(tabs)')}>{strings.actions.back}</PrimaryButton>
          </View>
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
            onRightPress={() => void loadData()}
            rightIcon="check-cloud"
            rightLabel={strings.actions.syncNow}
            title={t.fullManagement}
          />
          <View style={[styles.heroCard, Shadow.sm, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
            <ThemedText type="subtitle">{isManager ? t.heroManager : t.heroSupervisor}</ThemedText>
            <ThemedText themeColor="textSecondary">{t.heroBody}</ThemedText>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={[styles.sectionsRow, { flexDirection: 'row' }]}>
              {sections.map((section) => (
                <SectionPill active={resolvedActiveSection === section.id} key={section.id} label={section.label} onPress={() => setActiveSection(section.id)} />
              ))}
            </View>
          </ScrollView>
          {loading ? <ActivityIndicator color={theme.primary} /> : null}
          {error ? <SyncBanner body={error} title={t.syncErrorTitle} tone="warning" /> : null}
          {renderActiveSection()}
        </ScrollView>
      </SafeAreaView>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  actionsRow: {
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  cardCopy: {
    flex: 1,
    gap: Spacing.xs,
  },
  cardHeader: {
    alignItems: 'flex-start',
    gap: Spacing.md,
    justifyContent: 'space-between',
  },
  centerContent: {
    alignItems: 'center',
    flex: 1,
    gap: Spacing.md,
    justifyContent: 'center',
    padding: Spacing.lg,
  },
  coordinateInput: {
    flex: 1,
  },
  coordinateRow: {
    gap: Spacing.sm,
  },
  heroCard: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    gap: Spacing.sm,
    padding: Spacing.lg,
  },
  metaRow: {
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
  sectionPill: {
    alignItems: 'center',
    borderRadius: Radius.full,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 44,
    paddingHorizontal: Spacing.md,
  },
  sectionStack: {
    gap: Spacing.md,
  },
  sectionsRow: {
    gap: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
});
