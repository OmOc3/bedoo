import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { Image } from 'expo-image';
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
import { errorHaptic, successHaptic, warningHaptic } from '@/lib/haptics';
import { languageDateLocales } from '@/lib/i18n';
import { enqueueDailyReplay, enqueueShiftReplay, isNetworkFailure } from '@/lib/operation-queue';
import { apiGet, apiPost } from '@/lib/sync/api-client';
import { useSyncActions } from '@/lib/sync/report-sync';
import type { MobileDailyWorkReport, MobileShiftListResponse, MobileShiftMutationResponse, MobileTechnicianShift } from '@/lib/sync/types';

interface DailyReportForm {
  notes: string;
  reportDate: string;
  stationIdsText: string;
  summary: string;
}

interface DailyPhotoAttachment {
  name: string;
  type: string;
  uri: string;
}

const MAX_DAILY_PHOTOS = 8;

const emptyDailyReportForm: DailyReportForm = {
  notes: '',
  reportDate: new Date().toISOString().slice(0, 10),
  stationIdsText: '',
  summary: '',
};

const operationsCopy = {
  ar: {
    addPhotos: 'إضافة صور من المعرض',
    dailyReport: 'تقرير يومي',
    dailyReports: 'التقارير اليومية',
    dailyReportSaved: 'تم حفظ التقرير اليومي.',
    dailyReportQueued: 'تم حفظ التقرير في قائمة الإرسال عند عودة الاتصال.',
    dailyPhotosHintPrefix: 'حتى',
    dailyPhotosHintSuffix: 'صور. ترفع مع التقرير كما في لوحة التحكم.',
    dailyPhotosTitle: 'صور التقرير (اختياري)',
    dateUnavailable: 'غير متاح',
    endShift: 'إنهاء الشيفت',
    endedAt: 'الانتهاء',
    earlyCheckout: 'انصراف مبكر',
    loadDailyReportsError: 'تعذر تحميل التقارير اليومية.',
    loadDailyReportsNetworkError: 'تعذر الاتصال بالخادم لتحميل التقارير اليومية.',
    loadOperationsError: 'تعذر تحميل بيانات التشغيل.',
    loadShiftsError: 'تعذر تحميل الشيفتات.',
    loadShiftsNetworkError: 'تعذر الاتصال بالخادم لتحميل الشيفتات.',
    maxPhotos: 'يمكنك إرفاق حتى {count} صور كحد أقصى.',
    minutes: 'دقيقة',
    noDailyReportsBody: 'ستظهر التقارير اليومية بعد الحفظ.',
    noDailyReportsTitle: 'لا توجد تقارير يومية',
    noOpenShift: 'لا يوجد شيفت',
    noShiftsBody: 'ستظهر الشيفتات بعد تسجيلها.',
    noShiftsTitle: 'لا توجد شيفتات',
    openShift: 'شيفت مفتوح',
    photoPermission: 'اسمح بالوصول إلى الصور لإرفاقها بالتقرير.',
    recentShifts: 'آخر الشيفتات',
    removePhoto: 'إزالة الصورة',
    reportDate: 'تاريخ التقرير',
    salary: 'الراتب',
    saveDailyReport: 'حفظ التقرير اليومي',
    saveDailyReportError: 'تعذر حفظ التقرير اليومي.',
    saveDailyReportNetworkError: 'تعذر الاتصال بالخادم لحفظ التقرير اليومي.',
    shiftCompleted: 'مكتمل',
    shiftLocationPermission: 'اسمح للتطبيق بقراءة الموقع لتسجيل الشيفت.',
    shiftOpen: 'شيفت مفتوح',
    shiftQueueSaved: 'تم حفظ طلب الشيفت وسيتم الإرسال عند عودة الاتصال.',
    shiftSaveError: 'تعذر تحديث الشيفت.',
    shiftStartError: 'تعذر بدء الشيفت.',
    shiftEndError: 'تعذر إنهاء الشيفت.',
    shiftNetworkError: 'تعذر الاتصال بالخادم. سيتم الاحتفاظ بتقارير الفني في قائمة المزامنة إن وجدت.',
    shiftStarted: 'تم بدء الشيفت.',
    shiftEnded: 'تم إنهاء الشيفت.',
    startShift: 'بدء الشيفت',
    stationIds: 'أرقام المحطات',
    stationIdsPlaceholder: 'مثال: 1001, 1002',
    stationCount: 'محطة',
    summaryMinLength: 'اكتب ملخصا لا يقل عن 10 أحرف.',
    summary: 'ملخص العمل',
    syncErrorTitle: 'تعذر التحديث',
    technicianOperations: 'تشغيل الفني',
    title: 'الشيفت والحضور اليومي',
    notes: 'ملاحظات',
    body: 'ابدأ الشيفت من موقع قريب من محطة، ثم أرسل التقارير اليومية من نفس بيانات الويب.',
  },
  en: {
    addPhotos: 'Add photos from gallery',
    dailyReport: 'Daily report',
    dailyReports: 'Daily reports',
    dailyReportSaved: 'Daily report saved.',
    dailyReportQueued: 'Daily report queued and will be sent when the connection returns.',
    dailyPhotosHintPrefix: 'Up to',
    dailyPhotosHintSuffix: 'photos. They upload with the report, like in the web dashboard.',
    dailyPhotosTitle: 'Report photos (optional)',
    dateUnavailable: 'Unavailable',
    endShift: 'End shift',
    endedAt: 'Ended',
    earlyCheckout: 'Early checkout',
    loadDailyReportsError: 'Could not load daily reports.',
    loadDailyReportsNetworkError: 'Could not reach the server to load daily reports.',
    loadOperationsError: 'Could not load operations data.',
    loadShiftsError: 'Could not load shifts.',
    loadShiftsNetworkError: 'Could not reach the server to load shifts.',
    maxPhotos: 'You can attach up to {count} photos.',
    minutes: 'minutes',
    noDailyReportsBody: 'Daily reports appear after they are saved.',
    noDailyReportsTitle: 'No daily reports',
    noOpenShift: 'No open shift',
    noShiftsBody: 'Shifts appear after you record them.',
    noShiftsTitle: 'No shifts',
    openShift: 'Open shift',
    photoPermission: 'Allow photo access to attach images to the report.',
    recentShifts: 'Recent shifts',
    removePhoto: 'Remove photo',
    reportDate: 'Report date',
    salary: 'Salary',
    saveDailyReport: 'Save daily report',
    saveDailyReportError: 'Could not save the daily report.',
    saveDailyReportNetworkError: 'Could not reach the server to save the daily report.',
    shiftCompleted: 'Completed',
    shiftLocationPermission: 'Allow location access to record the shift.',
    shiftOpen: 'Open shift',
    shiftQueueSaved: 'Shift request saved and will be sent when the connection returns.',
    shiftSaveError: 'Could not update the shift.',
    shiftStartError: 'Could not start the shift.',
    shiftEndError: 'Could not end the shift.',
    shiftNetworkError: 'Could not reach the server. Technician reports will stay in the sync queue when available.',
    shiftStarted: 'Shift started.',
    shiftEnded: 'Shift ended.',
    startShift: 'Start shift',
    stationIds: 'Station numbers',
    stationIdsPlaceholder: 'Example: 1001, 1002',
    stationCount: 'station',
    summaryMinLength: 'Write a summary of at least 10 characters.',
    summary: 'Work summary',
    syncErrorTitle: 'Could not refresh',
    technicianOperations: 'Technician operations',
    title: 'Shift and daily attendance',
    notes: 'Notes',
    body: 'Start the shift near a station, then submit daily reports using the same web data.',
  },
} as const;

