import { GlassView, isGlassEffectAPIAvailable, isLiquidGlassAvailable } from 'expo-glass-effect';
import { Tabs } from 'expo-router';
import React from 'react';
import { Platform, StyleSheet, View } from 'react-native';

import { EcoPestIcon, type EcoPestIconName } from '@/components/icons';
import { Fonts, Radius, Spacing, Typography } from '@/constants/theme';
import { useLanguage } from '@/contexts/language-context';
import { useThemeMode, type ResolvedTheme } from '@/contexts/theme-context';
import { useCurrentUser } from '@/lib/auth';
import { isMobileAdminRole } from '@/lib/auth-routes';

const tabIcons: Record<string, EcoPestIconName> = {
  admin: 'shield',
  drafts: 'clipboard-check',
  history: 'file-text',
  index: 'dashboard',
  insights: 'brain',
  scan: 'qr-code',
  settings: 'settings',
  team: 'user',
};

function canUseNativeLiquidGlass() {
  if (Platform.OS !== 'ios') {
    return false;
  }

  try {
    return isGlassEffectAPIAvailable() && isLiquidGlassAvailable();
  } catch {
    return false;
  }
}

interface LiquidTabBarBackgroundProps {
  fallbackColor: string;
  highlightColor: string;
  isLiquidGlass: boolean;
  resolvedTheme: ResolvedTheme;
  tintColor: string;
}

function LiquidTabBarBackground({
  fallbackColor,
  highlightColor,
  isLiquidGlass,
  resolvedTheme,
  tintColor,
}: LiquidTabBarBackgroundProps) {
  return (
    <View pointerEvents="none" style={styles.tabBarBackgroundClip}>
      {isLiquidGlass ? (
        <GlassView
          colorScheme={resolvedTheme}
          glassEffectStyle={{ animate: true, animationDuration: 0.2, style: 'regular' }}
          isInteractive
          style={StyleSheet.absoluteFill}
          tintColor={tintColor}
        />
      ) : (
        <View style={[styles.tabBarFallbackSurface, { backgroundColor: fallbackColor }]} />
      )}
      <View
        style={[
          styles.tabBarGloss,
          {
            backgroundColor: highlightColor,
            opacity: resolvedTheme === 'dark' ? 0.1 : 0.34,
          },
        ]}
      />
    </View>
  );
}

export default function AppTabs() {
  const { resolvedTheme, theme } = useThemeMode();
  const { strings } = useLanguage();
  const currentUser = useCurrentUser();
  const tabs = strings.tabs;
  const isAdminUser = currentUser ? isMobileAdminRole(currentUser.profile.role) : false;
  const isLiquidGlass = canUseNativeLiquidGlass();

  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: theme.primary,
        tabBarBackground: () => (
          <LiquidTabBarBackground
            fallbackColor={theme.backgroundElement}
            highlightColor={theme.onPrimary}
            isLiquidGlass={isLiquidGlass}
            resolvedTheme={resolvedTheme}
            tintColor={theme.backgroundElement}
          />
        ),
        tabBarHideOnKeyboard: true,
        tabBarIcon: ({ color, focused }) => (
          <View
            style={[
              styles.iconShell,
              focused
                ? [
                    styles.iconShellFocused,
                    {
                      backgroundColor: theme.backgroundSelected,
                      borderColor: theme.primaryLight,
                    },
                  ]
                : null,
            ]}>
            {focused ? <View style={[styles.iconSheen, { backgroundColor: theme.onPrimary }]} /> : null}
            <EcoPestIcon
              color={color}
              name={tabIcons[route.name] ?? 'home'}
              size={22}
              strokeWidth={focused ? 2.5 : 2.2}
            />
          </View>
        ),
        tabBarInactiveTintColor: theme.textSecondary,
        tabBarItemStyle: styles.tabItem,
        tabBarLabelStyle: {
          fontFamily: Fonts.sansBold,
          fontSize: Typography.fontSize.xs,
          lineHeight: 14,
          marginTop: 2,
        },
        tabBarStyle: [
          styles.tabBar,
          {
            backgroundColor: isLiquidGlass ? 'transparent' : theme.backgroundElement,
            borderColor: theme.border,
            shadowColor: theme.text,
          },
        ],
      })}>
      <Tabs.Screen name="index" options={{ title: tabs.home }} />
      <Tabs.Screen name="scan" options={{ href: isAdminUser ? null : '/(tabs)/scan', title: tabs.scan }} />
      <Tabs.Screen name="drafts" options={{ title: tabs.drafts }} />
      <Tabs.Screen name="history" options={{ title: tabs.history }} />
      <Tabs.Screen name="insights" options={{ href: isAdminUser ? '/(tabs)/insights' : null, title: strings.insights.title }} />
      <Tabs.Screen name="admin" options={{ href: isAdminUser ? '/(tabs)/admin' : null, title: tabs.admin }} />
      <Tabs.Screen name="team" options={{ href: null, title: strings.team.title }} />
      <Tabs.Screen name="settings" options={{ title: tabs.settings }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  iconSheen: {
    borderRadius: Radius.full,
    height: 12,
    left: Spacing.two,
    opacity: 0.34,
    position: 'absolute',
    right: Spacing.two,
    top: 3,
  },
  iconShell: {
    alignItems: 'center',
    borderColor: 'transparent',
    borderRadius: Radius.full,
    borderWidth: 1,
    height: 32,
    justifyContent: 'center',
    overflow: 'hidden',
    width: 46,
  },
  iconShellFocused: {
    transform: [{ translateY: -1 }],
  },
  tabBar: {
    borderRadius: Radius.full,
    borderTopWidth: 0,
    borderWidth: 1,
    bottom: Platform.select({ android: 12, ios: 14, default: 12 }),
    elevation: 18,
    height: Platform.select({ android: 70, ios: 78, default: 70 }),
    left: Spacing.three,
    minHeight: Platform.select({ android: 70, ios: 78, default: 70 }),
    overflow: 'hidden',
    paddingBottom: Platform.select({ android: 8, ios: 14, default: 8 }),
    paddingHorizontal: Spacing.one,
    paddingTop: 8,
    position: 'absolute',
    right: Spacing.three,
    shadowOffset: { height: 14, width: 0 },
    shadowOpacity: 0.16,
    shadowRadius: 26,
  },
  tabBarBackgroundClip: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: Radius.full,
    overflow: 'hidden',
  },
  tabBarFallbackSurface: {
    ...StyleSheet.absoluteFillObject,
  },
  tabBarGloss: {
    borderRadius: Radius.full,
    height: '45%',
    left: Spacing.two,
    position: 'absolute',
    right: Spacing.two,
    top: Spacing.one,
  },
  tabItem: {
    borderRadius: Radius.full,
    paddingVertical: 2,
  },
});
