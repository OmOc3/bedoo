import { Tabs } from 'expo-router';
import React from 'react';
import { Platform, StyleSheet, View } from 'react-native';

import { EcoPestIcon, type EcoPestIconName } from '@/components/icons';
import { Fonts, Radius, Spacing, Typography } from '@/constants/theme';
import { useLanguage } from '@/contexts/language-context';
import { useThemeMode } from '@/contexts/theme-context';
import { useCurrentUser } from '@/lib/auth';
import { isMobileAdminRole } from '@/lib/auth-routes';

const tabIcons: Record<string, EcoPestIconName> = {
  admin: 'shield',
  drafts: 'clipboard-check',
  history: 'file-text',
  index: 'dashboard',
  insights: 'brain',
  orders: 'clipboard-check',
  scan: 'qr-code',
  settings: 'settings',
  team: 'user',
};

export default function AppTabs() {
  const { theme } = useThemeMode();
  const { language, strings } = useLanguage();
  const currentUser = useCurrentUser();
  const tabs = strings.tabs;
  const role = currentUser?.profile.role;
  const isAdminUser = currentUser ? isMobileAdminRole(currentUser.profile.role) : false;
  const isClient = role === 'client';
  const isTechnician = role === 'technician';
  const ordersTitle = language === 'ar' ? 'الطلبات' : 'Orders';

  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: theme.primary,
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
            backgroundColor: theme.backgroundElement,
            borderColor: theme.border,
          },
        ],
      })}>
      <Tabs.Screen name="index" options={{ title: tabs.home }} />
      <Tabs.Screen name="scan" options={{ href: isTechnician ? '/(tabs)/scan' : null, title: tabs.scan }} />
      <Tabs.Screen name="orders" options={{ href: isClient ? undefined : null, title: ordersTitle }} />
      <Tabs.Screen name="drafts" options={{ href: isClient ? null : '/(tabs)/drafts', title: tabs.drafts }} />
      <Tabs.Screen name="history" options={{ href: isClient ? null : '/(tabs)/history', title: tabs.history }} />
      <Tabs.Screen name="insights" options={{ href: isAdminUser ? '/(tabs)/insights' : null, title: strings.insights.title }} />
      <Tabs.Screen name="admin" options={{ href: isAdminUser ? '/(tabs)/admin' : null, title: tabs.admin }} />
      <Tabs.Screen name="team" options={{ href: null, title: strings.team.title }} />
      <Tabs.Screen name="settings" options={{ title: tabs.settings }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  iconShell: {
    alignItems: 'center',
    borderColor: 'transparent',
    borderRadius: Radius.md,
    borderWidth: 1,
    height: 32,
    justifyContent: 'center',
    width: 42,
  },
  iconShellFocused: {
    transform: [{ translateY: -1 }],
  },
  tabBar: {
    borderTopWidth: 1,
    elevation: 8,
    height: Platform.select({ android: 72, ios: 82, default: 72 }),
    minHeight: Platform.select({ android: 72, ios: 82, default: 72 }),
    paddingBottom: Platform.select({ android: 8, ios: 18, default: 8 }),
    paddingHorizontal: Spacing.two,
    paddingTop: 8,
  },
  tabItem: {
    borderRadius: Radius.md,
    paddingVertical: 2,
  },
});