type OperationsCopy = (typeof operationsCopy)[keyof typeof operationsCopy];

function parseStationIds(value: string): string[] {
  return value
    .split(/[\s,،]+/)
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
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

function shiftStatusTone(shift: MobileTechnicianShift): 'info' | 'success' | 'warning' {
  if (shift.status === 'active') {
    return 'warning';
  }

  return shift.earlyExit ? 'info' : 'success';
}

function ShiftCard({ locale, shift, text }: { locale: string; shift: MobileTechnicianShift; text: OperationsCopy }) {
  const label = shift.status === 'active' ? text.shiftOpen : shift.earlyExit ? text.earlyCheckout : text.shiftCompleted;

  return (
    <Card>
      <View style={[styles.cardHeader, { flexDirection: 'row' }]}>
        <View style={styles.cardCopy}>
          <ThemedText type="title">{shift.startStationLabel ?? shift.technicianName}</ThemedText>
          <ThemedText selectable type="small" themeColor="textSecondary">
            {formatDate(shift.startedAt, locale, text.dateUnavailable)}
          </ThemedText>
        </View>
        <StatusChip label={label} tone={shiftStatusTone(shift)} />
      </View>
      {shift.endedAt ? (
        <ThemedText type="small" themeColor="textSecondary">
          {text.endedAt}: {formatDate(shift.endedAt, locale, text.dateUnavailable)} · {shift.totalMinutes ?? 0} {text.minutes}
        </ThemedText>
      ) : null}
      <View style={[styles.metaRow, { flexDirection: 'row' }]}>
        <StatusChip label={`${text.salary}: ${shift.salaryStatus}`} tone={shift.salaryStatus === 'paid' ? 'success' : 'neutral'} />
        {typeof shift.salaryAmount === 'number' ? <StatusChip label={`${shift.salaryAmount}`} tone="info" /> : null}
      </View>
    </Card>
  );
}

function DailyReportCard({ locale, report, text }: { locale: string; report: MobileDailyWorkReport; text: OperationsCopy }) {
  return (
    <Card>
      <View style={[styles.cardHeader, { flexDirection: 'row' }]}>
        <View style={styles.cardCopy}>
          <ThemedText type="title">{report.summary}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {formatDate(report.reportDate, locale, text.dateUnavailable)}
          </ThemedText>
        </View>
        <StatusChip label={`${report.stationIds.length} ${text.stationCount}`} tone="info" />
      </View>
      {report.stationLabels.length > 0 ? (
        <ThemedText type="small" themeColor="textSecondary">
          {report.stationLabels.join(', ')}
        </ThemedText>
      ) : null}
      {report.notes ? (
        <ThemedText type="small" themeColor="textSecondary">
          {report.notes}
        </ThemedText>
      ) : null}
    </Card>
  );
}

export default function OperationsScreen() {
  const currentUser = useCurrentUser();
  const theme = useTheme();
  const { language, roleLabels, strings } = useLanguage();
  const { showToast } = useToast();
  const { refreshPendingCount, syncAllDrafts } = useSyncActions();
  const locale = languageDateLocales[language];
  const t = operationsCopy[language];
  const [openShift, setOpenShift] = useState<MobileTechnicianShift | null>(null);
  const [shifts, setShifts] = useState<MobileTechnicianShift[]>([]);
  const [dailyReports, setDailyReports] = useState<MobileDailyWorkReport[]>([]);
  const [dailyForm, setDailyForm] = useState<DailyReportForm>(emptyDailyReportForm);
  const [dailyPhotos, setDailyPhotos] = useState<DailyPhotoAttachment[]>([]);
  const [loading, setLoading] = useState(false);
  const [savingShift, setSavingShift] = useState(false);
  const [savingDaily, setSavingDaily] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const role = currentUser?.profile.role;
  const isTechnician = role === 'technician';
  const isManager = role === 'manager';
  const canUseOperations = isTechnician || isManager;
  const stationIds = useMemo(() => parseStationIds(dailyForm.stationIdsText), [dailyForm.stationIdsText]);

  const loadData = useCallback(async (): Promise<void> => {
    if (!canUseOperations) {
      return;
    }

    setLoading(true);

    try {
      const [shiftData, reportData] = await Promise.all([
        apiGet<MobileShiftListResponse>('/api/mobile/shifts', {
          fallbackErrorMessage: t.loadShiftsError,
          networkErrorMessage: t.loadShiftsNetworkError,
        }),
        apiGet<MobileDailyWorkReport[]>('/api/mobile/daily-reports', {
          fallbackErrorMessage: t.loadDailyReportsError,
          networkErrorMessage: t.loadDailyReportsNetworkError,
        }),
      ]);

      setOpenShift(shiftData.openShift);
      setShifts(shiftData.shifts);
      setDailyReports(reportData);
      setError(null);
    } catch (loadError: unknown) {
      setError(loadError instanceof Error ? loadError.message : t.loadOperationsError);
    } finally {
      setLoading(false);
    }
  }, [canUseOperations, t.loadDailyReportsError, t.loadDailyReportsNetworkError, t.loadOperationsError, t.loadShiftsError, t.loadShiftsNetworkError]);

  const syncQueueAndLoad = useCallback(async (): Promise<void> => {
    await syncAllDrafts();
    await loadData();
  }, [loadData, syncAllDrafts]);

  useFocusEffect(
    useCallback(() => {
      void loadData();
    }, [loadData]),
  );

  async function getCurrentLocation(): Promise<{ accuracyMeters?: number; lat: number; lng: number }> {
    const permission = await Location.requestForegroundPermissionsAsync();

    if (!permission.granted) {
      throw new Error(t.shiftLocationPermission);
    }

    const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Highest });

    return {
      accuracyMeters: typeof position.coords.accuracy === 'number' ? position.coords.accuracy : undefined,
      lat: position.coords.latitude,
      lng: position.coords.longitude,
    };
  }

  async function submitShift(action: 'end' | 'start'): Promise<void> {
    setSavingShift(true);

    try {
      const location = await getCurrentLocation();

      try {
        const result = await apiPost<MobileShiftMutationResponse, Record<string, unknown>>(
          '/api/mobile/shifts',
          {
            action,
            ...location,
          },
          {
            fallbackErrorMessage: action === 'start' ? t.shiftStartError : t.shiftEndError,
            networkErrorMessage: t.shiftNetworkError,
          },
        );

        setOpenShift(result.shift.status === 'active' ? result.shift : null);
        await loadData();
        showToast(action === 'start' ? t.shiftStarted : t.shiftEnded, 'success');
        await successHaptic();
      } catch (requestError: unknown) {
        if (isNetworkFailure(requestError)) {
          await enqueueShiftReplay(action, {
            accuracyMeters: location.accuracyMeters,
            lat: location.lat,
            lng: location.lng,
          });
          void refreshPendingCount();
          showToast(t.shiftQueueSaved, 'info');
          await warningHaptic();
          return;
        }

        throw requestError;
      }
    } catch (shiftError: unknown) {
      const message = shiftError instanceof Error ? shiftError.message : t.shiftSaveError;
      showToast(message, 'error');
      await warningHaptic();
    } finally {
      setSavingShift(false);
    }
  }

  async function addDailyPhotos(): Promise<void> {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permissionResult.granted) {
      showToast(t.photoPermission, 'warning');
      await warningHaptic();
      return;
    }

    const remaining = MAX_DAILY_PHOTOS - dailyPhotos.length;

    if (remaining <= 0) {
      showToast(t.maxPhotos.replace('{count}', String(MAX_DAILY_PHOTOS)), 'warning');
      await warningHaptic();
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      allowsMultipleSelection: true,
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.85,
      selectionLimit: remaining,
    });

    if (result.canceled || !result.assets?.length) {
      return;
    }

    const attachments: DailyPhotoAttachment[] = result.assets.map((asset, index) => {
      const fallbackName = `daily-${Date.now()}-${index}.jpg`;

      return {
        name: asset.fileName ?? fallbackName,
        type: asset.mimeType ?? 'image/jpeg',
        uri: asset.uri,
      };
    });

    setDailyPhotos((current) => [...current, ...attachments].slice(0, MAX_DAILY_PHOTOS));
  }

  function removeDailyPhoto(index: number): void {
    setDailyPhotos((current) => current.filter((_, itemIndex) => itemIndex !== index));
  }

  async function submitDailyReport(): Promise<void> {
    if (dailyForm.summary.trim().length < 10) {
      showToast(t.summaryMinLength, 'warning');
      await warningHaptic();
      return;
    }

    setSavingDaily(true);

    const notesTrimmed = dailyForm.notes.trim();
    const summaryTrimmed = dailyForm.summary.trim();

    try {
      if (dailyPhotos.length > 0) {
        const formData = new FormData();

        formData.append('reportDate', dailyForm.reportDate);
        formData.append('summary', summaryTrimmed);
        formData.append('stationIds', JSON.stringify(stationIds));

        if (notesTrimmed.length > 0) {
          formData.append('notes', notesTrimmed);
        }

        for (const photo of dailyPhotos) {
          formData.append('photos', {
            name: photo.name,
            type: photo.type,
            uri: photo.uri,
          } as unknown as Blob);
        }

        await apiPost<MobileDailyWorkReport, FormData>('/api/mobile/daily-reports', formData, {
          fallbackErrorMessage: t.saveDailyReportError,
          networkErrorMessage: t.saveDailyReportNetworkError,
        });
      } else {
        await apiPost<MobileDailyWorkReport, { notes?: string; reportDate: string; stationIds: string[]; summary: string }>(
          '/api/mobile/daily-reports',
          {
            notes: notesTrimmed || undefined,
            reportDate: dailyForm.reportDate,
            stationIds,
            summary: summaryTrimmed,
          },
          {
            fallbackErrorMessage: t.saveDailyReportError,
            networkErrorMessage: t.saveDailyReportNetworkError,
          },
        );
      }

      setDailyForm(emptyDailyReportForm);
      setDailyPhotos([]);
      await loadData();
      showToast(t.dailyReportSaved, 'success');
      await successHaptic();
    } catch (dailyError: unknown) {
      if (isNetworkFailure(dailyError)) {
        await enqueueDailyReplay({
          notes: notesTrimmed || undefined,
          photos: dailyPhotos.length > 0 ? dailyPhotos.map((photo) => ({ ...photo })) : undefined,
          reportDate: dailyForm.reportDate,
          stationIds,
          summary: summaryTrimmed,
        });
        void refreshPendingCount();
        showToast(t.dailyReportQueued, 'info');
        await warningHaptic();
        return;
      }

      showToast(dailyError instanceof Error ? dailyError.message : t.saveDailyReportError, 'error');
      await errorHaptic();
    } finally {
      setSavingDaily(false);
    }
  }

  if (currentUser && !canUseOperations) {
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
            onRightPress={() => void syncQueueAndLoad()}
            rightIcon="check-cloud"
            rightLabel={strings.actions.syncNow}
            title={t.technicianOperations}
          />

          <View style={[styles.heroCard, Shadow.sm, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
            <View style={[styles.cardHeader, { flexDirection: 'row' }]}>
              <View style={styles.cardCopy}>
                <ThemedText type="subtitle">{t.title}</ThemedText>
                <ThemedText themeColor="textSecondary">{t.body}</ThemedText>
              </View>
              {openShift ? <StatusChip label={t.openShift} tone="warning" /> : <StatusChip label={t.noOpenShift} tone="neutral" />}
            </View>
            <View style={[styles.actionsRow, { flexDirection: 'row' }]}>
              <PrimaryButton disabled={Boolean(openShift)} icon="login" loading={savingShift} onPress={() => void submitShift('start')}>
                {t.startShift}
              </PrimaryButton>
              <SecondaryButton disabled={!openShift} icon="logout" loading={savingShift} onPress={() => void submitShift('end')}>
                {t.endShift}
              </SecondaryButton>
            </View>
          </View>

          {loading ? <ActivityIndicator color={theme.primary} /> : null}
          {error ? <SyncBanner body={error} title={t.syncErrorTitle} tone="warning" /> : null}

          <Card>
            <ThemedText type="title">{t.dailyReport}</ThemedText>
            <InputField contentDirection="ltr" label={t.reportDate} onChangeText={(value) => setDailyForm((current) => ({ ...current, reportDate: value }))} value={dailyForm.reportDate} />
            <InputField label={t.summary} multiline onChangeText={(value) => setDailyForm((current) => ({ ...current, summary: value }))} value={dailyForm.summary} />
            <InputField
              contentDirection="ltr"
              label={t.stationIds}
              onChangeText={(value) => setDailyForm((current) => ({ ...current, stationIdsText: value }))}
              placeholder={t.stationIdsPlaceholder}
              value={dailyForm.stationIdsText}
            />
            <InputField label={t.notes} multiline onChangeText={(value) => setDailyForm((current) => ({ ...current, notes: value }))} value={dailyForm.notes} />

            <View style={styles.dailyPhotosSection}>
              <ThemedText type="smallBold">{t.dailyPhotosTitle}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {t.dailyPhotosHintPrefix} {MAX_DAILY_PHOTOS} {t.dailyPhotosHintSuffix}
              </ThemedText>
              <SecondaryButton icon="camera" onPress={() => void addDailyPhotos()}>
                {t.addPhotos}
              </SecondaryButton>
              {dailyPhotos.length > 0 ? (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dailyPhotoRow}>
                  {dailyPhotos.map((photo, index) => (
                    <View key={`${photo.uri}-${index}`} style={styles.dailyPhotoTile}>
                      <Image contentFit="cover" source={{ uri: photo.uri }} style={styles.dailyPhotoImage} />
                      <Pressable
                        accessibilityLabel={t.removePhoto}
                        onPress={() => removeDailyPhoto(index)}
                        style={({ pressed }) => [
                          styles.dailyPhotoRemove,
                          { backgroundColor: theme.danger, opacity: pressed ? 0.85 : 1 },
                        ]}>
                        <ThemedText style={{ color: theme.onPrimary }} type="smallBold">
                          ×
                        </ThemedText>
                      </Pressable>
                    </View>
                  ))}
                </ScrollView>
              ) : null}
            </View>

            <PrimaryButton icon="send" loading={savingDaily} onPress={() => void submitDailyReport()}>
              {t.saveDailyReport}
            </PrimaryButton>
          </Card>

          <View style={styles.sectionStack}>
            <ThemedText type="title">{t.recentShifts}</ThemedText>
            {shifts.length === 0 && !loading ? <EmptyState subtitle={t.noShiftsBody} title={t.noShiftsTitle} /> : null}
            {shifts.map((shift) => (
              <ShiftCard key={shift.shiftId} locale={locale} shift={shift} text={t} />
            ))}
          </View>

          <View style={styles.sectionStack}>
            <ThemedText type="title">{t.dailyReports}</ThemedText>
            {dailyReports.length === 0 && !loading ? <EmptyState subtitle={t.noDailyReportsBody} title={t.noDailyReportsTitle} /> : null}
            {dailyReports.map((report) => (
              <DailyReportCard key={report.dailyReportId} locale={locale} report={report} text={t} />
            ))}
          </View>
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
  heroCard: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    gap: Spacing.lg,
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
  sectionStack: {
    gap: Spacing.md,
  },
  dailyPhotoImage: {
    borderRadius: Radius.md,
    height: 88,
    width: 88,
  },
  dailyPhotoRemove: {
    alignItems: 'center',
    borderRadius: Radius.full,
    height: 28,
    justifyContent: 'center',
    position: 'absolute',
    right: 4,
    top: 4,
    width: 28,
  },
  dailyPhotoRow: {
    gap: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  dailyPhotoTile: {
    position: 'relative',
  },
  dailyPhotosSection: {
    gap: Spacing.sm,
  },
});
