import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  Card,
  EmptyState,
  InputField,
  MobileTopBar,
  PrimaryButton,
  ReportCard,
  ScreenShell,
  SecondaryButton,
  StatusChip,
  SyncBanner,
  useToast,
} from '@/components/ecopest-ui';
import { EcoPestIcon, type EcoPestIconName } from '@/components/icons';
import { ThemedText } from '@/components/themed-text';
import { BottomTabInset, Fonts, Radius, Shadow, Spacing, Typography } from '@/constants/theme';
import { useLanguage } from '@/contexts/language-context';
import { useTheme } from '@/hooks/use-theme';
import { useCurrentUser } from '@/lib/auth';
import { errorHaptic, successHaptic, warningHaptic } from '@/lib/haptics';
import { languageDateLocales, type Language } from '@/lib/i18n';
import { apiGet, apiPatch, apiPost } from '@/lib/sync/api-client';
import type {
  AttendanceSession,
  ClientOrderStatus,
  MobileClientOrder,
  MobileClientOrdersResponse,
  MobileReviewReport,
  Station,
} from '@/lib/sync/types';

type OrderTone = 'danger' | 'info' | 'neutral' | 'success' | 'warning';

interface OrderFormState {
  note: string;
  stationDescription: string;
  stationLabel: string;
  stationLocation: string;
}

const emptyOrderForm: OrderFormState = {
  note: '',
  stationDescription: '',
  stationLabel: '',
  stationLocation: '',
};

const orderStatuses = ['pending', 'in_progress', 'completed', 'cancelled'] as const satisfies readonly ClientOrderStatus[];

const copy = {
  ar: {
    accessDeniedBody: 'هذه الشاشة مخصصة لعملاء النظام لمتابعة طلبات الفحص.',
    clientName: 'العميل',
    awaitingApproval: 'بانتظار موافقة الإدارة',
    approveOrder: 'اعتماد',
    createBody: 'أضف موقع المحطة؛ بعد موافقة المشرف أو المدير تُنشأ المحطة وتُربط بحسابك.',
    createTitle: 'طلب فحص محطة',
    emptyOrdersBody: 'طلبات الفحص الجديدة ستظهر هنا بعد الإرسال.',
    emptyOrdersTitle: 'لا توجد طلبات بعد',
    emptyReportsBody: 'تقارير الزيارات الخاصة بمحطاتك ستظهر هنا بعد مراجعة الفريق.',
    emptyStationsBody: 'المحطات التي أنشأتها من الطلبات ستظهر هنا.',
    latestReports: 'تقارير المحطات المطلوبة',
    loadError: 'تعذر تحميل طلبات العملاء.',
    myStations: 'محطاتي',
    note: 'ملاحظات الطلب',
    notePlaceholder: 'أي تفاصيل تساعد فريق الفحص',
    orders: 'طلبات العملاء',
    rejectOrder: 'رفض',
    orderSaved: 'تم إرسال طلب الفحص.',
    orderStatusSaved: 'تم تحديث حالة الطلب.',
    refresh: 'تحديث',
    stationDescription: 'بيانات المحطة',
    stationDescriptionPlaceholder: 'وصف إضافي عن المكان أو المحطة',
    stationLabel: 'اسم المحطة',
    stationLabelPlaceholder: 'مثال: محطة مخزن 3',
    stationLocation: 'موقع المحطة',
    stationLocationPlaceholder: 'مثال: الرياض - حي النخيل - مبنى A',
    submit: 'إرسال الطلب',
    title: 'طلبات العملاء',
    totalOrders: 'إجمالي الطلبات',
    totalReports: 'تقارير الفحص',
    totalStations: 'محطات مطلوبة',
    validation: 'أدخل اسم المحطة وموقعها قبل الإرسال.',
    attendanceClockIn: 'حضور',
    attendanceClockOut: 'انصراف',
    attendanceCompleted: 'مكتمل',
    attendanceInProgress: 'قيد العمل',
    attendanceUnknownStation: 'محطة غير محددة',
    technicianAttendance: 'آخر حضور الفنيين',
    technicianAttendanceBody: 'عند تسجيل حضور فني في إحدى محطاتك سيظهر السجل هنا.',
    totalAttendance: 'زيارات الفنيين',
  },
  en: {
    accessDeniedBody: 'This screen is for client accounts that track inspection requests.',
    clientName: 'Client',
    awaitingApproval: 'Awaiting admin approval',
    approveOrder: 'Approve',
    createBody:
      'Add the station details. Once a supervisor or manager approves, the station record is created and linked to your account.',
    createTitle: 'Request station inspection',
    emptyOrdersBody: 'New inspection requests will appear here after submission.',
    emptyOrdersTitle: 'No orders yet',
    emptyReportsBody: 'Visit reports for your requested stations will appear here after field work.',
    emptyStationsBody: 'Stations created from your requests will appear here.',
    latestReports: 'Requested station reports',
    loadError: 'Could not load client orders.',
    myStations: 'My stations',
    note: 'Request notes',
    notePlaceholder: 'Any details that help the inspection team',
    orders: 'Client orders',
    rejectOrder: 'Reject',
    orderSaved: 'Inspection request sent.',
    orderStatusSaved: 'Order status updated.',
    refresh: 'Refresh',
    stationDescription: 'Station details',
    stationDescriptionPlaceholder: 'Additional details about the place or station',
    stationLabel: 'Station name',
    stationLabelPlaceholder: 'Example: Warehouse station 3',
    stationLocation: 'Station location',
    stationLocationPlaceholder: 'Example: Building A, north warehouse',
    submit: 'Send request',
    title: 'Client orders',
    totalOrders: 'Total orders',
    totalReports: 'Inspection reports',
    totalStations: 'Requested stations',
    validation: 'Enter the station name and location before sending.',
    attendanceClockIn: 'Clock-in',
    attendanceClockOut: 'Clock-out',
    attendanceCompleted: 'Completed',
    attendanceInProgress: 'In progress',
    attendanceUnknownStation: 'Station not set',
    technicianAttendance: 'Technician visits',
    technicianAttendanceBody: 'When a technician clocks in at your stations, visits appear here.',
    totalAttendance: 'Technician visits',
  },
} as const;

