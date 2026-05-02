import {
  Tabs,
  TabList,
  TabTrigger,
  TabSlot,
  TabTriggerSlotProps,
  TabListProps,
} from 'expo-router/ui';
import React from 'react';
import { Pressable, View, StyleSheet } from 'react-native';

import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';

import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useLanguage } from '@/contexts/language-context';
import { useCurrentUser } from '@/lib/auth';
import { isMobileAdminRole } from '@/lib/auth-routes';

export default function AppTabs() {
  const { direction, strings } = useLanguage();
  const currentUser = useCurrentUser();
  const tabs = strings.tabs;
  const isAdminUser = currentUser ? isMobileAdminRole(currentUser.profile.role) : false;

  return (
    <Tabs>
      <TabSlot style={{ height: '100%' }} />
      <TabList asChild>
        <CustomTabList direction={direction}>
          <TabTrigger name="home" href="/(tabs)" asChild>
            <TabButton>{tabs.home}</TabButton>
          </TabTrigger>
          <TabTrigger name="scan" href="/(tabs)/scan" asChild>
            <TabButton>{tabs.scan}</TabButton>
          </TabTrigger>
          <TabTrigger name="drafts" href="/(tabs)/drafts" asChild>
            <TabButton>{tabs.drafts}</TabButton>
          </TabTrigger>
          <TabTrigger name="history" href="/(tabs)/history" asChild>
            <TabButton>{tabs.history}</TabButton>
          </TabTrigger>
          {isAdminUser ? (
            <TabTrigger name="admin" href="/(tabs)/admin" asChild>
              <TabButton>{tabs.admin}</TabButton>
            </TabTrigger>
          ) : null}
          <TabTrigger name="settings" href="/(tabs)/settings" asChild>
            <TabButton>{tabs.settings}</TabButton>
          </TabTrigger>
        </CustomTabList>
      </TabList>
    </Tabs>
  );
}

export function TabButton({ children, isFocused, ...props }: TabTriggerSlotProps) {
  return (
    <Pressable {...props} style={({ pressed }) => pressed && styles.pressed}>
      <ThemedView
        type={isFocused ? 'backgroundSelected' : 'backgroundElement'}
        style={styles.tabButtonView}>
        <ThemedText type="small" themeColor={isFocused ? 'text' : 'textSecondary'}>
          {children}
        </ThemedText>
      </ThemedView>
    </Pressable>
  );
}

export function CustomTabList({ direction, ...props }: TabListProps & { direction: 'ltr' | 'rtl' }) {
  const { strings } = useLanguage();

  return (
    <View {...props} style={styles.tabListContainer}>
      <ThemedView
        type="backgroundElement"
        style={[styles.innerContainer, { flexDirection: direction === 'rtl' ? 'row' : 'row-reverse' }]}>
        <ThemedText type="smallBold" style={styles.brandText}>
          {strings.appNameArabic}
        </ThemedText>

        {props.children}
      </ThemedView>
    </View>
  );
}

const styles = StyleSheet.create({
  tabListContainer: {
    position: 'absolute',
    width: '100%',
    padding: Spacing.three,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
  },
  innerContainer: {
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.five,
    borderRadius: Spacing.five,
    flexDirection: 'row',
    alignItems: 'center',
    flexGrow: 1,
    gap: Spacing.two,
    maxWidth: MaxContentWidth,
  },
  brandText: {
    marginRight: 'auto',
  },
  pressed: {
    opacity: 0.7,
  },
  tabButtonView: {
    justifyContent: 'center',
    minHeight: 44,
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.three,
  },
});