import { useState } from 'react';
import { Linking, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BrandHeader, Card, PrimaryButton, ScreenShell, SecondaryButton } from '@/components/bedoo-ui';
import { ThemedText } from '@/components/themed-text';
import { BottomTabInset, Spacing, WebBaseUrl } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

function normalizeStationId(value: string): string {
  return value.trim().replace(/^\/+|\/+$/g, '');
}

export default function ScanScreen() {
  const [stationId, setStationId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const theme = useTheme();
  const normalizedStationId = normalizeStationId(stationId);

  function openReport() {
    if (!normalizedStationId) {
      setError('أدخل رقم المحطة أولًا.');
      return;
    }

    setError(null);
    Linking.openURL(`${WebBaseUrl}/station/${encodeURIComponent(normalizedStationId)}/report`);
  }

  return (
    <ScreenShell>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <BrandHeader subtitle="مسح QR أو إدخال رقم المحطة" />

          <Card>
            <ThemedText type="title">مسح محطة</ThemedText>
            <ThemedText themeColor="textSecondary">
              استخدم كاميرا الهاتف لمسح QR الموجود على المحطة. إذا لم يفتح الرابط تلقائيًا، أدخل رقم المحطة يدويًا.
            </ThemedText>
          </Card>

          <Card>
            <ThemedText type="smallBold">رقم المحطة</ThemedText>
            <TextInput
              autoCapitalize="none"
              autoCorrect={false}
              onChangeText={setStationId}
              placeholder="stationId"
              placeholderTextColor={theme.textSecondary}
              style={[
                styles.input,
                {
                  backgroundColor: theme.background,
                  borderColor: theme.border,
                  color: theme.text,
                },
              ]}
              value={stationId}
            />
            {error ? <ThemedText style={{ color: theme.danger }}>{error}</ThemedText> : null}
            <PrimaryButton onPress={openReport}>فتح نموذج التقرير</PrimaryButton>
          </Card>

          <View style={styles.actions}>
            <SecondaryButton onPress={() => Linking.openURL(`${WebBaseUrl}/scan`)}>
              صفحة المسح على الويب
            </SecondaryButton>
            <SecondaryButton onPress={() => Linking.openURL(`${WebBaseUrl}/login`)}>
              تسجيل الدخول
            </SecondaryButton>
          </View>
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
  safeArea: {
    flex: 1,
    width: '100%',
  },
  scrollContent: {
    gap: Spacing.three,
    paddingBottom: BottomTabInset + Spacing.four,
  },
});
