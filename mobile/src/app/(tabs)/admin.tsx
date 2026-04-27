import { useCallback, useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EmptyState, InputField, MobileTopBar, PrimaryButton, ScreenShell, SecondaryButton, StatusChip, useToast } from '@/components/ecopest-ui';
import { ThemedText } from '@/components/themed-text';
import { BottomTabInset, Radius, Shadow, Spacing } from '@/constants/theme';
import { useLanguage } from '@/contexts/language-context';
import { useTheme } from '@/hooks/use-theme';
import { useCurrentUser } from '@/lib/auth';
import { apiGet, apiRequest } from '@/lib/sync/api-client';
import type { MobileReviewReport } from '@/lib/sync/types';

interface CreateStationResponse {
  label: string;
  qrCodeValue: string;
  stationId: string;
}

export default function AdminScreen() {
  const currentUser = useCurrentUser();
  const { strings, statusOptionLabels } = useLanguage();
  const theme = useTheme();
  const { showToast } = useToast();
  const role = currentUser?.profile.role;
  const canCreateStation = role === 'manager';
  const canReviewReports = role === 'manager' || role === 'supervisor';
  const isBlocked = !canCreateStation && !canReviewReports;

  const [label, setLabel] = useState('');
  const [location, setLocation] = useState('');
  const [zone, setZone] = useState('');
  const [description, setDescription] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [reviewReports, setReviewReports] = useState<MobileReviewReport[]>([]);
  const [isLoadingReports, setIsLoadingReports] = useState(false);
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});
  const [submittingReview, setSubmittingReview] = useState<string | null>(null);

  async function createStation(): Promise<void> {
    if (!canCreateStation) {
      showToast(strings.errors.accessDenied, 'error');
      return;
    }

    setIsCreating(true);
    try {
      const result = await apiRequest<CreateStationResponse, { description?: string; label: string; location: string; zone?: string }>(
        '/api/mobile/stations',
        {
          method: 'POST',
          body: {
            label: label.trim(),
            location: location.trim(),
            ...(description.trim() ? { description: description.trim() } : {}),
            ...(zone.trim() ? { zone: zone.trim() } : {}),
          },
        },
      );

      showToast(`تم إنشاء محطة #${result.stationId}`, 'success');
      setLabel('');
      setLocation('');
      setZone('');
      setDescription('');

      if (canReviewReports) {
        void loadReviewReports();
      }
    } catch (error: unknown) {
      showToast(error instanceof Error ? error.message : strings.errors.unexpected, 'error');
    } finally {
      setIsCreating(false);
    }
  }

  const loadReviewReports = useCallback(async (): Promise<void> => {
    if (!canReviewReports) {
      setReviewReports([]);
      return;
    }

    setIsLoadingReports(true);
    try {
      const reports = await apiGet<MobileReviewReport[]>('/api/mobile/reports/review?reviewStatus=pending');
      setReviewReports(reports);
    } catch (error: unknown) {
      showToast(error instanceof Error ? error.message : strings.errors.unexpected, 'error');
    } finally {
      setIsLoadingReports(false);
    }
  }, [canReviewReports, showToast, strings.errors.unexpected]);

  async function submitReview(reportId: string, reviewStatus: 'reviewed' | 'rejected'): Promise<void> {
    if (!canReviewReports) {
      showToast(strings.errors.accessDenied, 'error');
      return;
    }

    setSubmittingReview(reportId);
    try {
      await apiRequest<{ success: boolean }, { reviewNotes?: string; reviewStatus: 'pending' | 'reviewed' | 'rejected' }>(
        `/api/mobile/reports/${reportId}/review`,
        {
          method: 'PATCH',
          body: {
            reviewStatus,
            reviewNotes: reviewNotes[reportId]?.trim() || undefined,
          },
        },
      );

      setReviewNotes((current) => {
        const next = { ...current };
        delete next[reportId];
        return next;
      });

      showToast(reviewStatus === 'reviewed' ? 'تم اعتماد التقرير.' : 'تم رفض التقرير.', 'success');
      await loadReviewReports();
    } catch (error: unknown) {
      showToast(error instanceof Error ? error.message : strings.errors.unexpected, 'error');
    } finally {
      setSubmittingReview(null);
    }
  }

  const pendingCount = useMemo(() => reviewReports.filter((item) => item.reviewStatus === 'pending').length, [reviewReports]);

  useEffect(() => {
    if (!canReviewReports) {
      return;
    }

    void loadReviewReports();
  }, [canReviewReports, loadReviewReports]);

  return (
    <ScreenShell>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.scrollContent} contentInsetAdjustmentBehavior="automatic" showsVerticalScrollIndicator={false}>
          <MobileTopBar title="إدارة الموبايل" />

          {isBlocked ? (
            <View style={[styles.blockedCard, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
              <ThemedText type="title">{strings.errors.accessDeniedTitle}</ThemedText>
              <ThemedText themeColor="textSecondary">{strings.errors.accessDenied}</ThemedText>
            </View>
          ) : (
            <>
              {canCreateStation ? (
                <View style={[styles.card, Shadow.sm, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
                  <ThemedText type="title">إنشاء محطة جديدة</ThemedText>
                  <InputField label="اسم المحطة" onChangeText={setLabel} value={label} />
                  <InputField label="الموقع" onChangeText={setLocation} value={location} />
                  <InputField label="النطاق" onChangeText={setZone} value={zone} />
                  <InputField label="الوصف" multiline onChangeText={setDescription} value={description} />
                  <PrimaryButton disabled={isCreating} loading={isCreating} onPress={() => void createStation()}>
                    إنشاء المحطة
                  </PrimaryButton>
                </View>
              ) : null}

              {canReviewReports ? (
                <View style={[styles.card, Shadow.sm, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
                  <View style={styles.headerRow}>
                    <ThemedText type="title">اعتماد التقارير</ThemedText>
                    <StatusChip label={`بانتظار: ${pendingCount}`} tone="warning" />
                  </View>
                  <SecondaryButton onPress={() => void loadReviewReports()}>
                    {isLoadingReports ? 'جاري التحميل...' : 'تحديث التقارير'}
                  </SecondaryButton>

                  {!isLoadingReports && reviewReports.length === 0 ? (
                    <View style={[styles.emptyCard, { borderColor: theme.border }]}>
                      <EmptyState subtitle="لا توجد تقارير بانتظار المراجعة الآن." title="لا توجد مهام اعتماد" />
                    </View>
                  ) : null}

                  {reviewReports.map((report) => (
                    <View key={report.reportId} style={[styles.reportCard, { borderColor: theme.border }]}>
                      <ThemedText type="smallBold">{report.stationLabel}</ThemedText>
                      <ThemedText type="small" themeColor="textSecondary">
                        {report.technicianName} - #{report.stationId}
                      </ThemedText>
                      <View style={styles.statusWrap}>
                        {report.status.map((item) => (
                          <StatusChip key={`${report.reportId}-${item}`} label={statusOptionLabels[item]} tone="info" />
                        ))}
                      </View>
                      <ThemedText type="small" themeColor="textSecondary">
                        {report.notes ?? 'لا توجد ملاحظات.'}
                      </ThemedText>
                      <InputField
                        label="ملاحظات المراجعة"
                        multiline
                        onChangeText={(value) => setReviewNotes((current) => ({ ...current, [report.reportId]: value }))}
                        value={reviewNotes[report.reportId] ?? ''}
                      />
                      <View style={styles.actionsRow}>
                        <SecondaryButton
                          disabled={submittingReview === report.reportId}
                          onPress={() => void submitReview(report.reportId, 'rejected')}>
                          رفض
                        </SecondaryButton>
                        <PrimaryButton
                          disabled={submittingReview === report.reportId}
                          loading={submittingReview === report.reportId}
                          onPress={() => void submitReview(report.reportId, 'reviewed')}>
                          اعتماد
                        </PrimaryButton>
                      </View>
                    </View>
                  ))}
                </View>
              ) : null}
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  actionsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  blockedCard: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    gap: Spacing.sm,
    padding: Spacing.lg,
  },
  card: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    gap: Spacing.md,
    padding: Spacing.lg,
  },
  emptyCard: {
    borderRadius: Radius.md,
    borderWidth: 1,
  },
  headerRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  reportCard: {
    borderRadius: Radius.md,
    borderWidth: 1,
    gap: Spacing.sm,
    padding: Spacing.md,
  },
  safeArea: {
    flex: 1,
    width: '100%',
  },
  scrollContent: {
    gap: Spacing.lg,
    paddingBottom: BottomTabInset + Spacing.xl,
  },
  statusWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
});
