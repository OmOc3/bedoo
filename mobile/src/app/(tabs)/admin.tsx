import { router } from 'expo-router';
import { useEffect } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Card, MobileTopBar, PrimaryButton, ScreenShell, StatusChip } from '@/components/ecopest-ui';
import { ThemedText } from '@/components/themed-text';
import { BottomTabInset, Spacing } from '@/constants/theme';
import { useLanguage } from '@/contexts/language-context';
import { useCurrentUser } from '@/lib/auth';
import { isWebPortalRole } from '@/lib/auth-routes';

export default function AdminScreen() {
  const currentUser = useCurrentUser();
  const { roleLabels, strings } = useLanguage();
  const role = currentUser?.profile.role;
  const isPortalUser = role ? isWebPortalRole(role) : false;

  useEffect(() => {
    if (isPortalUser) {
      router.replace('/admin-portal');
    }
  }, [isPortalUser]);

  return (
    <ScreenShell>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.scrollContent} contentInsetAdjustmentBehavior="automatic" showsVerticalScrollIndicator={false}>
          <MobileTopBar leftIcon="arrow-left" leftLabel={strings.actions.back} onLeftPress={() => router.replace('/(tabs)')} title={strings.adminPortal.title} />

          <Card>
            <View style={styles.headerRow}>
              {role ? <StatusChip label={roleLabels[role]} tone={isPortalUser ? 'info' : 'warning'} /> : null}
            </View>
            <ThemedText type="title">{isPortalUser ? strings.adminPortal.title : strings.errors.accessDeniedTitle}</ThemedText>
            <ThemedText themeColor="textSecondary">
              {isPortalUser ? strings.adminPortal.body : strings.errors.accessDenied}
            </ThemedText>
            <PrimaryButton onPress={() => router.replace(isPortalUser ? '/admin-portal' : '/(tabs)')}>
              {isPortalUser ? strings.adminPortal.openCta : strings.actions.back}
            </PrimaryButton>
          </Card>
        </ScrollView>
      </SafeAreaView>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    alignItems: 'flex-start',
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
