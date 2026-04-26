import { Linking, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BrandHeader, Card, ScreenShell, SecondaryButton } from '@/components/bedoo-ui';
import { ThemedText } from '@/components/themed-text';
import { BottomTabInset, Spacing, WebBaseUrl } from '@/constants/theme';
import { type ThemeMode, useThemeMode } from '@/contexts/theme-context';

const modes: { label: string; value: ThemeMode }[] = [
  { label: 'النظام', value: 'system' },
  { label: 'فاتح', value: 'light' },
  { label: 'داكن', value: 'dark' },
];

export default function SettingsScreen() {
  const { mode, resolvedTheme, setMode } = useThemeMode();

  return (
    <ScreenShell>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <BrandHeader subtitle="إعدادات التطبيق الميداني" />

          <Card>
            <ThemedText type="title">المظهر</ThemedText>
            <ThemedText themeColor="textSecondary">
              الوضع الحالي: {resolvedTheme === 'dark' ? 'داكن' : 'فاتح'}
            </ThemedText>
            <View style={styles.modeRow}>
              {modes.map((item) => (
                <SecondaryButton key={item.value} selected={mode === item.value} onPress={() => setMode(item.value)}>
                  {item.label}
                </SecondaryButton>
              ))}
            </View>
          </Card>

          <Card>
            <ThemedText type="smallBold">بوابة الويب</ThemedText>
            <ThemedText themeColor="textSecondary">{WebBaseUrl}</ThemedText>
            <View style={styles.actions}>
              <SecondaryButton onPress={() => Linking.openURL(`${WebBaseUrl}/dashboard/supervisor`)}>
                المشرف
              </SecondaryButton>
              <SecondaryButton onPress={() => Linking.openURL(`${WebBaseUrl}/dashboard/manager`)}>
                المدير
              </SecondaryButton>
            </View>
          </Card>

          <Card>
            <ThemedText type="smallBold">الأمان</ThemedText>
            <ThemedText themeColor="textSecondary">
              لا يتم تخزين مفاتيح Firebase Admin أو Gemini داخل تطبيق الموبايل. كل العمليات الحساسة تظل على خادم Bedoo.
            </ThemedText>
          </Card>
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
  modeRow: {
    flexDirection: 'row-reverse',
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
});
