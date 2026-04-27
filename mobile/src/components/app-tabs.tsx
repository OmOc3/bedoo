import { NativeTabs } from 'expo-router/unstable-native-tabs';
import React from 'react';

import { Fonts, Typography } from '@/constants/theme';
import { useLanguage } from '@/contexts/language-context';
import { useThemeMode } from '@/contexts/theme-context';

export default function AppTabs() {
  const { theme } = useThemeMode();
  const { strings } = useLanguage();
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

      <NativeTabs.Trigger name="drafts">
        <NativeTabs.Trigger.Label>{tabs.drafts}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon md="draft" sf={{ default: 'tray', selected: 'tray.fill' }} />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="history">
        <NativeTabs.Trigger.Label>{tabs.history}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon md="article" sf={{ default: 'doc.text', selected: 'doc.text.fill' }} />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="settings">
        <NativeTabs.Trigger.Label>{tabs.settings}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon md="settings" sf={{ default: 'gearshape', selected: 'gearshape.fill' }} />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
