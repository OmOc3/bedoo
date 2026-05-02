import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EcoPestIcon } from '@/components/icons';
import { EmptyState, MobileTopBar, ScreenShell, StatusChip, SyncBanner } from '@/components/ecopest-ui';
import { ThemedText } from '@/components/themed-text';
import { BottomTabInset, Fonts, Radius, Shadow, Spacing, TouchTarget, Typography } from '@/constants/theme';
import { useLanguage } from '@/contexts/language-context';
import { useTheme } from '@/hooks/use-theme';
import { useTeamUsers } from '@/hooks/use-team-users';
import type { MobileAppUser, UserRole } from '@/lib/sync/types';

const roleFilters: ('all' | UserRole)[] = ['all', 'client', 'technician', 'supervisor', 'manager'];

function initialsFromName(value: string, fallback: string): string {
  const letters = value
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((item) => Array.from(item)[0] ?? '')
    .join('');

  return letters || fallback;
}

function UserCard({ user }: { user: MobileAppUser }) {
  const theme = useTheme();
  const { language, roleLabels, strings } = useLanguage();
  const t = strings.team;
  const joinedAt = user.createdAt
    ? new Intl.DateTimeFormat(language === 'ar' ? 'ar-EG' : 'en-US', { dateStyle: 'medium' }).format(new Date(user.createdAt))
    : null;

  return (
    <View
      style={[
        styles.userCard,
        Shadow.sm,
        { backgroundColor: theme.backgroundElement, borderColor: theme.border, flexDirection: 'row' },
      ]}>
      <View style={[styles.avatar, { backgroundColor: theme.backgroundSelected, borderColor: theme.border }]}>
        <ThemedText type="smallBold" style={{ color: theme.primary }}>
          {initialsFromName(user.displayName, t.avatarFallback)}
        </ThemedText>
      </View>
      <View style={styles.userCopy}>
        <ThemedText type="smallBold" numberOfLines={1} style={styles.userTitle}>
          {user.displayName}
        </ThemedText>
        <ThemedText selectable type="small" themeColor="textSecondary" numberOfLines={1}>
          {user.email}
        </ThemedText>
        <View style={styles.userMetaRow}>
          <StatusChip label={roleLabels[user.role]} tone="info" />
          <StatusChip
            label={user.isActive ? t.activeStatus : t.inactiveStatus}
            tone={user.isActive ? 'success' : 'neutral'}
          />
        </View>
        {joinedAt ? (
          <ThemedText type="small" themeColor="textSecondary">
            {t.createdPrefix} {joinedAt}
          </ThemedText>
        ) : null}
      </View>
    </View>
  );
}

