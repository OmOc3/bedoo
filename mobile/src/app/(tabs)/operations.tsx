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

function ShiftCard({ locale, shift }: { locale: string; shift: MobileTechnicianShift }) {
  const label = shift.status === 'active' ? 'شيفت مفتوح' : shift.earlyExit ? 'انصراف مبكر' : 'مكتمل';

  return (
    <Card>
      <View style={[styles.cardHeader, { flexDirection: 'row' }]}>
        <View style={styles.cardCopy}>
          <ThemedText type="title">{shift.startStationLabel ?? shift.technicianName}</ThemedText>
          <ThemedText selectable type="small" themeColor="textSecondary">
            {formatDate(shift.startedAt, locale, 'غير متاح')}
          </ThemedText>
        </View>
        <StatusChip label={label} tone={shiftStatusTone(shift)} />
      </View>
      {shift.endedAt ? (
        <ThemedText type="small" themeColor="textSecondary">
          الانتهاء: {formatDate(shift.endedAt, locale, 'غير متاح')} · {shift.totalMinutes ?? 0} دقيقة
        </ThemedText>
      ) : null}
      <View style={[styles.metaRow, { flexDirection: 'row' }]}>
        <StatusChip label={`الراتب: ${shift.salaryStatus}`} tone={shift.salaryStatus === 'paid' ? 'success' : 'neutral'} />
        {typeof shift.salaryAmount === 'number' ? <StatusChip label={`${shift.salaryAmount}`} tone="info" /> : null}
      </View>
    </Card>
  );
}

