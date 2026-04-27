import { NativeTabs } from 'expo-router/unstable-native-tabs';
import React from 'react';

import { Fonts, Typography } from '@/constants/theme';
import { useLanguage } from '@/contexts/language-context';
import { useThemeMode } from '@/contexts/theme-context';
import { useCurrentUser } from '@/lib/auth';

export default function AppTabs() {
  const { theme } = useThemeMode();
  const { strings } = useLanguage();
  const currentUser = useCurrentUser();
  const userRole = currentUser?.profile.role;
  const canAccessAdmin = userRole === 'manager' || userRole === 'supervisor';
  const tabs = strings.tabs;

  return (
    <NativeTabs
      backgroundColor={theme.backgroundElement}
      iconColor={{ default: theme.textSecondary, selected: theme.primary }}
      indicatorColor={theme.backgroundSelected}
      labelStyle={{
        default: { color: theme.textSecondary, fontFamily: Fonts.sansBold, fontSize: Typography.fontSize.xs, fontWeight: '700' },
        selected: { color: theme.primary, fontFamily: Fonts.sansBold, fontSize: Typography.fontSize.xs, fontWeight: '700' },
      }}
      tintColor={theme.primary}>
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>{tabs.home}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon md="dashboard" sf={{ default: 'square.grid.2x2', selected: 'square.grid.2x2.fill' }} />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="scan">
        <NativeTabs.Trigger.Label>{tabs.scan}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon md="qr_code_scanner" sf="qrcode.viewfinder" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="history">
        <NativeTabs.Trigger.Label>{tabs.history}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon md="article" sf={{ default: 'doc.text', selected: 'doc.text.fill' }} />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="team">
        <NativeTabs.Trigger.Label>{tabs.team}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon md="groups" sf={{ default: 'person.3', selected: 'person.3.fill' }} />
      </NativeTabs.Trigger>

      {canAccessAdmin ? (
        <NativeTabs.Trigger name="admin">
          <NativeTabs.Trigger.Label>{tabs.admin}</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon md="admin_panel_settings" sf={{ default: 'gearshape.2', selected: 'gearshape.2.fill' }} />
        </NativeTabs.Trigger>
      ) : null}

      <NativeTabs.Trigger name="settings">
        <NativeTabs.Trigger.Label>{tabs.settings}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon md="settings" sf={{ default: 'gearshape', selected: 'gearshape.fill' }} />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
