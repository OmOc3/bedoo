import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { router, useSegments } from 'expo-router';
import { Stack } from 'expo-router/stack';
import {
  IBMPlexSansArabic_400Regular,
  IBMPlexSansArabic_500Medium,
  IBMPlexSansArabic_600SemiBold,
  IBMPlexSansArabic_700Bold,
} from '@expo-google-fonts/ibm-plex-sans-arabic';
import { useFonts } from 'expo-font';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect } from 'react';
import { ActivityIndicator, I18nManager, StyleSheet, View } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { BrandHeader, ScreenShell, ToastProvider } from '@/components/ecopest-ui';
import { OfflineBanner, OnlineStateProvider } from '@/components/offline-banner';
import { KeepAwakeProvider } from '@/contexts/keep-awake-context';
import { LanguageProvider } from '@/contexts/language-context';
import { TextScaleProvider } from '@/contexts/text-scale-context';
import { ThemeModeProvider, useThemeMode } from '@/contexts/theme-context';
import { AuthProvider, useAuthReady, useCurrentUser } from '@/lib/auth';
import { getMobileHomeRoute } from '@/lib/auth-routes';
import { SyncProvider } from '@/lib/sync/report-sync';

I18nManager.allowRTL(true);

export default function TabLayout() {
  return (
    <LanguageProvider>
      <ThemeModeProvider>
        <Providers>
          <EcoPestLayout />
        </Providers>
      </ThemeModeProvider>
    </LanguageProvider>
  );
}

function EcoPestLayout() {
  const { resolvedTheme } = useThemeMode();
  const [fontsLoaded, fontError] = useFonts({
    Tajawal: IBMPlexSansArabic_400Regular,
    'Tajawal-Medium': IBMPlexSansArabic_500Medium,
    'Tajawal-Bold': IBMPlexSansArabic_600SemiBold,
    'Tajawal-ExtraBold': IBMPlexSansArabic_700Bold,
  });

  return (
    <ThemeProvider value={resolvedTheme === 'dark' ? DarkTheme : DefaultTheme}>
      <StatusBar style={resolvedTheme === 'dark' ? 'light' : 'dark'} />
      <ToastProvider>
        <AuthProvider>
          <RoutedApp fontsReady={fontsLoaded || Boolean(fontError)} />
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}

function Providers({ children }: { children: React.ReactNode }) {
  return (
    <TextScaleProvider>
      <KeepAwakeProvider>{children}</KeepAwakeProvider>
    </TextScaleProvider>
  );
}

function useAuthRoutes(): void {
  const authReady = useAuthReady();
  const currentUser = useCurrentUser();
  const segments = useSegments();

  useEffect(() => {
    if (!authReady) {
      return;
    }

    const routeRoot = segments[0];
    const isPublicRoute = routeRoot === 'login' || routeRoot === 'legal';

    if (!currentUser && !isPublicRoute) {
      router.replace('/login');
      return;
    }

    if (!currentUser) {
      return;
    }

    const homeRoute = getMobileHomeRoute(currentUser.profile.role);
    const isTechnicianRoute = routeRoot === '(tabs)' || routeRoot === 'report';

    if (routeRoot === 'login') {
      router.replace(homeRoute);
      return;
    }

    if (homeRoute === '/admin-portal' && isTechnicianRoute) {
      router.replace('/admin-portal');
      return;
    }

    if (homeRoute === '/(tabs)' && routeRoot === 'admin-portal') {
      router.replace('/(tabs)');
    }
  }, [authReady, currentUser, segments]);
}

function LoadingShell() {
  const { theme } = useThemeMode();

  return (
    <ScreenShell>
      <View style={styles.loadingShell}>
        <BrandHeader />
        <ActivityIndicator color={theme.primary} />
      </View>
    </ScreenShell>
  );
}

function AppStack() {
  return (
    <>
      <AnimatedSplashOverlay />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="login" />
        <Stack.Screen name="admin-portal" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="report/[stationId]" />
        <Stack.Screen name="legal/privacy" />
        <Stack.Screen name="legal/terms" />
      </Stack>
    </>
  );
}

function RoutedApp({ fontsReady }: { fontsReady: boolean }) {
  const authReady = useAuthReady();

  useAuthRoutes();

  if (!fontsReady || !authReady) {
    return <LoadingShell />;
  }

  return (
    <SyncProvider>
      <OnlineStateProvider>
        <OfflineBanner />
        <AppStack />
      </OnlineStateProvider>
    </SyncProvider>
  );
}

const styles = StyleSheet.create({
  loadingShell: {
    flex: 1,
    gap: 24,
    justifyContent: 'center',
    width: '100%',
  },
});