function DailyReportCard({ locale, report }: { locale: string; report: MobileDailyWorkReport }) {
  return (
    <Card>
      <View style={[styles.cardHeader, { flexDirection: 'row' }]}>
        <View style={styles.cardCopy}>
          <ThemedText type="title">{report.summary}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {formatDate(report.reportDate, locale, 'غير متاح')}
          </ThemedText>
        </View>
        <StatusChip label={`${report.stationIds.length} محطة`} tone="info" />
      </View>
      {report.stationLabels.length > 0 ? (
        <ThemedText type="small" themeColor="textSecondary">
          {report.stationLabels.join('، ')}
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
          fallbackErrorMessage: 'تعذر تحميل الشيفتات.',
          networkErrorMessage: 'تعذر الاتصال بالخادم لتحميل الشيفتات.',
        }),
        apiGet<MobileDailyWorkReport[]>('/api/mobile/daily-reports', {
          fallbackErrorMessage: 'تعذر تحميل التقارير اليومية.',
          networkErrorMessage: 'تعذر الاتصال بالخادم لتحميل التقارير اليومية.',
        }),
      ]);

      setOpenShift(shiftData.openShift);
      setShifts(shiftData.shifts);
      setDailyReports(reportData);
      setError(null);
    } catch (loadError: unknown) {
      setError(loadError instanceof Error ? loadError.message : 'تعذر تحميل بيانات التشغيل.');
    } finally {
      setLoading(false);
    }
  }, [canUseOperations]);

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
      throw new Error('اسمح للتطبيق بقراءة الموقع لتسجيل الشيفت.');
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
            fallbackErrorMessage: action === 'start' ? 'تعذر بدء الشيفت.' : 'تعذر إنهاء الشيفت.',
            networkErrorMessage: 'تعذر الاتصال بالخادم. سيتم الاحتفاظ بتقارير الفني في قائمة المزامنة إن وُجدت.',
          },
        );

        setOpenShift(result.shift.status === 'active' ? result.shift : null);
        await loadData();
        showToast(action === 'start' ? 'تم بدء الشيفت.' : 'تم إنهاء الشيفت.', 'success');
        await successHaptic();
      } catch (requestError: unknown) {
        if (isNetworkFailure(requestError)) {
          await enqueueShiftReplay(action, {
            accuracyMeters: location.accuracyMeters,
            lat: location.lat,
            lng: location.lng,
          });
          void refreshPendingCount();
          showToast('تم حفظ طلب الشيفت وسيتم الإرسال عند عودة الاتصال.', 'info');
          await warningHaptic();
          return;
        }

        throw requestError;
      }
    } catch (shiftError: unknown) {
      const message = shiftError instanceof Error ? shiftError.message : 'تعذر تحديث الشيفت.';
      showToast(message, 'error');
      await warningHaptic();
    } finally {
      setSavingShift(false);
    }
  }

  async function addDailyPhotos(): Promise<void> {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permissionResult.granted) {
      showToast('اسمح بالوصول إلى الصور لإرفاقها بالتقرير.', 'warning');
      await warningHaptic();
      return;
    }

    const remaining = MAX_DAILY_PHOTOS - dailyPhotos.length;

    if (remaining <= 0) {
      showToast(`يمكنك إرفاق حتى ${MAX_DAILY_PHOTOS} صور كحد أقصى.`, 'warning');
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
      showToast('اكتب ملخصاً لا يقل عن 10 أحرف.', 'warning');
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
          fallbackErrorMessage: 'تعذر حفظ التقرير اليومي.',
          networkErrorMessage: 'تعذر الاتصال بالخادم لحفظ التقرير اليومي.',
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
            fallbackErrorMessage: 'تعذر حفظ التقرير اليومي.',
            networkErrorMessage: 'تعذر الاتصال بالخادم لحفظ التقرير اليومي.',
          },
        );
      }

      setDailyForm(emptyDailyReportForm);
      setDailyPhotos([]);
      await loadData();
      showToast('تم حفظ التقرير اليومي.', 'success');
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
        showToast('تم حفظ التقرير في قائمة الإرسال عند عودة الاتصال.', 'info');
        await warningHaptic();
        return;
      }

      showToast(dailyError instanceof Error ? dailyError.message : 'تعذر حفظ التقرير اليومي.', 'error');
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
            title="تشغيل الفني"
          />

          <View style={[styles.heroCard, Shadow.sm, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
            <View style={[styles.cardHeader, { flexDirection: 'row' }]}>
              <View style={styles.cardCopy}>
                <ThemedText type="subtitle">الشيفت والحضور اليومي</ThemedText>
                <ThemedText themeColor="textSecondary">ابدأ الشيفت من موقع قريب من محطة، ثم أرسل التقارير اليومية من نفس بيانات الويب.</ThemedText>
              </View>
              {openShift ? <StatusChip label="شيفت مفتوح" tone="warning" /> : <StatusChip label="لا يوجد شيفت" tone="neutral" />}
            </View>
            <View style={[styles.actionsRow, { flexDirection: 'row' }]}>
              <PrimaryButton disabled={Boolean(openShift)} icon="login" loading={savingShift} onPress={() => void submitShift('start')}>
                بدء الشيفت
              </PrimaryButton>
              <SecondaryButton disabled={!openShift} icon="logout" loading={savingShift} onPress={() => void submitShift('end')}>
                إنهاء الشيفت
              </SecondaryButton>
            </View>
          </View>

          {loading ? <ActivityIndicator color={theme.primary} /> : null}
          {error ? <SyncBanner body={error} title="تعذر التحديث" tone="warning" /> : null}

          <Card>
            <ThemedText type="title">تقرير يومي</ThemedText>
            <InputField contentDirection="ltr" label="تاريخ التقرير" onChangeText={(value) => setDailyForm((current) => ({ ...current, reportDate: value }))} value={dailyForm.reportDate} />
            <InputField label="ملخص العمل" multiline onChangeText={(value) => setDailyForm((current) => ({ ...current, summary: value }))} value={dailyForm.summary} />
            <InputField
              contentDirection="ltr"
              label="أرقام المحطات"
              onChangeText={(value) => setDailyForm((current) => ({ ...current, stationIdsText: value }))}
              placeholder="مثال: 1001, 1002"
              value={dailyForm.stationIdsText}
            />
            <InputField label="ملاحظات" multiline onChangeText={(value) => setDailyForm((current) => ({ ...current, notes: value }))} value={dailyForm.notes} />

            <View style={styles.dailyPhotosSection}>
              <ThemedText type="smallBold">صور التقرير (اختياري)</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                حتى {MAX_DAILY_PHOTOS} صور — تُرفع مع التقرير كما في لوحة التحكم.
              </ThemedText>
              <SecondaryButton icon="camera" onPress={() => void addDailyPhotos()}>
                إضافة صور من المعرض
              </SecondaryButton>
              {dailyPhotos.length > 0 ? (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dailyPhotoRow}>
                  {dailyPhotos.map((photo, index) => (
                    <View key={`${photo.uri}-${index}`} style={styles.dailyPhotoTile}>
                      <Image contentFit="cover" source={{ uri: photo.uri }} style={styles.dailyPhotoImage} />
                      <Pressable
                        accessibilityLabel="إزالة الصورة"
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
              حفظ التقرير اليومي
            </PrimaryButton>
          </Card>

          <View style={styles.sectionStack}>
            <ThemedText type="title">آخر الشيفتات</ThemedText>
            {shifts.length === 0 && !loading ? <EmptyState subtitle="ستظهر الشيفتات بعد تسجيلها." title="لا توجد شيفتات" /> : null}
            {shifts.map((shift) => (
              <ShiftCard key={shift.shiftId} locale={locale} shift={shift} />
            ))}
          </View>

          <View style={styles.sectionStack}>
            <ThemedText type="title">التقارير اليومية</ThemedText>
            {dailyReports.length === 0 && !loading ? <EmptyState subtitle="ستظهر التقارير اليومية بعد الحفظ." title="لا توجد تقارير يومية" /> : null}
            {dailyReports.map((report) => (
              <DailyReportCard key={report.dailyReportId} locale={locale} report={report} />
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
