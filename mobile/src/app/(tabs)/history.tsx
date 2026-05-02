import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EcoPestIcon } from '@/components/icons';
import { EmptyState, MobileTopBar, ScreenShell, StatusChip, SyncBanner } from '@/components/ecopest-ui';
import { ThemedText } from '@/components/themed-text';
import { BottomTabInset, Fonts, Radius, Shadow, Spacing, TouchTarget, Typography } from '@/constants/theme';
import { useLanguage } from '@/contexts/language-context';
import { useTheme } from '@/hooks/use-theme';
import { useMyReports } from '@/hooks/use-reports';
import { getSubmittedReports, type DraftReport, type ReportSyncStatus } from '@/lib/drafts';
import { languageDateLocales } from '@/lib/i18n';
import type { Report, StatusOption } from '@/lib/sync/types';

type ReportFilter = 'all' | 'pending' | 'rejected' | 'reviewed';

interface VisibleReport {
  createdAt?: string;
  id: string;
  notes?: string;
  reviewStatus?: Report['reviewStatus'];
  stationId: string;
  stationLabel?: string;
  status: StatusOption[];
  syncStatus?: ReportSyncStatus;
}

function reportTime(value?: string): number {
  if (!value) {
    return 0;
  }

  const time = new Date(value).getTime();

  return Number.isNaN(time) ? 0 : time;
}

function toVisibleRemoteReport(report: Report): VisibleReport {
  return {
    createdAt: report.submittedAt,
    id: report.reportId,
    notes: report.notes ?? report.reviewNotes,
    reviewStatus: report.reviewStatus,
    stationId: report.stationId,
    stationLabel: report.stationLabel,
    status: report.status,
  };
}

function toVisibleLocalReport(report: DraftReport): VisibleReport {
  return {
    createdAt: report.submittedAt ?? report.createdAt,
    id: report.id,
    notes: report.notes,
    stationId: report.stationId,
    stationLabel: report.stationLabel,
    status: report.status,
    syncStatus: report.syncStatus,
  };
}

function reportMatchesFilter(report: VisibleReport, filter: ReportFilter): boolean {
  if (filter === 'all') {
    return true;
  }

  return report.reviewStatus === filter;
}

function ReportListItem({ report }: { report: VisibleReport }) {
  const { language, strings } = useLanguage();
  const { reviewStatus, syncStatus } = strings;
  const theme = useTheme();
  const locale = languageDateLocales[language];
  const title = report.stationLabel ?? `${strings.report.stationLabel} #${report.stationId}`;
  const dateLabel = report.createdAt
    ? new Intl.DateTimeFormat(locale, { day: 'numeric', hour: '2-digit', minute: '2-digit', month: 'short' }).format(new Date(report.createdAt))
    : '';
  const chipLabel = report.reviewStatus ? reviewStatus[report.reviewStatus] : report.syncStatus ? syncStatus[report.syncStatus] : syncStatus.queued;
  const chipTone = report.reviewStatus === 'reviewed' || report.syncStatus === 'submitted'
    ? 'success'
    : report.reviewStatus === 'rejected' || report.syncStatus === 'failed'
      ? 'danger'
      : 'warning';
  const iconName = chipTone === 'success' ? 'file-check' : chipTone === 'danger' ? 'alert-circle' : 'file-text';
  const iconBackground = chipTone === 'success' ? theme.primarySoft : chipTone === 'danger' ? theme.dangerSoft : theme.warningSoft;
  const iconColor = chipTone === 'success' ? theme.primary : chipTone === 'danger' ? theme.dangerStrong : theme.warningStrong;

  return (
    <View
      style={[
        styles.reportCard,
        Shadow.sm,
        {
          backgroundColor: theme.backgroundElement,
          borderColor: theme.border,
          flexDirection: 'row',
        },
      ]}>
      <View style={[styles.reportIcon, { backgroundColor: iconBackground }]}>
        <EcoPestIcon color={iconColor} name={iconName} size={28} />
      </View>
      <View style={styles.reportCopy}>
        <ThemedText type="title" numberOfLines={1} style={styles.reportTitle}>
          {title}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          #{report.stationId} · {dateLabel}
        </ThemedText>
        {report.notes ? (
          <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
            {report.notes}
          </ThemedText>
        ) : null}
      </View>
      <StatusChip label={chipLabel} tone={chipTone} />
    </View>
  );
}

