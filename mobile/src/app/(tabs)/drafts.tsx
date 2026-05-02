import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  Card,
  EmptyState,
  InputField,
  MobileTopBar,
  PrimaryButton,
  ReportCard,
  ScreenShell,
  SecondaryButton,
  StatusBadge,
  SyncBanner,
  useToast,
} from '@/components/ecopest-ui';
import { ThemedText } from '@/components/themed-text';
import { BottomTabInset, Spacing } from '@/constants/theme';
import { StatusOptions } from '@/constants/status-options';
import { useLanguage } from '@/contexts/language-context';
import { useTheme } from '@/hooks/use-theme';
import { deleteDraft, getDrafts, getSyncQueueReports, saveDraft, syncDraft, type DraftReport } from '@/lib/drafts';
import { errorHaptic, successHaptic, warningHaptic } from '@/lib/haptics';
import type { StatusOption } from '@/lib/sync/types';

export default function DraftsScreen() {
  const [drafts, setDrafts] = useState<DraftReport[]>([]);
  const [queueReports, setQueueReports] = useState<DraftReport[]>([]);
  const [notes, setNotes] = useState('');
  const [stationId, setStationId] = useState('');
  const [status, setStatus] = useState<StatusOption[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const { statusOptionLabels, strings } = useLanguage();
  const theme = useTheme();
  const { showToast } = useToast();
  const t = strings.drafts;

  const refreshDrafts = useCallback(async () => {
    const [nextDrafts, nextQueue] = await Promise.all([getDrafts(), getSyncQueueReports()]);

    setDrafts(nextDrafts);
    setQueueReports(nextQueue);
  }, []);

  useFocusEffect(
    useCallback(() => {
      void refreshDrafts();
    }, [refreshDrafts]),
  );

  function toggleStatus(value: StatusOption): void {
    setStatus((current) => (current.includes(value) ? current.filter((item) => item !== value) : [...current, value]));
  }

  async function createDraft(): Promise<void> {
    const cleanStationId = stationId.trim();

    if (!cleanStationId) {
      setError(strings.validation.stationIdRequired);
      await warningHaptic();
      return;
    }

    if (status.length === 0) {
      setError(strings.validation.statusRequired);
      await warningHaptic();
      return;
    }

    setIsSaving(true);

    try {
      await saveDraft({ notes: notes.trim(), stationId: cleanStationId, status });
      setError(null);
      setNotes('');
      setStationId('');
      setStatus([]);
      await refreshDrafts();
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

  async function removeDraft(id: string): Promise<void> {
    await deleteDraft(id);
    await refreshDrafts();
  }

  async function retrySync(id: string): Promise<void> {
    await syncDraft(id, strings.errors.syncDraft);
    await refreshDrafts();
  }

  return (
    <ScreenShell>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.scrollContent} contentInsetAdjustmentBehavior="automatic" showsVerticalScrollIndicator={false}>
          <MobileTopBar
            leftIcon="menu"
            leftLabel={strings.actions.menu}
            onLeftPress={() => router.push('/(tabs)')}
            rightIcon="settings"
            rightLabel={strings.tabs.settings}
            onRightPress={() => router.push('/(tabs)/settings')}
            title={strings.tabs.drafts}
          />

          <Card>
            <ThemedText type="title">{t.title}</ThemedText>
            <ThemedText themeColor="textSecondary">{t.subtitle}</ThemedText>
            <InputField
              autoCapitalize="none"
              autoCorrect={false}
              contentDirection="ltr"
              label={strings.report.stationLabel}
              onChangeText={setStationId}
              placeholder={t.stationPlaceholder}
              value={stationId}
            />
            <View style={[styles.statusGrid, { flexDirection: 'row' }]}>
              {StatusOptions.map((option) => (
                <SecondaryButton key={option.value} selected={status.includes(option.value)} onPress={() => toggleStatus(option.value)}>
                  {statusOptionLabels[option.value]}
                </SecondaryButton>
              ))}
            </View>
            {status.length > 0 ? (
              <View style={[styles.statusPreview, { flexDirection: 'row' }]}>
                {status.map((item) => (
                  <StatusBadge key={item} status={item} />
                ))}
              </View>
            ) : null}
            <InputField label={strings.report.notesLabel} multiline onChangeText={setNotes} placeholder={t.notesPlaceholder} value={notes} />
            {error ? <ThemedText selectable style={{ color: theme.danger }}>{error}</ThemedText> : null}
            <PrimaryButton disabled={isSaving} loading={isSaving} onPress={() => void createDraft()}>
              {strings.actions.saveDraft}
            </PrimaryButton>
          </Card>

          {queueReports.length > 0 ? (
            <SyncBanner
              body={`${queueReports.length} ${strings.history.draftReports}`}
              title={strings.report.syncPending}
              tone={queueReports.some((report) => report.syncStatus === 'failed') ? 'danger' : 'warning'}
            />
          ) : null}

          {queueReports.map((draft) => (
            <ReportCard
              action={
                <View style={[styles.actions, { flexDirection: 'row' }]}>
                  <SecondaryButton onPress={() => void retrySync(draft.id)}>{strings.actions.retry}</SecondaryButton>
                  <SecondaryButton onPress={() => void removeDraft(draft.id)}>{t.deleteDraft}</SecondaryButton>
                </View>
              }
              createdAt={draft.submittedAt ?? draft.createdAt}
              key={draft.id}
              notes={draft.lastError ?? draft.notes}
              stationId={draft.stationId}
              stationLabel={draft.stationLabel}
              status={draft.status}
              syncStatus={draft.syncStatus}
            />
          ))}

          {drafts.length === 0 && queueReports.length === 0 ? (
            <Card>
              <EmptyState subtitle={t.emptyBody} title={t.emptyTitle} />
            </Card>
          ) : null}

          {drafts.map((draft) => (
            <ReportCard
              action={
                <View style={[styles.actions, { flexDirection: 'row' }]}>
                  <SecondaryButton onPress={() => router.push({ pathname: '/report/[stationId]', params: { stationId: draft.stationId } })}>
                    {t.openReport}
                  </SecondaryButton>
                  <SecondaryButton onPress={() => void removeDraft(draft.id)}>{t.deleteDraft}</SecondaryButton>
                </View>
              }
              createdAt={draft.createdAt}
              key={draft.id}
              notes={draft.notes}
              stationId={draft.stationId}
              stationLabel={draft.stationLabel}
              status={draft.status}
              syncStatus={draft.syncStatus}
            />
          ))}
        </ScrollView>
      </SafeAreaView>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  actions: {
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  safeArea: {
    flex: 1,
    width: '100%',
  },
  scrollContent: {
    gap: Spacing.three,
    paddingBottom: BottomTabInset + Spacing.four,
  },
  statusGrid: {
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  statusPreview: {
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
});
