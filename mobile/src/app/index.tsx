import { router } from 'expo-router';
import { Linking, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BrandHeader, Card, PrimaryButton, ScreenShell, SecondaryButton, StatTile } from '@/components/bedoo-ui';
import { ThemedText } from '@/components/themed-text';
import { BottomTabInset, Spacing, WebBaseUrl } from '@/constants/theme';

export default function HomeScreen() {
  return (
    <ScreenShell>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <BrandHeader subtitle="رفيق الفني اليومي لمحطات الطعوم" />

          <Card>
            <ThemedText type="title">متابعة الزيارات الميدانية</ThemedText>
            <ThemedText themeColor="textSecondary">
              افتح نموذج التقرير من QR المحطة أو أدخل رقم المحطة يدويًا عند الحاجة.
            </ThemedText>
            <PrimaryButton onPress={() => router.push('/scan')}>فتح المسح</PrimaryButton>
          </Card>

          <View style={styles.statsRow}>
            <StatTile label="المسار" value="جاهز" />
            <StatTile label="المراجعات" value="فورية" />
          </View>

          <Card>
            <ThemedText type="smallBold">اختصارات التشغيل</ThemedText>
            <View style={styles.actions}>
              <SecondaryButton onPress={() => Linking.openURL(`${WebBaseUrl}/scan`)}>
                فتح صفحة المسح
              </SecondaryButton>
              <SecondaryButton onPress={() => router.push('/drafts')}>
                المسودات
              </SecondaryButton>
            </View>
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
  safeArea: {
    flex: 1,
    width: '100%',
  },
  scrollContent: {
    gap: Spacing.three,
    paddingBottom: BottomTabInset + Spacing.four,
  },
  statsRow: {
    flexDirection: 'row-reverse',
    gap: Spacing.two,
  },
});