export default function HistoryScreen() {
  const [localReports, setLocalReports] = useState<DraftReport[]>([]);
  const [searchText, setSearchText] = useState('');
  const [activeFilter, setActiveFilter] = useState<ReportFilter>('all');
  const { isRtl, language, strings } = useLanguage();
  const theme = useTheme();
  const remoteReports = useMyReports(strings.errors.loadReports);

  const refreshLocalReports = useCallback(async () => {
    setLocalReports(await getSubmittedReports());
  }, []);

  useFocusEffect(
    useCallback(() => {
      void refreshLocalReports();
    }, [refreshLocalReports]),
  );

  const visibleLocalReports = useMemo(() => {
    const remoteIds = new Set(remoteReports.reports.flatMap((report) => [report.reportId, report.clientReportId].filter(Boolean)));

    return localReports.filter((report) => {
      if (report.serverReportId && remoteIds.has(report.serverReportId)) {
        return false;
      }

      return !remoteIds.has(report.id);
    });
  }, [localReports, remoteReports.reports]);

  const reports = useMemo(
    () =>
      [...remoteReports.reports.map(toVisibleRemoteReport), ...visibleLocalReports.map(toVisibleLocalReport)].sort(
        (first, second) => reportTime(second.createdAt) - reportTime(first.createdAt),
      ),
    [remoteReports.reports, visibleLocalReports],
  );

  const filteredReports = useMemo(() => {
    const query = searchText.trim().toLowerCase();

    return reports.filter((report) => {
      const title = `${report.stationLabel ?? ''} ${report.stationId} ${report.notes ?? ''}`.toLowerCase();

      return reportMatchesFilter(report, activeFilter) && (!query || title.includes(query));
    });
  }, [activeFilter, reports, searchText]);

  const filters: { label: string; value: ReportFilter }[] = [
    { label: strings.history.filterAll, value: 'all' },
    { label: strings.reviewStatus.pending, value: 'pending' },
    { label: strings.reviewStatus.reviewed, value: 'reviewed' },
    { label: strings.reviewStatus.rejected, value: 'rejected' },
  ];

  return (
    <ScreenShell>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.scrollContent} contentInsetAdjustmentBehavior="automatic" showsVerticalScrollIndicator={false}>
          <MobileTopBar
            leftIcon="menu"
            leftLabel={strings.actions.menu}
            onLeftPress={() => router.push('/(tabs)')}
            onRightPress={() => router.push('/(tabs)/settings')}
            rightIcon="user"
            rightLabel={strings.actions.account}
            title={strings.history.title}
          />

          <View style={[styles.searchRow, { flexDirection: 'row' }]}>
            <View
              style={[
                styles.searchBox,
                {
                  backgroundColor: theme.backgroundElement,
                  borderColor: theme.border,
                  flexDirection: 'row',
                },
              ]}>
              <EcoPestIcon color={theme.textSecondary} name="search" size={26} />
              <TextInput
                onChangeText={setSearchText}
                placeholder={strings.history.searchPlaceholder}
                placeholderTextColor={theme.textSecondary}
                style={[
                  styles.searchInput,
                  {
                    color: theme.text,
                    textAlign: isRtl ? 'right' : 'left',
                    writingDirection: language === 'ar' ? 'rtl' : 'ltr',
                  },
                ]}
                value={searchText}
              />
            </View>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
            <View style={[styles.filterPills, { flexDirection: 'row' }]}>
              {filters.map((filter) => {
                const selected = activeFilter === filter.value;

                return (
                  <Pressable
                    accessibilityRole="button"
                    key={filter.value}
                    onPress={() => setActiveFilter(filter.value)}
                    style={[
                      styles.filterPill,
                      {
                        backgroundColor: selected ? theme.primaryLight : theme.backgroundElement,
                        borderColor: selected ? theme.primaryLight : theme.border,
                      },
                    ]}>
                    <ThemedText type="smallBold" style={{ color: selected ? theme.onPrimary : theme.text }}>
                      {filter.label}
                    </ThemedText>
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>

          {remoteReports.error ? <SyncBanner body={remoteReports.error} title={strings.report.stationUnavailable} tone="warning" /> : null}

          {!remoteReports.loading && filteredReports.length === 0 ? (
            <View style={[styles.emptyCard, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
              <EmptyState subtitle={strings.history.emptyBody} title={strings.history.emptyTitle} />
            </View>
          ) : null}

          <View style={styles.reportList}>
            {filteredReports.map((report) => (
              <ReportListItem key={report.id} report={report} />
            ))}
          </View>
        </ScrollView>
      </SafeAreaView>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  emptyCard: {
    borderRadius: Radius.lg,
    borderWidth: 1,
  },
  filterPill: {
    alignItems: 'center',
    borderRadius: Radius.full,
    borderWidth: 1,
    minHeight: 52,
    minWidth: 82,
    paddingHorizontal: Spacing.lg,
    justifyContent: 'center',
  },
  filterPills: {
    gap: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  filterScroll: {
    marginHorizontal: -Spacing.md,
    paddingHorizontal: Spacing.md,
  },
  reportCard: {
    alignItems: 'center',
    borderRadius: Radius.lg,
    borderWidth: 1,
    gap: Spacing.md,
    minHeight: 118,
    padding: Spacing.lg,
  },
  reportCopy: {
    flex: 1,
    gap: Spacing.xs,
  },
  reportIcon: {
    alignItems: 'center',
    borderRadius: Radius.full,
    height: 68,
    justifyContent: 'center',
    width: 68,
  },
  reportList: {
    gap: Spacing.md,
  },
  reportTitle: {
    fontFamily: Fonts.sansHeavy,
    fontSize: Typography.fontSize.lg,
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
    flex: 1,
    gap: Spacing.sm,
    minHeight: 64,
    paddingHorizontal: Spacing.md,
  },
  searchInput: {
    flex: 1,
    fontFamily: Fonts.sans,
    fontSize: Typography.fontSize.md,
    minHeight: TouchTarget,
  },
  searchRow: {
    alignItems: 'center',
    gap: Spacing.md,
  },
});
