import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View, type AppStateStatus } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EcoPestIcon } from '@/components/icons';
import { InputField, MobileTopBar, PrimaryButton, ScreenShell, SecondaryButton, SyncBanner, useToast } from '@/components/ecopest-ui';
import { ThemedText } from '@/components/themed-text';
import { BottomTabInset, Radius, Shadow, Spacing, TouchTarget, Typography } from '@/constants/theme';
import { StatusOptions } from '@/constants/status-options';
import { useLanguage } from '@/contexts/language-context';
import { useStation } from '@/hooks/use-station';
import { useTheme } from '@/hooks/use-theme';
import { useCurrentUser } from '@/lib/auth';
import { clearWorkingDraft, getWorkingDraft, saveSubmittedReport, syncDraft, upsertWorkingDraft } from '@/lib/drafts';
import { errorHaptic, successHaptic, warningHaptic } from '@/lib/haptics';
import type { StatusOption } from '@/lib/sync/types';

function getParamValue(value: string | string[] | undefined): string {
  if (Array.isArray(value)) {
    return value[0] ?? '';
  }

  return value ?? '';
}

function StatusOptionRow({ label, onPress, selected }: { label: string; onPress: () => void; selected: boolean }) {
  const theme = useTheme();

  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.statusRow,
        {
          backgroundColor: selected ? theme.primarySoft : theme.backgroundElement,
          borderColor: selected ? theme.primaryLight : theme.border,
          opacity: pressed ? 0.82 : 1,
        },
      ]}>
      <View style={[styles.checkbox, { backgroundColor: selected ? theme.primary : theme.backgroundElement, borderColor: selected ? theme.primary : theme.border }]}>
        {selected ? <EcoPestIcon color={theme.onPrimary} name="check" size={18} /> : null}
      </View>
      <ThemedText type="smallBold" style={styles.statusLabel}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

