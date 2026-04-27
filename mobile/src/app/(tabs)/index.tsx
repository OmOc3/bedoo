import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EcoPestIcon, type EcoPestIconName } from '@/components/icons';
import { MobileTopBar, PrimaryButton, ScreenShell, StatusChip } from '@/components/ecopest-ui';
import { ThemedText } from '@/components/themed-text';
import { BottomTabInset, Fonts, Radius, Shadow, Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useCurrentUser } from '@/lib/auth';
import { getDrafts, getSubmittedReports, getSyncQueueReports, type DraftReport } from '@/lib/drafts';
import { useSyncActions, useSyncStatus } from '@/lib/sync/report-sync';

function displayDate(value?: string): string {
  if (!value) {
    return '';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return new Intl.DateTimeFormat('ar-EG', { hour: '2-digit', minute: '2-digit', weekday: 'short' }).format(date);
}

function StatCard({ icon, label, value, wide = false }: { icon: EcoPestIconName; label: string; value: string; wide?: boolean }) {
  const theme = useTheme();

  return (
    <View style={[styles.statCard, Shadow.sm, wide ? styles.statCardWide : null, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
      <EcoPestIcon color={theme.primary} name={icon} size={28} />
      <View style={styles.statCopy}>
        <ThemedText type="small" themeColor="textSecondary" style={styles.statLabel}>
          {label}
        </ThemedText>
        <ThemedText style={styles.statValue}>{value}</ThemedText>
      </View>
    </View>
  );
}

function RecentReportItem({ report }: { report: DraftReport }) {
  const theme = useTheme();
  const title = report.stationLabel ?? `محطة #${report.stationId}`;
  const statusTone = report.syncStatus === 'submitted' ? 'success' : report.syncStatus === 'failed' ? 'danger' : 'warning';
  const statusLabel = report.syncStatus === 'submitted' ? 'مكتمل' : report.syncStatus === 'failed' ? 'فشل الإرسال' : 'قيد المزامنة';

  return (
    <View style={[styles.reportItem, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
      <View style={[styles.reportIcon, { backgroundColor: theme.backgroundSelected }]}>
        <EcoPestIcon color={theme.primary} name="file-text" size={25} />
      </View>
      <View style={styles.reportCopy}>
        <ThemedText type="smallBold" style={styles.reportTitle} numberOfLines={1}>
          {title}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {displayDate(report.submittedAt ?? report.createdAt)}
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
  const [draftCount, setDraftCount] = useState(0);
  const [queueCount, setQueueCount] = useState(0);
  const [recentReports, setRecentReports] = useState<DraftReport[]>([]);
  const displayName = currentUser?.profile.displayName?.trim() || 'الفريق';
  const isTechnician = currentUser?.profile.role === 'technician';

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
  const syncTitle = pendingTotal > 0 ? 'تقارير بانتظار المزامنة' : 'تمت مزامنة جميع البيانات';
  const syncBody =
    pendingTotal > 0
      ? `${pendingTotal} تقرير محفوظ محليًا وسيتم إرساله عند توفر الاتصال.`
      : lastSyncedAt
        ? `آخر مزامنة: ${lastSyncedAt}`
        : 'الجهاز جاهز لحفظ التقارير وإرسالها.';

  return (
    <ScreenShell>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.scrollContent} contentInsetAdjustmentBehavior="automatic" showsVerticalScrollIndicator={false}>
          <MobileTopBar
            leftIcon="menu"
            leftLabel="القائمة"
            onLeftPress={() => router.push('/(tabs)/settings')}
            onRightPress={() => router.push('/(tabs)/settings')}
            rightIcon="user"
            rightLabel="الإعدادات"
            title="ECOPEST"
          />

          <View style={styles.heroCopy}>
            <ThemedText type="subtitle" style={styles.greeting}>
              أهلاً، {displayName}
            </ThemedText>
            <ThemedText themeColor="textSecondary">نظرة عامة على مهامك اليومية وحالة النظام.</ThemedText>
          </View>

          <View style={[styles.syncCard, Shadow.sm, { backgroundColor: theme.backgroundElement, borderColor: pendingTotal > 0 ? theme.warningStrong : theme.successStrong }]}>
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
                  مزامنة
                </ThemedText>
              </Pressable>
            ) : null}
          </View>

          <View style={styles.statsGrid}>
            <StatCard icon="file-text" label="تقارير معلقة" value={String(pendingTotal)} />
            <StatCard icon="clipboard-check" label="مسودات محفوظة" value={String(draftCount)} />
            <StatCard icon="dashboard" label="تقارير اليوم" value={String(recentReports.length)} wide />
          </View>

          {isTechnician ? (
            <PrimaryButton icon="qr-code" onPress={() => router.push('/(tabs)/scan')}>
              مسح QR بالكاميرا
            </PrimaryButton>
          ) : null}

          <View style={styles.sectionHeader}>
            <Pressable accessibilityRole="button" onPress={() => router.push('/(tabs)/history')}>
              <ThemedText type="smallBold" style={{ color: theme.primary }}>
                عرض الكل
              </ThemedText>
            </Pressable>
            <ThemedText type="title">أحدث التقارير</ThemedText>
          </View>

          {recentReports.length > 0 ? (
            <View style={styles.reportList}>
              {recentReports.map((report) => (
                <RecentReportItem key={report.id} report={report} />
              ))}
            </View>
          ) : (
            <View style={[styles.emptyReports, { borderColor: theme.border }]}>
              <EcoPestIcon color={theme.textSecondary} name="file-text" size={28} />
              <ThemedText themeColor="textSecondary" style={styles.emptyText}>
                لا توجد تقارير حديثة على هذا الجهاز.
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
    textAlign: 'right',
  },
  heroCopy: {
    gap: Spacing.xs,
    paddingTop: Spacing.sm,
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
    flexDirection: 'row-reverse',
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
    flexDirection: 'row',
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
  statCardWide: {
    flexBasis: '100%',
    minHeight: 112,
  },
  statCopy: {
    gap: Spacing.xs,
    width: '100%',
  },
  statLabel: {
    textAlign: 'right',
  },
  statsGrid: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  statValue: {
    fontFamily: Fonts.sansHeavy,
    fontSize: Typography.fontSize.display,
    fontWeight: Typography.fontWeight.heavy,
    lineHeight: Typography.fontSize.display * Typography.lineHeight.tight,
    textAlign: 'right',
  },
  syncAction: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
  },
  syncCard: {
    alignItems: 'center',
    borderRadius: Radius.lg,
    borderWidth: 1,
    flexDirection: 'row-reverse',
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
