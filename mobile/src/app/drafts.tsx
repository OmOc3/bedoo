import { useCallback, useState } from 'react';
import { Linking, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';

import { BrandHeader, Card, PrimaryButton, ScreenShell, SecondaryButton } from '@/components/bedoo-ui';
import { ThemedText } from '@/components/themed-text';
import { BottomTabInset, Spacing, WebBaseUrl } from '@/constants/theme';
import { StatusOptions } from '@/constants/status-options';
import { deleteDraft, getDrafts, saveDraft, type DraftReport } from '@/lib/drafts';
import { useTheme } from '@/hooks/use-theme';

const statusLabelByValue = new Map(StatusOptions.map((option) => [option.value, option.label]));

export default function DraftsScreen() {
  const [drafts, setDrafts] = useState<DraftReport[]>([]);
  const [notes, setNotes] = useState('');
  const [stationId, setStationId] = useState('');
  const [status, setStatus] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const theme = useTheme();

  const refreshDrafts = useCallback(async () => {
    setDrafts(await getDrafts());
  }, []);

  useFocusEffect(
    useCallback(() => {
      refreshDrafts();
    }, [refreshDrafts]),
  );

  async function createDraft() {
    const cleanStationId = stationId.trim();

    if (!cleanStationId) {
      setError('أدخل رقم المحطة.');
      return;
    }

    if (status.length === 0) {
      setError('اختر حالة واحدة على الأقل.');
      return;
    }

    await saveDraft({ notes: notes.trim(), stationId: cleanStationId, status });
    setError(null);
    setNotes('');
    setStationId('');
    setStatus([]);
    await refreshDrafts();
  }

  async function removeDraft(id: string) {
    await deleteDraft(id);
    await refreshDrafts();
  }

  function toggleStatus(value: string) {
    setStatus((current) => (current.includes(value) ? current.filter((item) => item !== value) : [...current, value]));
  }

  return (
    <ScreenShell>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <BrandHeader subtitle="مسودات محلية قبل فتح التقرير" />

          <Card>
            <ThemedText type="title">مسودة تقرير</ThemedText>
            <TextInput
              autoCapitalize="none"
              autoCorrect={false}
              onChangeText={setStationId}
              placeholder="رقم المحطة"
              placeholderTextColor={theme.textSecondary}
              style={[styles.input, { backgroundColor: theme.background, borderColor: theme.border, color: theme.text }]}
              value={stationId}
            />
            <View style={styles.statusGrid}>
              {StatusOptions.map((option) => (
                <SecondaryButton key={option.value} selected={status.includes(option.value)} onPress={() => toggleStatus(option.value)}>
                  {option.label}
                </SecondaryButton>
              ))}
            </View>
            <TextInput
              multiline
              onChangeText={setNotes}
              placeholder="ملاحظات"
              placeholderTextColor={theme.textSecondary}
              style={[styles.notes, { backgroundColor: theme.background, borderColor: theme.border, color: theme.text }]}
              textAlignVertical="top"
              value={notes}
            />
            {error ? <ThemedText style={{ color: theme.danger }}>{error}</ThemedText> : null}
            <PrimaryButton onPress={createDraft}>حفظ المسودة</PrimaryButton>
          </Card>

          {drafts.map((draft) => (
            <Card key={draft.id}>
              <ThemedText type="smallBold">محطة {draft.stationId}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {new Intl.DateTimeFormat('ar-EG', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(draft.createdAt))}
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {draft.status.map((item) => statusLabelByValue.get(item) ?? item).join('، ')}
              </ThemedText>
              {draft.notes ? <ThemedText>{draft.notes}</ThemedText> : null}
              <View style={styles.actions}>
                <SecondaryButton onPress={() => Linking.openURL(`${WebBaseUrl}/station/${encodeURIComponent(draft.stationId)}/report`)}>
                  فتح التقرير
                </SecondaryButton>
                <SecondaryButton onPress={() => removeDraft(draft.id)}>حذف</SecondaryButton>
              </View>
            </Card>
          ))}
        </ScrollView>
      </SafeAreaView>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  actions: {
    flexDirection: 'row-reverse',
    gap: Spacing.two,
  },
  input: {
    borderRadius: 14,
    borderWidth: 1,
    fontSize: 16,
    minHeight: 52,
    paddingHorizontal: Spacing.three,
    textAlign: 'left',
  },
  notes: {
    borderRadius: 14,
    borderWidth: 1,
    fontSize: 16,
    minHeight: 96,
    padding: Spacing.three,
    textAlign: 'right',
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
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
});