export default function TeamScreen() {
  const { strings, roleLabels, isRtl, direction } = useLanguage();
  const theme = useTheme();
  const [query, setQuery] = useState('');
  const [filterRole, setFilterRole] = useState<'all' | UserRole>('all');
  const t = strings.team;
  const team = useTeamUsers({
    genericLoadError: t.genericLoadError,
    unsupportedApi: t.unsupportedApi,
  });

  const visibleUsers = useMemo(() => {
    const cleanQuery = query.trim().toLowerCase();

    return team.users.filter((user) => {
      if (filterRole !== 'all' && user.role !== filterRole) {
        return false;
      }

      if (!cleanQuery) {
        return true;
      }

      const haystack = `${user.displayName} ${user.email} ${user.uid}`.toLowerCase();
      return haystack.includes(cleanQuery);
    });
  }, [filterRole, query, team.users]);

  return (
    <ScreenShell>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.scrollContent} contentInsetAdjustmentBehavior="automatic" showsVerticalScrollIndicator={false}>
          <MobileTopBar
            leftIcon="menu"
            leftLabel={strings.actions.back}
            onLeftPress={() => router.push('/(tabs)')}
            onRightPress={() => router.push('/(tabs)/settings')}
            rightIcon="settings"
            rightLabel={strings.tabs.settings}
            title={t.title}
          />

          <View style={[styles.headerCard, Shadow.sm, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
            <ThemedText type="title">{t.title}</ThemedText>
            <ThemedText themeColor="textSecondary">{t.subtitle}</ThemedText>
            <View style={styles.metricsRow}>
              <StatusChip label={`${t.totalLabel}: ${team.users.length}`} tone="info" />
              <StatusChip label={`${t.activeLabel}: ${team.users.filter((item) => item.isActive).length}`} tone="success" />
            </View>
          </View>

          <View style={[styles.searchBox, { backgroundColor: theme.backgroundElement, borderColor: theme.border, flexDirection: 'row' }]}>
            <EcoPestIcon color={theme.textSecondary} name="search" size={22} />
            <TextInput
              onChangeText={setQuery}
              placeholder={t.searchPlaceholder}
              placeholderTextColor={theme.textSecondary}
              style={[styles.searchInput, { color: theme.text, textAlign: isRtl ? 'right' : 'left', writingDirection: direction }]}
              value={query}
            />
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={[styles.filterRow, { flexDirection: 'row' }]}>
              {roleFilters.map((role) => {
                const selected = filterRole === role;
                const label = role === 'all' ? t.filterAll : roleLabels[role];

                return (
                  <Pressable
                    accessibilityRole="button"
                    key={role}
                    onPress={() => setFilterRole(role)}
                    style={[
                      styles.filterPill,
                      {
                        backgroundColor: selected ? theme.primaryLight : theme.backgroundElement,
                        borderColor: selected ? theme.primaryLight : theme.border,
                      },
                    ]}>
                    <ThemedText type="smallBold" style={{ color: selected ? theme.onPrimary : theme.text }}>
                      {label}
                    </ThemedText>
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>

          {team.error ? <SyncBanner body={team.error} title={t.loadErrorTitle} tone="warning" /> : null}

          {!team.loading && visibleUsers.length === 0 ? (
            <View style={[styles.emptyCard, { borderColor: theme.border, backgroundColor: theme.backgroundElement }]}>
              <EmptyState subtitle={t.emptyBody} title={t.emptyTitle} />
            </View>
          ) : null}

          <View style={styles.list}>
            {visibleUsers.map((user) => (
              <UserCard key={user.uid} user={user} />
            ))}
          </View>
        </ScrollView>
      </SafeAreaView>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  avatar: {
    alignItems: 'center',
    borderRadius: Radius.full,
    borderWidth: 1,
    height: 52,
    justifyContent: 'center',
    width: 52,
  },
  emptyCard: {
    borderRadius: Radius.lg,
    borderWidth: 1,
  },
  filterPill: {
    alignItems: 'center',
    borderRadius: Radius.full,
    borderWidth: 1,
    minHeight: TouchTarget,
    minWidth: 88,
    justifyContent: 'center',
    paddingHorizontal: Spacing.md,
  },
  filterRow: {
    gap: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  headerCard: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    gap: Spacing.sm,
    padding: Spacing.lg,
  },
  list: {
    gap: Spacing.md,
  },
  metricsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  safeArea: {
    flex: 1,
    width: '100%',
  },
  scrollContent: {
    gap: Spacing.lg,
    paddingBottom: BottomTabInset + Spacing.xl,
  },
  searchBox: {
    alignItems: 'center',
    borderRadius: Radius.lg,
    borderWidth: 1,
    gap: Spacing.sm,
    minHeight: 56,
    paddingHorizontal: Spacing.md,
  },
  searchInput: {
    flex: 1,
    fontFamily: Fonts.sans,
    fontSize: Typography.fontSize.base,
    minHeight: 44,
  },
  userCard: {
    alignItems: 'flex-start',
    borderRadius: Radius.lg,
    borderWidth: 1,
    flexDirection: 'row',
    gap: Spacing.md,
    padding: Spacing.md,
  },
  userCopy: {
    flex: 1,
    gap: Spacing.xs,
  },
  userMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  userTitle: {
    fontSize: Typography.fontSize.md,
  },
});
