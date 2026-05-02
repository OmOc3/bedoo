import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EcoPestIcon, type EcoPestIconName } from '@/components/icons';
import { MobileTopBar, PrimaryButton, ScreenShell, StatusChip } from '@/components/ecopest-ui';
import { ThemedText } from '@/components/themed-text';
import { BottomTabInset, Fonts, Radius, Shadow, Spacing, Typography } from '@/constants/theme';
import { useLanguage } from '@/contexts/language-context';
import { useTheme } from '@/hooks/use-theme';
import { useCurrentUser } from '@/lib/auth';
import { getDrafts, getSubmittedReports, getSyncQueueReports, type DraftReport } from '@/lib/drafts';
import { languageDateLocales } from '@/lib/i18n';
import { useSyncActions, useSyncStatus } from '@/lib/sync/report-sync';

function displayDate(value: string | undefined, locale: string): string {
  if (!value) {
    return '';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit', weekday: 'short' }).format(date);
}

function StatCard({
  icon,
  label,
  onPress,
  value,
  wide = false,
}: {
  icon: EcoPestIconName;
  label: string;
  onPress?: () => void;
  value: string;
  wide?: boolean;
}) {
  const theme = useTheme();
  const content = (
    <>
      <EcoPestIcon color={theme.primary} name={icon} size={28} />
      <View style={styles.statCopy}>
        <ThemedText type="small" themeColor="textSecondary" style={styles.statLabel}>
          {label}
        </ThemedText>
        <ThemedText style={styles.statValue}>{value}</ThemedText>
      </View>
    </>
  );

  const statStyle = [
    styles.statCard,
    Shadow.sm,
    wide ? styles.statCardWide : null,
    { backgroundColor: theme.backgroundElement, borderColor: theme.border },
  ];

  if (onPress) {
    return (
      <Pressable accessibilityLabel={label} accessibilityRole="button" onPress={onPress} style={({ pressed }) => [statStyle, pressed ? styles.pressed : null]}>
        {content}
      </Pressable>
    );
  }

  return (
    <View style={statStyle}>
      {content}
    </View>
  );
}

function RecentReportItem({ locale, report }: { locale: string; report: DraftReport }) {
  const theme = useTheme();
  const { strings } = useLanguage();
  const title = report.stationLabel ?? `${strings.report.stationLabel} #${report.stationId}`;
  const statusTone = report.syncStatus === 'submitted' ? 'success' : report.syncStatus === 'failed' ? 'danger' : 'warning';
  const statusLabel = report.syncStatus ? strings.syncStatus[report.syncStatus] : strings.syncStatus.queued;

  return (
    <View
      style={[
        styles.reportItem,
        {
          backgroundColor: theme.backgroundElement,
          borderColor: theme.border,
          flexDirection: 'row',
        },
      ]}>
      <View style={[styles.reportIcon, { backgroundColor: theme.backgroundSelected }]}>
        <EcoPestIcon color={theme.primary} name="file-text" size={25} />
      </View>
      <View style={styles.reportCopy}>
        <ThemedText type="smallBold" style={styles.reportTitle} numberOfLines={1}>
          {title}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {displayDate(report.submittedAt ?? report.createdAt, locale)}
        </ThemedText>
      </View>
      <StatusChip label={statusLabel} tone={statusTone} />
    </View>
  );
}

export default function HomeScreen() {
  const { isSyncing, lastSyncedAt, pendingCount } = useSyncStatus();
  const { syncAllDrafts } = useSyncActions();
  const currentUser = useCurrentUser();
  const theme = useTheme();
  const { language, strings } = useLanguage();
  const t = strings.home;
  const locale = languageDateLocales[language];
  const [draftCount, setDraftCount] = useState(0);
  const [queueCount, setQueueCount] = useState(0);
  const [recentReports, setRecentReports] = useState<DraftReport[]>([]);
  const displayName = currentUser?.profile.displayName?.trim() || t.defaultUser;
  const isTechnician = currentUser?.profile.role === 'technician';
  const isClient = currentUser?.profile.role === 'client';

  const refreshLocalCounts = useCallback(async () => {
    const [drafts, queue, submitted] = await Promise.all([getDrafts(), getSyncQueueReports(), getSubmittedReports()]);

    setDraftCount(drafts.length);
    setQueueCount(queue.length);
    setRecentReports(submitted.slice(0, 2));
  }, []);

  useFocusEffect(
    useCallback(() => {
      void refreshLocalCounts();
    }, [refreshLocalCounts]),
  );

  const pendingTotal = pendingCount || queueCount;
  const syncTitle = pendingTotal > 0 ? t.pendingSyncTitle : t.syncedTitle;
  const syncBody =
    pendingTotal > 0
      ? `${pendingTotal} ${t.pendingSyncBodySuffix}`
      : lastSyncedAt
        ? `${t.lastSyncPrefix} ${new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(lastSyncedAt))}`
        : t.readySyncBody;

  if (isClient) {
    const clientTitle = language === 'ar' ? 'بوابة العميل' : 'Client portal';
    const clientBody =
      language === 'ar'
        ? 'تابع طلبات فحص المحطات، المحطات المرتبطة بك، وتقارير الزيارات من نفس بيانات الويب.'
        : 'Track inspection requests, linked stations, and visit reports from the same web data.';
    const ordersCta = language === 'ar' ? 'فتح طلبات العملاء' : 'Open client orders';

    return (
      <ScreenShell>
        <SafeAreaView style={styles.safeArea}>
          <ScrollView contentContainerStyle={styles.scrollContent} contentInsetAdjustmentBehavior="automatic" showsVerticalScrollIndicator={false}>
            <MobileTopBar
              leftIcon="menu"
              leftLabel={strings.actions.menu}
              onLeftPress={() => router.push('/orders' as never)}
              onRightPress={() => router.push('/(tabs)/settings')}
              rightIcon="user"
              rightLabel={strings.tabs.settings}
              title={strings.appName}
            />

            <View style={styles.heroCopy}>
              <ThemedText type="subtitle" style={styles.greeting}>
                {t.greetingPrefix} {displayName}
              </ThemedText>
              <ThemedText themeColor="textSecondary">{clientBody}</ThemedText>
            </View>

            <View
              style={[
                styles.clientPortalCard,
                Shadow.sm,
                {
                  backgroundColor: theme.backgroundElement,
                  borderColor: theme.border,
                  flexDirection: 'row',
                },
              ]}>
              <View style={[styles.clientPortalIcon, { backgroundColor: theme.primarySoft }]}>
                <EcoPestIcon color={theme.primary} name="clipboard-check" size={32} />
              </View>
              <View style={styles.syncCopy}>
                <ThemedText type="subtitle">{clientTitle}</ThemedText>
                <ThemedText themeColor="textSecondary">{clientBody}</ThemedText>
              </View>
            </View>

            <PrimaryButton icon="clipboard-check" onPress={() => router.push('/orders' as never)}>
              {ordersCta}
            </PrimaryButton>
          </ScrollView>
        </SafeAreaView>
      </ScreenShell>
    );
  }

  return (
    <ScreenShell>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.scrollContent} contentInsetAdjustmentBehavior="automatic" showsVerticalScrollIndicator={false}>
          <MobileTopBar
            leftIcon="menu"
            leftLabel={strings.actions.menu}
            onLeftPress={() => router.push('/(tabs)/settings')}
            onRightPress={() => router.push('/(tabs)/settings')}
            rightIcon="user"
            rightLabel={strings.tabs.settings}
            title={strings.appName}
          />

          <View style={styles.heroCopy}>
            <ThemedText type="subtitle" style={styles.greeting}>
              {t.greetingPrefix} {displayName}
            </ThemedText>
            <ThemedText themeColor="textSecondary">{t.overview}</ThemedText>
          </View>

          <View
            style={[
              styles.syncCard,
              Shadow.sm,
              {
                backgroundColor: theme.backgroundElement,
                borderColor: pendingTotal > 0 ? theme.warningStrong : theme.successStrong,
                flexDirection: 'row',
              },
            ]}>
            <View style={[styles.syncIcon, { backgroundColor: pendingTotal > 0 ? theme.warningSoft : theme.primarySoft }]}>
              <EcoPestIcon color={pendingTotal > 0 ? theme.warningStrong : theme.successStrong} name={pendingTotal > 0 ? 'alert-circle' : 'check-cloud'} size={30} />
            </View>
            <View style={styles.syncCopy}>
              <ThemedText type="title" style={[styles.syncTitle, { color: pendingTotal > 0 ? theme.warningStrong : theme.successStrong }]}>
                {syncTitle}
              </ThemedText>
              <ThemedText themeColor="textSecondary">{syncBody}</ThemedText>
            </View>
            {pendingTotal > 0 ? (
              <Pressable accessibilityRole="button" disabled={isSyncing} onPress={() => void syncAllDrafts().then(refreshLocalCounts)} style={styles.syncAction}>
                <ThemedText type="smallBold" style={{ color: theme.primary }}>
                  {strings.actions.syncNow}
                </ThemedText>
              </Pressable>
            ) : null}
          </View>

          <View style={[styles.statsGrid, { flexDirection: 'row' }]}>
            <StatCard icon="file-text" label={t.pendingReports} onPress={() => router.push('/(tabs)/drafts')} value={String(pendingTotal)} />
            <StatCard icon="clipboard-check" label={t.savedDrafts} onPress={() => router.push('/(tabs)/drafts')} value={String(draftCount)} />
            <StatCard icon="dashboard" label={t.todayReports} onPress={() => router.push('/(tabs)/history')} value={String(recentReports.length)} wide />
          </View>

          {isTechnician ? (
            <PrimaryButton icon="qr-code" onPress={() => router.push('/(tabs)/scan')}>
              {t.scanCameraCta}
            </PrimaryButton>
          ) : null}

          <View style={[styles.sectionHeader, { flexDirection: 'row-reverse' }]}>
            <Pressable accessibilityRole="button" onPress={() => router.push('/(tabs)/history')}>
              <ThemedText type="smallBold" style={{ color: theme.primary }}>
                {t.viewAll}
              </ThemedText>
            </Pressable>
            <ThemedText type="title">{t.recentReports}</ThemedText>
          </View>

          {recentReports.length > 0 ? (
            <View style={styles.reportList}>
              {recentReports.map((report) => (
                <RecentReportItem key={report.id} locale={locale} report={report} />
              ))}
            </View>
          ) : (
            <View style={[styles.emptyReports, { borderColor: theme.border }]}>
              <EcoPestIcon color={theme.textSecondary} name="file-text" size={28} />
              <ThemedText themeColor="textSecondary" style={styles.emptyText}>
                {t.noRecentReports}
              </ThemedText>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  emptyReports: {
    alignItems: 'center',
    borderRadius: Radius.lg,
    borderWidth: 1,
    gap: Spacing.sm,
    padding: Spacing.lg,
  },
  emptyText: {
    textAlign: 'center',
  },
  greeting: {
  },
  heroCopy: {
    gap: Spacing.xs,
    paddingTop: Spacing.sm,
  },
  clientPortalCard: {
    alignItems: 'center',
    borderRadius: Radius.lg,
    borderWidth: 1,
    gap: Spacing.md,
    minHeight: 132,
    padding: Spacing.lg,
  },
  clientPortalIcon: {
    alignItems: 'center',
    borderRadius: Radius.lg,
    height: 64,
    justifyContent: 'center',
    width: 64,
  },
  reportCopy: {
    flex: 1,
    gap: Spacing.xs,
  },
  reportIcon: {
    alignItems: 'center',
    borderRadius: Radius.md,
    height: 54,
    justifyContent: 'center',
    width: 54,
  },
  reportItem: {
    alignItems: 'center',
    borderRadius: Radius.lg,
    borderWidth: 1,
    gap: Spacing.md,
    minHeight: 86,
    padding: Spacing.md,
  },
  reportList: {
    gap: Spacing.md,
  },
  reportTitle: {
    fontSize: Typography.fontSize.md,
  },
  safeArea: {
    flex: 1,
    width: '100%',
  },
  scrollContent: {
    gap: Spacing.lg,
    paddingBottom: BottomTabInset + Spacing.xl,
  },
  sectionHeader: {
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Spacing.sm,
  },
  statCard: {
    alignItems: 'flex-start',
    borderRadius: Radius.lg,
    borderWidth: 1,
    flex: 1,
    gap: Spacing.lg,
    minHeight: 124,
    padding: Spacing.lg,
  },
  pressed: {
    opacity: 0.82,
  },
  statCardWide: {
    flexBasis: '100%',
    minHeight: 112,
  },
  statCopy: {
    gap: Spacing.xs,
    width: '100%',
  },
  statLabel: {
  },
  statsGrid: {
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  statValue: {
    fontFamily: Fonts.sansHeavy,
    fontSize: Typography.fontSize.display,
    lineHeight: Typography.fontSize.display * Typography.lineHeight.tight,
  },
  syncAction: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
  },
  syncCard: {
    alignItems: 'center',
    borderRadius: Radius.lg,
    borderWidth: 1,
    gap: Spacing.md,
    padding: Spacing.lg,
  },
  syncCopy: {
    flex: 1,
    gap: Spacing.xs,
  },
  syncIcon: {
    alignItems: 'center',
    borderRadius: Radius.full,
    height: 58,
    justifyContent: 'center',
    width: 58,
  },
  syncTitle: {
    fontSize: Typography.fontSize.lg,
  },
});
