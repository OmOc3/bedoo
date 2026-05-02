import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { router, useSegments } from 'expo-router';
import { Stack } from 'expo-router/stack';
import { useFonts } from 'expo-font';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { BrandHeader, ScreenShell, ToastProvider } from '@/components/ecopest-ui';
import { OfflineBanner, OnlineStateProvider } from '@/components/offline-banner';
import { KeepAwakeProvider } from '@/contexts/keep-awake-context';
import { LanguageProvider } from '@/contexts/language-context';
import { TextScaleProvider } from '@/contexts/text-scale-context';
import { ThemeModeProvider, useThemeMode } from '@/contexts/theme-context';
import { AuthProvider, useAuthReady, useCurrentUser } from '@/lib/auth';
import { SyncProvider } from '@/lib/sync/report-sync';


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
    Tajawal: require('../../assets/fonts/Tajawal-Regular.ttf'),
    'Tajawal-Medium': require('../../assets/fonts/Tajawal-Medium.ttf'),
    'Tajawal-Bold': require('../../assets/fonts/Tajawal-Bold.ttf'),
    'Tajawal-ExtraBold': require('../../assets/fonts/Tajawal-ExtraBold.ttf'),
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

    if (routeRoot === 'login') {
      router.replace('/(tabs)');
      return;
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
