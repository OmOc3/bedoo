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

function formatDate(value: string | undefined, locale: string, fallback = 'غير متاح'): string {
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
  updatingShiftId,
}: {
  locale: string;
  onUpdateSalary: (shift: MobileTechnicianShift, salaryStatus: 'paid' | 'pending' | 'unpaid') => void;
  shift: MobileTechnicianShift;
  updatingShiftId: string | null;
}) {
  const isUpdating = updatingShiftId === shift.shiftId;

  return (
    <Card>
      <View style={[styles.cardHeader, { flexDirection: 'row' }]}>
        <View style={styles.cardCopy}>
          <ThemedText type="title">{shift.technicianName}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {formatDate(shift.startedAt, locale)}
          </ThemedText>
        </View>
        <StatusChip label={shift.status === 'active' ? 'نشط' : 'مكتمل'} tone={shift.status === 'active' ? 'warning' : 'success'} />
      </View>
      <View style={[styles.metaRow, { flexDirection: 'row' }]}>
        <StatusChip label={`الراتب: ${shift.salaryStatus}`} tone={shift.salaryStatus === 'paid' ? 'success' : 'neutral'} />
        {typeof shift.totalMinutes === 'number' ? <StatusChip label={`${shift.totalMinutes} دقيقة`} tone="info" /> : null}
        {shift.earlyExit ? <StatusChip label="انصراف مبكر" tone="warning" /> : null}
      </View>
      <View style={[styles.actionsRow, { flexDirection: 'row' }]}>
        <SecondaryButton loading={isUpdating} onPress={() => onUpdateSalary(shift, 'pending')} selected={shift.salaryStatus === 'pending'} stretch>
          معلق
        </SecondaryButton>
        <SecondaryButton loading={isUpdating} onPress={() => onUpdateSalary(shift, 'unpaid')} selected={shift.salaryStatus === 'unpaid'} stretch>
          غير مدفوع
        </SecondaryButton>
        <SecondaryButton loading={isUpdating} onPress={() => onUpdateSalary(shift, 'paid')} selected={shift.salaryStatus === 'paid'} stretch>
          مدفوع
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
        { id: 'settings' as const, label: 'الإعدادات', managerOnly: true },
        { id: 'schedules' as const, label: 'جداول الفنيين', managerOnly: true },
        { id: 'shifts' as const, label: 'الشيفتات', managerOnly: false },
        { id: 'daily' as const, label: 'اليومية', managerOnly: false },
        { id: 'clients' as const, label: 'العملاء', managerOnly: true },
      ].filter((section) => !section.managerOnly || isManager),
    [isManager],
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
        apiGet<MobileAppSettings>('/api/mobile/settings', { fallbackErrorMessage: 'تعذر تحميل الإعدادات.' }),
        apiGet<MobileShiftListResponse>('/api/mobile/shifts', { fallbackErrorMessage: 'تعذر تحميل الشيفتات.' }),
        apiGet<MobileDailyWorkReport[]>('/api/mobile/daily-reports', { fallbackErrorMessage: 'تعذر تحميل التقارير اليومية.' }),
        isManager
          ? apiGet<MobileClientDirectoryEntry[]>('/api/mobile/clients', { fallbackErrorMessage: 'تعذر تحميل العملاء.' })
          : Promise.resolve([]),
        isManager ? apiGet<MobileAppUser[]>('/api/mobile/users', { fallbackErrorMessage: 'تعذر تحميل الفنيين.' }) : Promise.resolve([]),
      ]);

      setSettings(settingsData);
      setSettingsForm(settingsFormFromResponse(settingsData));
      setShifts(shiftsData.shifts);
      setDailyReports(dailyData);
      setClients(clientsData);
      setTechnicians(usersData.filter((user) => user.role === 'technician'));
      setError(null);
    } catch (loadError: unknown) {
      setError(loadError instanceof Error ? loadError.message : 'تعذر تحميل بيانات الإدارة.');
    } finally {
      setLoading(false);
    }
  }, [isAdmin, isManager]);

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
        { fallbackErrorMessage: 'تعذر حفظ الإعدادات.' },
      );

      setSettings(nextSettings);
      setSettingsForm(settingsFormFromResponse(nextSettings));
      showToast('تم حفظ الإعدادات.', 'success');
      await successHaptic();
    } catch (saveError: unknown) {
      showToast(saveError instanceof Error ? saveError.message : 'تعذر حفظ الإعدادات.', 'error');
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
        { fallbackErrorMessage: 'تعذر تحميل جدول الفني.' },
      );
      setSchedule(nextSchedule);
      setScheduleForm(scheduleFormFromResponse(nextSchedule));
    } catch (scheduleError: unknown) {
      showToast(scheduleError instanceof Error ? scheduleError.message : 'تعذر تحميل جدول الفني.', 'error');
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
      showToast('حدد يوم عمل واحد على الأقل.', 'warning');
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
        { fallbackErrorMessage: 'تعذر حفظ جدول الفني.' },
      );
      setSchedule(nextSchedule);
      setScheduleForm(scheduleFormFromResponse(nextSchedule));
      showToast('تم حفظ جدول الفني.', 'success');
      await successHaptic();
    } catch (scheduleError: unknown) {
      showToast(scheduleError instanceof Error ? scheduleError.message : 'تعذر حفظ جدول الفني.', 'error');
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
        { fallbackErrorMessage: 'تعذر تحديث الراتب.' },
      );
      await loadData();
      showToast('تم تحديث الراتب.', 'success');
      await successHaptic();
    } catch (salaryError: unknown) {
      showToast(salaryError instanceof Error ? salaryError.message : 'تعذر تحديث الراتب.', 'error');
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
            <ThemedText type="title">إعدادات النظام</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              الحالة الحالية: {settings?.maintenanceEnabled ? 'صيانة مفعلة' : 'تشغيل عادي'}
            </ThemedText>
          </View>
          <StatusChip label={settingsForm.maintenanceEnabled ? 'صيانة' : 'نشط'} tone={settingsForm.maintenanceEnabled ? 'warning' : 'success'} />
        </View>
        <SecondaryButton
          icon="sliders"
          selected={settingsForm.maintenanceEnabled}
          onPress={() => setSettingsForm((current) => ({ ...current, maintenanceEnabled: !current.maintenanceEnabled }))}>
          {settingsForm.maintenanceEnabled ? 'إلغاء الصيانة' : 'تفعيل الصيانة'}
        </SecondaryButton>
        <InputField label="رسالة الصيانة" multiline onChangeText={(value) => setSettingsForm((current) => ({ ...current, maintenanceMessage: value }))} value={settingsForm.maintenanceMessage} />
        <InputField
          contentDirection="ltr"
          label="حد طلبات العميل اليومي"
          onChangeText={(value) => setSettingsForm((current) => ({ ...current, clientDailyStationOrderLimit: value }))}
          value={settingsForm.clientDailyStationOrderLimit}
        />
        <InputField contentDirection="ltr" label="هاتف الدعم" onChangeText={(value) => setSettingsForm((current) => ({ ...current, supportPhone: value }))} value={settingsForm.supportPhone} />
        <InputField contentDirection="ltr" label="بريد الدعم" onChangeText={(value) => setSettingsForm((current) => ({ ...current, supportEmail: value }))} value={settingsForm.supportEmail} />
        <InputField label="مواعيد الدعم" onChangeText={(value) => setSettingsForm((current) => ({ ...current, supportHours: value }))} value={settingsForm.supportHours} />
        <PrimaryButton icon="check" loading={savingSettings} onPress={() => void saveSettings()}>
          حفظ الإعدادات
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
        <ThemedText type="title">جداول الفنيين</ThemedText>
        {technicians.length === 0 && !loading ? <EmptyState subtitle="لا توجد حسابات فنيين متاحة." title="لا توجد جداول" /> : null}
        {technicians.map((technician) => (
          <Card key={technician.uid}>
            <View style={[styles.cardHeader, { flexDirection: 'row' }]}>
              <View style={styles.cardCopy}>
                <ThemedText type="title">{technician.displayName}</ThemedText>
                <ThemedText selectable type="small" themeColor="textSecondary">
                  {technician.email}
                </ThemedText>
              </View>
              <StatusChip label={technician.isActive ? 'نشط' : 'غير نشط'} tone={technician.isActive ? 'success' : 'neutral'} />
            </View>
            <SecondaryButton
              icon="sliders"
              loading={scheduleLoading && selectedTechnicianUid === technician.uid}
              onPress={() => void openSchedule(technician)}
              selected={selectedTechnicianUid === technician.uid}>
              إدارة الجدول
            </SecondaryButton>
          </Card>
        ))}
        {selectedTechnician ? (
          <Card>
            <View style={[styles.cardHeader, { flexDirection: 'row' }]}>
              <View style={styles.cardCopy}>
                <ThemedText type="title">جدول {selectedTechnician.displayName}</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {schedule ? `آخر تحديث: ${formatDate(schedule.updatedAt ?? schedule.createdAt, locale)}` : 'سيتم إنشاء جدول جديد لهذا الفني.'}
                </ThemedText>
              </View>
              <StatusChip label={`${parseWorkDays(scheduleForm.workDaysText).length} أيام`} tone="info" />
            </View>
            <InputField
              contentDirection="ltr"
              label="أيام العمل"
              onChangeText={(value) => setScheduleForm((current) => ({ ...current, workDaysText: value }))}
              placeholder="0,1,2,3,4"
              value={scheduleForm.workDaysText}
            />
            <View style={[styles.coordinateRow, { flexDirection: 'row' }]}>
              <View style={styles.coordinateInput}>
                <InputField
                  contentDirection="ltr"
                  label="بداية الشيفت"
                  onChangeText={(value) => setScheduleForm((current) => ({ ...current, shiftStartTime: value }))}
                  value={scheduleForm.shiftStartTime}
                />
              </View>
              <View style={styles.coordinateInput}>
                <InputField
                  contentDirection="ltr"
                  label="نهاية الشيفت"
                  onChangeText={(value) => setScheduleForm((current) => ({ ...current, shiftEndTime: value }))}
                  value={scheduleForm.shiftEndTime}
                />
              </View>
            </View>
            <InputField
              contentDirection="ltr"
              label="مدة الشيفت بالدقائق"
              onChangeText={(value) => setScheduleForm((current) => ({ ...current, expectedDurationMinutes: value }))}
              value={scheduleForm.expectedDurationMinutes}
            />
            <InputField
              contentDirection="ltr"
              label="سعر الساعة"
              onChangeText={(value) => setScheduleForm((current) => ({ ...current, hourlyRate: value }))}
              value={scheduleForm.hourlyRate}
            />
            <InputField
              label="ملاحظات"
              multiline
              onChangeText={(value) => setScheduleForm((current) => ({ ...current, notes: value }))}
              value={scheduleForm.notes}
            />
            <PrimaryButton icon="check" loading={savingSchedule} onPress={() => void saveSchedule()}>
              حفظ جدول الفني
            </PrimaryButton>
          </Card>
        ) : null}
      </View>
    );
  }

  function renderShifts() {
    return (
      <View style={styles.sectionStack}>
        <ThemedText type="title">الشيفتات والرواتب</ThemedText>
        {shifts.length === 0 && !loading ? <EmptyState subtitle="لا توجد شيفتات مطابقة." title="لا توجد شيفتات" /> : null}
        {shifts.map((shift) => (
          <ShiftAdminCard key={shift.shiftId} locale={locale} onUpdateSalary={(nextShift, status) => void updateSalary(nextShift, status)} shift={shift} updatingShiftId={updatingShiftId} />
        ))}
      </View>
    );
  }

  function renderDailyReports() {
    return (
      <View style={styles.sectionStack}>
        <ThemedText type="title">التقارير اليومية</ThemedText>
        {dailyReports.length === 0 && !loading ? <EmptyState subtitle="لا توجد تقارير يومية." title="لا توجد تقارير" /> : null}
        {dailyReports.map((report) => (
          <Card key={report.dailyReportId}>
            <View style={[styles.cardHeader, { flexDirection: 'row' }]}>
              <View style={styles.cardCopy}>
                <ThemedText type="title">{report.summary}</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {report.technicianName} · {formatDate(report.reportDate, locale)}
                </ThemedText>
              </View>
              <StatusChip label={`${report.stationIds.length} محطة`} tone="info" />
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
        <ThemedText type="title">دليل العملاء</ThemedText>
        {clients.length === 0 && !loading ? <EmptyState subtitle="لا توجد حسابات عملاء." title="لا توجد عملاء" /> : null}
        {clients.map((entry) => (
          <Card key={entry.client.uid}>
            <View style={[styles.cardHeader, { flexDirection: 'row' }]}>
              <View style={styles.cardCopy}>
                <ThemedText type="title">{entry.client.displayName}</ThemedText>
                <ThemedText selectable type="small" themeColor="textSecondary">
                  {entry.client.email}
                </ThemedText>
              </View>
              <StatusChip label={entry.client.isActive ? 'نشط' : 'غير نشط'} tone={entry.client.isActive ? 'success' : 'neutral'} />
            </View>
            <View style={[styles.metaRow, { flexDirection: 'row' }]}>
              <StatusChip label={`طلبات: ${entry.totalOrders}`} tone="info" />
              <StatusChip label={`محطات: ${entry.stationCount}`} tone="neutral" />
              <StatusChip label={`مفتوحة: ${entry.pendingOrders + entry.inProgressOrders}`} tone="warning" />
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
            title="إدارة كاملة"
          />
          <View style={[styles.heroCard, Shadow.sm, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
            <ThemedText type="subtitle">{isManager ? 'أدوات المدير' : 'أدوات المشرف'}</ThemedText>
            <ThemedText themeColor="textSecondary">شاشات Native للخصائص التي كانت ناقصة من الموبايل: الشيفتات، اليومية، الإعدادات، والعملاء.</ThemedText>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={[styles.sectionsRow, { flexDirection: 'row' }]}>
              {sections.map((section) => (
                <SectionPill active={resolvedActiveSection === section.id} key={section.id} label={section.label} onPress={() => setActiveSection(section.id)} />
              ))}
            </View>
          </ScrollView>
          {loading ? <ActivityIndicator color={theme.primary} /> : null}
          {error ? <SyncBanner body={error} title="تعذر التحديث" tone="warning" /> : null}
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
