import { router } from 'expo-router';
import { openBrowserAsync, WebBrowserPresentationStyle } from 'expo-web-browser';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BrandHeader, Card, PrimaryButton, ScreenShell, SecondaryButton, StatusChip, useToast } from '@/components/ecopest-ui';
import { ThemedText } from '@/components/themed-text';
import { BottomTabInset, Spacing } from '@/constants/theme';
import { useLanguage } from '@/contexts/language-context';
import { useTheme } from '@/hooks/use-theme';
import { useCurrentUser, signOut } from '@/lib/auth';
import { isWebPortalRole } from '@/lib/auth-routes';
import { errorHaptic, successHaptic } from '@/lib/haptics';
import { createMobileWebSession } from '@/lib/sync/api-client';

async function openHandoffUrl(url: string): Promise<void> {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    window.location.assign(url);
    return;
  }

  await openBrowserAsync(url, {
    presentationStyle: WebBrowserPresentationStyle.AUTOMATIC,
  });
}

export default function AdminPortalScreen() {
  const currentUser = useCurrentUser();
  const { isRtl, roleLabels, strings } = useLanguage();
  const theme = useTheme();
  const { showToast } = useToast();
  const [error, setError] = useState<string | null>(null);
  const [isOpening, setIsOpening] = useState(false);
  const openedAutomatically = useRef(false);
  const t = strings.adminPortal;
  const role = currentUser?.profile.role;
  const isPortalUser = role ? isWebPortalRole(role) : false;
  const [portalUrl, setPortalUrl] = useState<string | null>(null);

  const openPortal = useCallback(async (): Promise<void> => {
    if (!isPortalUser) {
      router.replace('/(tabs)');
      showToast(t.technicianRedirect, 'warning');
      return;
    }

    setError(null);
    setIsOpening(true);

    try {
      const session = await createMobileWebSession();

      setPortalUrl(session.url);
      await openHandoffUrl(session.url);
      await successHaptic();
    } catch (portalError: unknown) {
      const message = portalError instanceof Error ? portalError.message : t.openError;

      setError(message);
      showToast(message, 'error');
      await errorHaptic();
    } finally {
      setIsOpening(false);
    }
  }, [isPortalUser, showToast, t.openError, t.technicianRedirect]);

  useEffect(() => {
    if (!currentUser || openedAutomatically.current) {
      return;
    }

    openedAutomatically.current = true;
    void openPortal();
  }, [currentUser, openPortal]);

  async function logout(): Promise<void> {
    try {
      await signOut();
      showToast(strings.settings.logoutDone, 'success');
      await successHaptic();
      router.replace('/login');
    } catch {
      showToast(strings.auth.logoutError, 'error');
      await errorHaptic();
    }
  }

  if (!currentUser || !role) {
    return (
      <ScreenShell>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.centerContent}>
            <BrandHeader subtitle={t.subtitle} />
          </View>
        </SafeAreaView>
      </ScreenShell>
    );
  }

  return (
    <ScreenShell>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.scrollContent} contentInsetAdjustmentBehavior="automatic" showsVerticalScrollIndicator={false}>
          <BrandHeader subtitle={t.subtitle} />

          <Card>
            <View style={[styles.headerRow, { flexDirection: isRtl ? 'row-reverse' : 'row' }]}>
              <StatusChip label={roleLabels[role]} tone={isPortalUser ? 'info' : 'warning'} />
              <ThemedText selectable type="small" themeColor="textSecondary">
                {currentUser.profile.displayName}
              </ThemedText>
            </View>
            <ThemedText type="title">{t.title}</ThemedText>
            <ThemedText themeColor="textSecondary">
              {isPortalUser ? t.body : t.technicianRedirect}
            </ThemedText>
            {portalUrl ? (
              <ThemedText selectable type="small" themeColor="textSecondary">
                {portalUrl}
              </ThemedText>
            ) : null}
            {error ? (
              <ThemedText selectable type="smallBold" style={{ color: theme.danger }}>
                {error}
              </ThemedText>
            ) : null}
            <PrimaryButton disabled={isOpening} loading={isOpening} onPress={() => void openPortal()}>
              {isOpening ? t.opening : t.openCta}
            </PrimaryButton>
            <SecondaryButton onPress={() => void logout()}>{strings.actions.logout}</SecondaryButton>
          </Card>
        </ScrollView>
      </SafeAreaView>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  centerContent: {
    flex: 1,
    gap: Spacing.three,
    justifyContent: 'center',
  },
  headerRow: {
    alignItems: 'center',
    gap: Spacing.two,
    justifyContent: 'space-between',
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