const statusCopy: Record<Language, Record<ClientOrderStatus, string>> = {
  ar: {
    pending: 'جديد',
    in_progress: 'قيد التنفيذ',
    completed: 'مكتمل',
    cancelled: 'ملغي',
  },
  en: {
    pending: 'New',
    in_progress: 'In progress',
    completed: 'Completed',
    cancelled: 'Cancelled',
  },
};

function orderNeedsAdminApproval(order: MobileClientOrder): boolean {
  return order.status === 'pending' && (!order.stationId || order.stationId.length === 0);
}

function statusTone(status: ClientOrderStatus): OrderTone {
  if (status === 'completed') {
    return 'success';
  }

  if (status === 'cancelled') {
    return 'danger';
  }

  if (status === 'in_progress') {
    return 'info';
  }

  return 'warning';
}

function formatDate(value: string | undefined, locale: string, fallback: string): string {
  if (!value) {
    return fallback;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return fallback;
  }

  return new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

function MetricCard({ icon, label, value }: { icon: EcoPestIconName; label: string; value: string }) {
  const theme = useTheme();

  return (
    <View style={[styles.metricCard, Shadow.sm, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
      <EcoPestIcon color={theme.primary} name={icon} size={26} />
      <View style={styles.metricCopy}>
        <ThemedText type="small" themeColor="textSecondary">
          {label}
        </ThemedText>
        <ThemedText style={styles.metricValue}>{value}</ThemedText>
      </View>
    </View>
  );
}

function OrderCard({
  language,
  locale,
  onStatusChange,
  order,
  updatingStatus,
}: {
  language: Language;
  locale: string;
  onStatusChange?: (order: MobileClientOrder, status: ClientOrderStatus) => void;
  order: MobileClientOrder;
  updatingStatus?: string | null;
}) {
  const { strings } = useLanguage();
  const theme = useTheme();
  const t = copy[language];
  const isUpdating = updatingStatus === order.orderId;
  const needsApproval = orderNeedsAdminApproval(order);

  return (
    <Card>
      <View style={[styles.cardHeader, { flexDirection: 'row' }]}>
        <View style={styles.cardCopy}>
          <ThemedText type="title">{order.stationLabel}</ThemedText>
          <ThemedText selectable type="small" themeColor="textSecondary">
            {order.stationId
              ? `#${order.stationId} · ${order.stationLocation ?? strings.report.locationUnavailable}`
              : `${t.awaitingApproval} · ${order.stationLocation ?? order.proposalLocation ?? strings.report.locationUnavailable}`}
          </ThemedText>
        </View>
        <StatusChip
          label={needsApproval ? t.awaitingApproval : statusCopy[language][order.status]}
          tone={needsApproval ? 'warning' : statusTone(order.status)}
        />
      </View>
      <View style={[styles.metaRow, { flexDirection: 'row' }]}>
        <StatusChip label={`${t.clientName}: ${order.clientName}`} tone="info" />
        <StatusChip label={formatDate(order.createdAt, locale, strings.scan.previewMissing)} tone="neutral" />
      </View>
      {order.note ? (
        <ThemedText type="small" themeColor="textSecondary">
          {order.note}
        </ThemedText>
      ) : null}
      {onStatusChange ? (
        <View style={[styles.statusActions, { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }]}>
          {needsApproval ? (
            <>
              <SecondaryButton loading={isUpdating} onPress={() => onStatusChange(order, 'in_progress')} stretch>
                {t.approveOrder}
              </SecondaryButton>
              <SecondaryButton loading={isUpdating} onPress={() => onStatusChange(order, 'cancelled')} stretch>
                {t.rejectOrder}
              </SecondaryButton>
            </>
          ) : (
            orderStatuses.map((status) => (
              <SecondaryButton
                key={status}
                loading={isUpdating && order.status !== status}
                onPress={() => onStatusChange(order, status)}
                selected={order.status === status}
                stretch>
                {statusCopy[language][status]}
              </SecondaryButton>
            ))
          )}
        </View>
      ) : null}
      {order.photoUrl ? (
        <ThemedText selectable type="linkPrimary" style={{ color: theme.primary }}>
          {order.photoUrl}
        </ThemedText>
      ) : null}
    </Card>
  );
}

type OrdersTabCopy = (typeof copy)[keyof typeof copy];

function AttendanceSessionCard({ locale, session, text }: { locale: string; session: AttendanceSession; text: OrdersTabCopy }) {
  const open = !session.clockOutAt;

  function formatIso(iso: string | undefined): string {
    if (!iso) {
      return '';
    }

    const date = new Date(iso);

    if (Number.isNaN(date.getTime())) {
      return '';
    }

    return new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(date);
  }

  const stationTitle = session.clockInLocation?.stationLabel ?? text.attendanceUnknownStation;

  return (
    <Card>
      <View style={[styles.cardHeader, { flexDirection: 'row' }]}>
        <View style={styles.cardCopy}>
          <ThemedText type="title">{session.technicianName}</ThemedText>
          <ThemedText selectable type="small" themeColor="textSecondary">
            {stationTitle}
          </ThemedText>
        </View>
        <StatusChip label={open ? text.attendanceInProgress : text.attendanceCompleted} tone={open ? 'warning' : 'success'} />
      </View>
      <View style={{ gap: 4 }}>
        <ThemedText type="small" themeColor="textSecondary">
          {text.attendanceClockIn}: {formatIso(session.clockInAt) || '—'}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {text.attendanceClockOut}: {formatIso(session.clockOutAt) || (open ? text.attendanceInProgress : '—')}
        </ThemedText>
      </View>
    </Card>
  );
}

function StationCard({ locale, station }: { locale: string; station: Station }) {
  const { strings } = useLanguage();

  return (
    <Card>
      <View style={[styles.cardHeader, { flexDirection: 'row' }]}>
        <View style={styles.cardCopy}>
          <ThemedText type="title">{station.label}</ThemedText>
          <ThemedText selectable type="small" themeColor="textSecondary">
            #{station.stationId} · {station.location}
          </ThemedText>
        </View>
        <StatusChip label={station.isActive ? strings.report.stationActive : strings.report.stationInactive} tone={station.isActive ? 'success' : 'neutral'} />
      </View>
      <View style={[styles.metaRow, { flexDirection: 'row' }]}>
        {station.zone ? <StatusChip label={station.zone} tone="info" /> : null}
        <StatusChip label={`${strings.scan.stationLastVisit}: ${formatDate(station.lastVisitedAt, locale, strings.scan.previewMissing)}`} tone="neutral" />
      </View>
      {station.description ? (
        <ThemedText type="small" themeColor="textSecondary">
          {station.description}
        </ThemedText>
      ) : null}
    </Card>
  );
}

export default function ClientOrdersScreen() {
  const currentUser = useCurrentUser();
  const { language, roleLabels, strings } = useLanguage();
  const theme = useTheme();
  const { showToast } = useToast();
  const t = copy[language];
  const locale = languageDateLocales[language];
  const [orders, setOrders] = useState<MobileClientOrder[]>([]);
  const [stations, setStations] = useState<Station[]>([]);
  const [reports, setReports] = useState<MobileReviewReport[]>([]);
  const [attendanceSessions, setAttendanceSessions] = useState<AttendanceSession[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<OrderFormState>(emptyOrderForm);
  const isClient = currentUser?.profile.role === 'client';
  const isAdmin = currentUser?.profile.role === 'manager' || currentUser?.profile.role === 'supervisor';

  const sortedReports = useMemo(
    () =>
      [...reports].sort((first, second) => {
        const firstTime = first.submittedAt ? new Date(first.submittedAt).getTime() : 0;
        const secondTime = second.submittedAt ? new Date(second.submittedAt).getTime() : 0;

        return secondTime - firstTime;
      }),
    [reports],
  );

  const sortedAttendanceSessions = useMemo(
    () =>
      [...attendanceSessions].sort((first, second) => {
        const firstTime = first.clockInAt ? new Date(first.clockInAt).getTime() : 0;
        const secondTime = second.clockInAt ? new Date(second.clockInAt).getTime() : 0;

        return secondTime - firstTime;
      }),
    [attendanceSessions],
  );

  const loadOrders = useCallback(async (): Promise<void> => {
    setLoading(true);

    try {
      const data = await apiGet<MobileClientOrdersResponse>('/api/mobile/client-orders', {
        authRequiredMessage: strings.auth.sessionExpired,
        fallbackErrorMessage: t.loadError,
        networkErrorMessage: t.loadError,
      });

      setOrders(data.orders);
      setStations(data.stations ?? []);
      setReports(data.reports ?? []);
      setAttendanceSessions(data.attendanceSessions ?? []);
      setError(null);
    } catch (loadError: unknown) {
      setError(loadError instanceof Error ? loadError.message : t.loadError);
    } finally {
      setLoading(false);
    }
  }, [strings.auth.sessionExpired, t.loadError]);

  useFocusEffect(
    useCallback(() => {
      void loadOrders();
    }, [loadOrders]),
  );

  async function createOrder(): Promise<void> {
    if (!form.stationLabel.trim() || !form.stationLocation.trim()) {
      setError(t.validation);
      await warningHaptic();
      return;
    }

    setSubmitting(true);

    try {
      await apiPost<MobileClientOrder, OrderFormState>('/api/mobile/client-orders', form, {
        authRequiredMessage: strings.auth.sessionExpired,
        fallbackErrorMessage: t.loadError,
        networkErrorMessage: t.loadError,
      });
      setForm(emptyOrderForm);
      await loadOrders();
      showToast(t.orderSaved, 'success');
      await successHaptic();
    } catch (submitError: unknown) {
      showToast(submitError instanceof Error ? submitError.message : t.loadError, 'error');
      await errorHaptic();
    } finally {
      setSubmitting(false);
    }
  }

  async function updateOrderStatus(order: MobileClientOrder, status: ClientOrderStatus): Promise<void> {
    if (order.status === status) {
      return;
    }

    setUpdatingStatus(order.orderId);

    try {
      await apiPatch<{ success: true }, { status: ClientOrderStatus }>(
        `/api/mobile/client-orders/${encodeURIComponent(order.orderId)}`,
        { status },
        {
          authRequiredMessage: strings.auth.sessionExpired,
          fallbackErrorMessage: t.loadError,
          networkErrorMessage: t.loadError,
        },
      );
      await loadOrders();
      showToast(t.orderStatusSaved, 'success');
      await successHaptic();
    } catch (statusError: unknown) {
      showToast(statusError instanceof Error ? statusError.message : t.loadError, 'error');
      await errorHaptic();
    } finally {
      setUpdatingStatus(null);
    }
  }

  if (currentUser && !isClient && !isAdmin) {
    return (
      <ScreenShell>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.centerContent}>
            <StatusChip label={roleLabels[currentUser.profile.role]} tone="warning" />
            <ThemedText type="title">{strings.errors.accessDeniedTitle}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary" style={styles.centerText}>
              {t.accessDeniedBody}
            </ThemedText>
            <PrimaryButton onPress={() => router.replace('/(tabs)')}>{strings.actions.back}</PrimaryButton>
          </View>
        </SafeAreaView>
      </ScreenShell>
    );
  }

  return (
    <ScreenShell>
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.keyboardView}>
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            contentInsetAdjustmentBehavior="automatic"
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}>
            <MobileTopBar
              leftIcon="menu"
              leftLabel={strings.actions.menu}
              onLeftPress={() => router.push('/(tabs)')}
              onRightPress={() => void loadOrders()}
              rightIcon="check-cloud"
              rightLabel={t.refresh}
              title={t.title}
            />

            <View style={[styles.heroCard, Shadow.sm, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
              <View style={[styles.cardHeader, { flexDirection: 'row' }]}>
                <View style={[styles.heroIcon, { backgroundColor: theme.primarySoft }]}>
                  <EcoPestIcon color={theme.primary} name="clipboard-check" size={32} />
                </View>
                <View style={styles.cardCopy}>
                  <ThemedText type="subtitle">{t.orders}</ThemedText>
                  <ThemedText themeColor="textSecondary">{isClient ? t.createBody : strings.dashboard.supervisorTitle}</ThemedText>
                </View>
              </View>
              <View style={[styles.metricsGrid, { flexDirection: 'row' }]}>
                <MetricCard icon="clipboard-check" label={t.totalOrders} value={String(orders.length)} />
                <MetricCard icon="target" label={t.totalStations} value={String(stations.length)} />
                <MetricCard icon="file-text" label={t.totalReports} value={String(reports.length)} />
                {isClient ? <MetricCard icon="map-pin" label={t.totalAttendance} value={String(attendanceSessions.length)} /> : null}
              </View>
            </View>

            {loading ? <ActivityIndicator color={theme.primary} /> : null}
            {error ? <SyncBanner body={error} title={t.loadError} tone="warning" /> : null}

            {isClient ? (
              <Card>
                <ThemedText type="title">{t.createTitle}</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {t.createBody}
                </ThemedText>
                <InputField
                  label={t.stationLabel}
                  onChangeText={(value) => setForm((current) => ({ ...current, stationLabel: value }))}
                  placeholder={t.stationLabelPlaceholder}
                  value={form.stationLabel}
                />
                <InputField
                  label={t.stationLocation}
                  onChangeText={(value) => setForm((current) => ({ ...current, stationLocation: value }))}
                  placeholder={t.stationLocationPlaceholder}
                  value={form.stationLocation}
                />
                <InputField
                  label={t.stationDescription}
                  multiline
                  onChangeText={(value) => setForm((current) => ({ ...current, stationDescription: value }))}
                  placeholder={t.stationDescriptionPlaceholder}
                  value={form.stationDescription}
                />
                <InputField
                  label={t.note}
                  multiline
                  onChangeText={(value) => setForm((current) => ({ ...current, note: value }))}
                  placeholder={t.notePlaceholder}
                  value={form.note}
                />
                <PrimaryButton icon="send" loading={submitting} onPress={() => void createOrder()}>
                  {t.submit}
                </PrimaryButton>
              </Card>
            ) : null}

            <View style={styles.sectionStack}>
              <ThemedText type="title">{t.orders}</ThemedText>
              {orders.length === 0 && !loading ? (
                <View style={[styles.emptyCard, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
                  <EmptyState subtitle={t.emptyOrdersBody} title={t.emptyOrdersTitle} />
                </View>
              ) : null}
              {orders.map((order) => (
                <OrderCard
                  key={order.orderId}
                  language={language}
                  locale={locale}
                  onStatusChange={isAdmin ? (nextOrder, status) => void updateOrderStatus(nextOrder, status) : undefined}
                  order={order}
                  updatingStatus={updatingStatus}
                />
              ))}
            </View>

            {isClient ? (
              <>
                <View style={styles.sectionStack}>
                  <ThemedText type="title">{t.myStations}</ThemedText>
                  {stations.length === 0 && !loading ? (
                    <View style={[styles.emptyCard, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
                      <EmptyState subtitle={t.emptyStationsBody} title={t.myStations} />
                    </View>
                  ) : null}
                  {stations.map((station) => (
                    <StationCard key={station.stationId} locale={locale} station={station} />
                  ))}
                </View>

                <View style={styles.sectionStack}>
                  <ThemedText type="title">{t.latestReports}</ThemedText>
                  {sortedReports.length === 0 && !loading ? (
                    <View style={[styles.emptyCard, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
                      <EmptyState subtitle={t.emptyReportsBody} title={t.latestReports} />
                    </View>
                  ) : null}
                  {sortedReports.map((report) => (
                    <ReportCard
                      createdAt={report.submittedAt}
                      key={report.reportId}
                      notes={report.notes ?? report.reviewNotes}
                      reviewStatus={report.reviewStatus}
                      stationId={report.stationId}
                      stationLabel={`${report.stationLabel} · ${report.technicianName}`}
                      status={report.status}
                    />
                  ))}
                </View>

                <View style={styles.sectionStack}>
                  <ThemedText type="title">{t.technicianAttendance}</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    {t.technicianAttendanceBody}
                  </ThemedText>
                  {sortedAttendanceSessions.length === 0 && !loading ? (
                    <View style={[styles.emptyCard, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
                      <EmptyState subtitle={t.technicianAttendanceBody} title={t.technicianAttendance} />
                    </View>
                  ) : null}
                  {sortedAttendanceSessions.map((session) => (
                    <AttendanceSessionCard key={session.attendanceId} locale={locale} session={session} text={t} />
                  ))}
                </View>
              </>
            ) : null}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  cardCopy: {
    flex: 1,
    gap: Spacing.xs,
  },
  cardHeader: {
    alignItems: 'flex-start',
    gap: Spacing.md,
    justifyContent: 'space-between',
  },
  centerContent: {
    alignItems: 'center',
    flex: 1,
    gap: Spacing.md,
    justifyContent: 'center',
    padding: Spacing.lg,
  },
  centerText: {
    maxWidth: 320,
    textAlign: 'center',
  },
  emptyCard: {
    borderRadius: Radius.lg,
    borderWidth: 1,
  },
  heroCard: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    gap: Spacing.lg,
    padding: Spacing.lg,
  },
  heroIcon: {
    alignItems: 'center',
    borderRadius: Radius.lg,
    height: 62,
    justifyContent: 'center',
    width: 62,
  },
  keyboardView: {
    flex: 1,
  },
  metaRow: {
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  metricCard: {
    alignItems: 'flex-start',
    borderRadius: Radius.lg,
    borderWidth: 1,
    flex: 1,
    gap: Spacing.md,
    minHeight: 112,
    minWidth: 132,
    padding: Spacing.md,
  },
  metricCopy: {
    gap: Spacing.xs,
    width: '100%',
  },
  metricValue: {
    fontFamily: Fonts.sansHeavy,
    fontSize: Typography.fontSize.xxl,
    lineHeight: Typography.fontSize.xxl * Typography.lineHeight.tight,
  },
  metricsGrid: {
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  safeArea: {
    flex: 1,
    width: '100%',
  },
  scrollContent: {
    gap: Spacing.lg,
    paddingBottom: BottomTabInset + Spacing.xl,
  },
  sectionStack: {
    gap: Spacing.md,
  },
  statusActions: {
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
});
