import { Tabs } from 'expo-router';
import React from 'react';
import { Platform, StyleSheet, View } from 'react-native';

import { EcoPestIcon, type EcoPestIconName } from '@/components/icons';
import { Fonts, Typography } from '@/constants/theme';
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
  scan: 'qr-code',
  settings: 'settings',
  team: 'user',
};

export default function AppTabs() {
  const { theme } = useThemeMode();
  const { strings } = useLanguage();
  const currentUser = useCurrentUser();
  const tabs = strings.tabs;
  const isAdminUser = currentUser ? isMobileAdminRole(currentUser.profile.role) : false;

  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: theme.primary,
        tabBarIcon: ({ color, focused }) => (
          <View style={[styles.iconShell, focused ? { backgroundColor: theme.backgroundSelected } : null]}>
            <EcoPestIcon color={color} name={tabIcons[route.name] ?? 'home'} size={22} />
          </View>
        ),
        tabBarInactiveTintColor: theme.textSecondary,
        tabBarItemStyle: styles.tabItem,
        tabBarLabelStyle: {
          fontFamily: Fonts.sansBold,
          fontSize: Typography.fontSize.xs,
        },
        tabBarStyle: [
          styles.tabBar,
          {
            backgroundColor: theme.backgroundElement,
            borderTopColor: theme.border,
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
  iconShell: {
    alignItems: 'center',
    borderRadius: 999,
    height: 30,
    justifyContent: 'center',
    width: 42,
  },
  tabBar: {
    borderTopWidth: 1,
    minHeight: Platform.select({ android: 70, ios: 82, default: 70 }),
    paddingBottom: Platform.select({ android: 10, ios: 20, default: 10 }),
    paddingTop: 8,
  },
  tabItem: {
    paddingVertical: 2,
  },
});