function PhotoPlaceholder() {
  const theme = useTheme();

  return (
    <View style={[styles.photoBox, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
      <View style={[styles.photoIcon, { backgroundColor: theme.background }]}>
        <EcoPestIcon color={theme.textSecondary} name="camera" size={34} />
      </View>
      <ThemedText type="smallBold" style={{ color: theme.primary }}>
        إضافة صورة
      </ThemedText>
      <ThemedText type="small" themeColor="textSecondary" style={styles.photoHint}>
        التقط صورة للمحطة أو النشاط المكتشف...
      </ThemedText>
    </View>
  );
}

export default function StationReportScreen() {
  const params = useLocalSearchParams();
  const stationId = useMemo(() => decodeURIComponent(getParamValue(params.stationId)), [params.stationId]);
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState<StatusOption[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const { isRtl, statusOptionLabels, strings } = useLanguage();
  const { error: stationError, loading: stationLoading, station } = useStation(stationId);
  const theme = useTheme();
  const { showToast } = useToast();
  const currentUser = useCurrentUser();
  const isTechnician = currentUser?.profile.role === 'technician';
  const stationPhotoUrl = station?.photoUrls?.[0];
  const notesRef = useRef(notes);
  const statusRef = useRef(status);
  const lastAutoSavedSignature = useRef('');

  useEffect(() => {
    notesRef.current = notes;
    statusRef.current = status;
  }, [notes, status]);

  useEffect(() => {
    let isMounted = true;

    async function hydrateWorkingDraft(): Promise<void> {
      const draft = await getWorkingDraft(stationId);

      if (isMounted && draft) {
        setNotes(draft.notes);
        setStatus(draft.status);
        lastAutoSavedSignature.current = JSON.stringify({ notes: draft.notes, status: draft.status });
      }
    }

    void hydrateWorkingDraft();

    return () => {
      isMounted = false;
    };
  }, [stationId]);

  function toggleStatus(value: StatusOption): void {
    setStatus((current) => (current.includes(value) ? current.filter((item) => item !== value) : [...current, value]));
  }

  function validateDraft(): boolean {
    if (!stationId.trim()) {
      setError(strings.validation.stationIdRequired);
      void warningHaptic();
      return false;
    }

    if (notes.length > 500) {
      setError(strings.validation.notesTooLong);
      void warningHaptic();
      return false;
    }

    setError(null);
    return true;
  }

  function validateSubmit(): boolean {
    if (!validateDraft()) {
      return false;
    }

    if (!station) {
      setError(stationError ?? strings.report.stationUnavailable);
      void warningHaptic();
      return false;
    }

    if (!station.isActive) {
      setError(strings.report.inactiveStationHint);
      void warningHaptic();
      return false;
    }

    if (status.length === 0) {
      setError(strings.validation.statusRequired);
      void warningHaptic();
      return false;
    }

    return true;
  }

  const autoSaveWorkingDraft = useCallback(
    async (showFeedback: boolean): Promise<void> => {
      const cleanStationId = stationId.trim();
      const currentNotes = notesRef.current.trim();
      const currentStatus = statusRef.current;

      if (!cleanStationId || (currentNotes.length === 0 && currentStatus.length === 0)) {
        return;
      }

      const signature = JSON.stringify({ notes: currentNotes, status: currentStatus });

      if (signature === lastAutoSavedSignature.current) {
        return;
      }

      try {
        await upsertWorkingDraft({ notes: currentNotes, stationId: cleanStationId, status: currentStatus });
        lastAutoSavedSignature.current = signature;

        if (showFeedback) {
          showToast(strings.report.autoSaved, 'info');
        }
      } catch {
        showToast(strings.errors.unexpected, 'error');
        await errorHaptic();
      }
    },
    [showToast, stationId, strings.errors.unexpected, strings.report.autoSaved],
  );

  useEffect(() => {
    const interval = setInterval(() => {
      void autoSaveWorkingDraft(false);
    }, 30000);

    return () => clearInterval(interval);
  }, [autoSaveWorkingDraft]);

  useEffect(() => {
    function handleAppStateChange(nextState: AppStateStatus): void {
      if (nextState === 'background' || nextState === 'inactive') {
        void autoSaveWorkingDraft(false);
      }
    }

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription.remove();
    };
  }, [autoSaveWorkingDraft]);

  async function saveReportDraft(): Promise<void> {
    if (!validateDraft()) {
      return;
    }

    setIsSaving(true);

    try {
      await upsertWorkingDraft({ notes: notes.trim(), stationId: stationId.trim(), status });
      lastAutoSavedSignature.current = JSON.stringify({ notes: notes.trim(), status });
      showToast(strings.report.draftSaved, 'success');
      await successHaptic();
    } catch {
      setError(strings.errors.unexpected);
      showToast(strings.errors.unexpected, 'error');
      await errorHaptic();
    } finally {
      setIsSaving(false);
    }
  }

  async function submitReport(): Promise<void> {
    if (!validateSubmit()) {
      return;
    }

    setIsSaving(true);

    try {
      const queuedReport = await saveSubmittedReport({
        notes: notes.trim(),
        stationId: stationId.trim(),
        stationLabel: station?.label,
        status,
      });

      await clearWorkingDraft(stationId.trim());
      await syncDraft(queuedReport.id);
      showToast(strings.report.queued, 'success');
      await successHaptic();
      setNotes('');
      setStatus([]);
      router.push('/(tabs)/history');
    } catch {
      setError(strings.errors.unexpected);
      showToast(strings.errors.unexpected, 'error');
      await errorHaptic();
    } finally {
      setIsSaving(false);
    }
  }

  useEffect(() => {
    if (currentUser && !isTechnician) {
      showToast(strings.errors.accessDenied, 'error');
      void warningHaptic();
      router.replace('/(tabs)');
    }
  }, [currentUser, isTechnician, showToast, strings.errors.accessDenied]);

  if (currentUser && !isTechnician) {
    return (
      <ScreenShell>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.section}>
            <ThemedText type="title" style={styles.sectionTitle}>
              {strings.errors.accessDeniedTitle}
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {strings.errors.accessDenied}
            </ThemedText>
            <PrimaryButton onPress={() => router.replace('/(tabs)')}>{strings.actions.back}</PrimaryButton>
          </View>
        </SafeAreaView>
      </ScreenShell>
    );
  }

  return (
    <ScreenShell>
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.keyboardView}>
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            contentInsetAdjustmentBehavior="automatic"
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}>
            <MobileTopBar leftIcon="arrow-left" leftLabel={strings.actions.back} onLeftPress={() => router.back()} title="تقرير فحص" />

            <View style={[styles.stationCard, Shadow.sm, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
              {stationPhotoUrl ? (
                <Image
                  accessibilityLabel={`صورة المحطة ${station?.label ?? stationId}`}
                  resizeMode="cover"
                  source={{ uri: stationPhotoUrl }}
                  style={[styles.stationPhoto, { borderColor: theme.border }]}
                />
              ) : (
                <View style={[styles.stationIcon, { backgroundColor: theme.primarySoft }]}>
                  <EcoPestIcon color={theme.primary} name="target" size={32} />
                </View>
              )}
              <View style={styles.stationCopy}>
                <ThemedText type="title" style={styles.stationTitle}>
                  {station?.label ?? `محطة رقم: #${stationId || '-'}`}
                </ThemedText>
                <ThemedText type="smallBold" style={[styles.stationNumber, { color: theme.primary }]}>
                  رقم المحطة #{station?.stationId ?? stationId}
                </ThemedText>
                <View style={[styles.locationRow, { flexDirection: isRtl ? 'row-reverse' : 'row' }]}>
                  <EcoPestIcon color={theme.textSecondary} name="map-pin" size={18} />
                  <ThemedText type="small" themeColor="textSecondary">
                    {station?.location ?? stationError ?? 'الموقع غير متاح'}
                  </ThemedText>
                </View>
              </View>
            </View>

            {stationLoading ? <SyncBanner body={stationId} title={strings.report.stationLoading} tone="info" /> : null}

            {station?.isActive === false ? (
              <SyncBanner body={strings.report.inactiveStationHint} title={strings.report.stationInactive} tone="danger" />
            ) : null}

            {!stationLoading && !station && stationError ? (
              <SyncBanner body={stationError} title={strings.report.stationUnavailable} tone="warning" />
            ) : null}

            <View style={styles.section}>
              <ThemedText type="title" style={styles.sectionTitle}>
                حالة المحطة
              </ThemedText>
              <View style={styles.statusList}>
                {StatusOptions.map((option) => (
                  <StatusOptionRow
                    key={option.value}
                    label={statusOptionLabels[option.value]}
                    onPress={() => toggleStatus(option.value)}
                    selected={status.includes(option.value)}
                  />
                ))}
              </View>
            </View>

            <View style={styles.section}>
              <ThemedText type="title" style={styles.sectionTitle}>
                ملاحظات إضافية
              </ThemedText>
              <InputField
                label={strings.report.notesLabel}
                multiline
                onChangeText={setNotes}
                placeholder="أدخل أي ملاحظات حول حالة المحطة أو النشاط المكتشف..."
                style={styles.notes}
                value={notes}
              />
            </View>

            <View style={styles.section}>
              <ThemedText type="title" style={styles.sectionTitle}>
                التوثيق المرئي
              </ThemedText>
              <PhotoPlaceholder />
            </View>

            {error ? <ThemedText selectable style={{ color: theme.danger }}>{error}</ThemedText> : null}

            <View style={styles.actions}>
              <SecondaryButton disabled={isSaving} icon="clipboard-check" onPress={() => void saveReportDraft()} stretch>
                {strings.report.saveOffline}
              </SecondaryButton>
              <PrimaryButton disabled={isSaving} icon="send" loading={isSaving} onPress={() => void submitReport()}>
                {isSaving ? strings.actions.saving : strings.report.submit}
              </PrimaryButton>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  actions: {
    gap: Spacing.md,
    paddingTop: Spacing.sm,
  },
  checkbox: {
    alignItems: 'center',
    borderRadius: Radius.sm,
    borderWidth: 1,
    height: 34,
    justifyContent: 'center',
    width: 34,
  },
  keyboardView: {
    flex: 1,
  },
  locationRow: {
    alignItems: 'center',
    gap: Spacing.xs,
  },
  notes: {
    minHeight: 156,
  },
  photoBox: {
    alignItems: 'center',
    borderRadius: Radius.lg,
    borderStyle: 'dashed',
    borderWidth: 2,
    gap: Spacing.sm,
    minHeight: 188,
    justifyContent: 'center',
    padding: Spacing.lg,
  },
  photoHint: {
    textAlign: 'center',
  },
  photoIcon: {
    alignItems: 'center',
    borderRadius: Radius.full,
    height: 64,
    justifyContent: 'center',
    width: 64,
  },
  safeArea: {
    flex: 1,
    width: '100%',
  },
  scrollContent: {
    gap: Spacing.lg,
    paddingBottom: BottomTabInset + Spacing.xl,
  },
  section: {
    gap: Spacing.md,
  },
  sectionTitle: {
    fontSize: Typography.fontSize.lg,
  },
  stationCard: {
    alignItems: 'center',
    borderRadius: Radius.lg,
    borderWidth: 1,
    flexDirection: 'row-reverse',
    gap: Spacing.md,
    minHeight: 112,
    padding: Spacing.lg,
  },
  stationCopy: {
    flex: 1,
    gap: Spacing.sm,
  },
  stationIcon: {
    alignItems: 'center',
    borderRadius: Radius.full,
    height: 66,
    justifyContent: 'center',
    width: 66,
  },
  stationNumber: {
    textAlign: 'right',
  },
  stationPhoto: {
    borderRadius: Radius.md,
    borderWidth: 1,
    height: 74,
    width: 74,
  },
  stationTitle: {
    textAlign: 'right',
  },
  statusLabel: {
    flex: 1,
    fontSize: Typography.fontSize.md,
  },
  statusList: {
    gap: Spacing.md,
  },
  statusRow: {
    alignItems: 'center',
    borderRadius: Radius.lg,
    borderWidth: 1,
    flexDirection: 'row-reverse',
    gap: Spacing.md,
    minHeight: TouchTarget + 18,
    paddingHorizontal: Spacing.md,
  },
});
