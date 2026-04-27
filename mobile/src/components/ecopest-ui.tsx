// EcoPest mobile UI primitives for field-first screens and shared interaction feedback.
import {
  ActivityIndicator,
  Animated,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
  type GestureResponderEvent,
  type PressableProps,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';
import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { EcoPestIcon, type EcoPestIconName } from '@/components/icons';
import { Fonts, Radius, Shadow, Spacing, TouchTarget, Typography } from '@/constants/theme';
import { useLanguage } from '@/contexts/language-context';
import { useTheme } from '@/hooks/use-theme';
import { selectionHaptic } from '@/lib/haptics';
import { languageDateLocales } from '@/lib/i18n';
import type { Station, StatusOption } from '@/lib/sync/types';
import type { ReportSyncStatus } from '@/lib/drafts';

type FeedbackVariant = 'default' | 'success' | 'warning' | 'danger' | 'info';
type SyncState = 'synced' | 'pending' | 'failed' | 'syncing';
type ToastVariant = 'success' | 'warning' | 'error' | 'info';

interface LoadingButtonProps extends PressableProps {
  children: ReactNode;
  icon?: EcoPestIconName;
  loading?: boolean;
  selected?: boolean;
  stretch?: boolean;
}

interface CardProps {
  accessibilityLabel?: string;
  children: ReactNode;
  disabled?: boolean;
  onPress?: PressableProps['onPress'];
  style?: StyleProp<ViewStyle>;
  variant?: FeedbackVariant;
}

interface ToastMessage {
  id: number;
  message: string;
  variant: ToastVariant;
}

interface ToastContextValue {
  showToast: (message: string, variant?: ToastVariant) => void;
}

interface InputFieldProps extends TextInputProps {
  error?: string | null;
  label: string;
}

type ChipTone = 'danger' | 'info' | 'neutral' | 'success' | 'warning';

const ToastContext = createContext<ToastContextValue | null>(null);

const statusColors: Record<StatusOption, { background: string; text: string }> = {
  station_ok: { background: '#dcfce7', text: '#166534' },
  station_replaced: { background: '#dbeafe', text: '#1d4ed8' },
  bait_changed: { background: '#fef3c7', text: '#92400e' },
  bait_ok: { background: '#ccfbf1', text: '#0f766e' },
  station_excluded: { background: '#fee2e2', text: '#991b1b' },
  station_substituted: { background: '#f3e8ff', text: '#7e22ce' },
};

function usePressScale(activeScale: number) {
  const scale = useRef(new Animated.Value(1)).current;

  const pressIn = useCallback(() => {
    Animated.spring(scale, {
      friction: 8,
      tension: 180,
      toValue: activeScale,
      useNativeDriver: true,
    }).start();
  }, [activeScale, scale]);

  const pressOut = useCallback(() => {
    Animated.spring(scale, {
      friction: 8,
      tension: 180,
      toValue: 1,
      useNativeDriver: true,
    }).start();
  }, [scale]);

  return { pressIn, pressOut, scale };
}

function variantColor(variant: FeedbackVariant, theme: ReturnType<typeof useTheme>): string {
  if (variant === 'success') {
    return theme.successStrong;
  }

  if (variant === 'warning') {
    return theme.warningStrong;
  }

  if (variant === 'danger') {
    return theme.dangerStrong;
  }

  if (variant === 'info') {
    return theme.accent;
  }

  return theme.border;
}

function callHandler(
  handler: ((event: GestureResponderEvent) => void) | null | undefined,
  event: GestureResponderEvent,
): void {
  if (handler) {
    handler(event);
  }
}

export function BrandHeader({ compact = false, subtitle }: { compact?: boolean; subtitle?: string }) {
  const theme = useTheme();
  const { isRtl, strings } = useLanguage();
  const brandSubtitle = subtitle ?? strings.brandTagline;

  return (
    <View style={[styles.brandRow, compact && styles.brandRowCompact, { flexDirection: isRtl ? 'row-reverse' : 'row' }]}>
      <View
        style={[
          styles.brandMark,
          compact && styles.brandMarkCompact,
          { backgroundColor: theme.primarySoft, borderColor: theme.primaryLight },
        ]}>
        <ThemedText style={[styles.brandLetter, compact && styles.brandLetterCompact, { color: theme.primary }]}>م</ThemedText>
      </View>
      <View style={styles.brandCopy}>
        <View style={[styles.wordmarkRow, { flexDirection: isRtl ? 'row-reverse' : 'row' }]}>
          <ThemedText type="smallBold" style={[styles.brandNameArabic, compact && styles.brandNameCompact]}>
            {strings.appNameArabic}
          </ThemedText>
          <ThemedText type="smallBold" themeColor="textSecondary" style={compact && styles.brandNameCompact}>
            {strings.appName}
          </ThemedText>
        </View>
        {compact ? null : (
          <ThemedText type="small" themeColor="textSecondary">
            {brandSubtitle}
          </ThemedText>
        )}
      </View>
    </View>
  );
}

export function ScreenShell({ children }: { children: ReactNode }) {
  const theme = useTheme();
  const { direction } = useLanguage();

  return (
    <ThemedView style={[styles.shell, { direction }]}>
      <View style={[styles.content, { backgroundColor: theme.background }]}>{children}</View>
    </ThemedView>
  );
}

export function InputField({ error, label, multiline = false, style, ...props }: InputFieldProps) {
  const theme = useTheme();
  const { direction, isRtl } = useLanguage();

  return (
    <View style={styles.fieldGroup}>
      <ThemedText type="smallBold">{label}</ThemedText>
      <TextInput
        multiline={multiline}
        placeholderTextColor={theme.textSecondary}
        style={[
          styles.input,
          multiline ? styles.inputMultiline : null,
          {
            backgroundColor: theme.background,
            borderColor: error ? theme.danger : theme.border,
            color: theme.text,
            textAlign: isRtl ? 'right' : 'left',
            writingDirection: direction,
          },
          style,
        ]}
        textAlignVertical={multiline ? 'top' : undefined}
        {...props}
      />
      {error ? (
        <ThemedText selectable type="smallBold" style={{ color: theme.danger }}>
          {error}
        </ThemedText>
      ) : null}
    </View>
  );
}

export function Card({ accessibilityLabel, children, disabled, onPress, style, variant = 'default' }: CardProps) {
  const theme = useTheme();
  const { pressIn, pressOut, scale } = usePressScale(0.98);
  const accentColor = variantColor(variant, theme);
  const cardStyle = [
    styles.card,
    Shadow.sm,
    {
      backgroundColor: theme.surfaceCard,
      borderColor: variant === 'default' ? theme.border : accentColor,
    },
    style,
  ];

  if (!onPress) {
    return (
      <Animated.View style={[cardStyle, { transform: [{ scale }] }]}>
        {children}
      </Animated.View>
    );
  }

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Pressable
        accessibilityLabel={accessibilityLabel}
        accessibilityRole="button"
        disabled={disabled}
        onPress={onPress}
        onPressIn={pressIn}
        onPressOut={pressOut}
        style={cardStyle}>
        {children}
      </Pressable>
    </Animated.View>
  );
}

export function PrimaryButton({
  children,
  disabled,
  icon,
  loading = false,
  onPress,
  onPressIn,
  onPressOut,
  ...props
}: LoadingButtonProps) {
  const theme = useTheme();
  const { isRtl } = useLanguage();
  const { pressIn, pressOut, scale } = usePressScale(0.96);
  const isDisabled = disabled || loading;

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Pressable
        accessibilityRole="button"
        disabled={isDisabled}
        onPress={(event) => {
          void selectionHaptic();
          callHandler(onPress, event);
        }}
        onPressIn={(event) => {
          pressIn();
          callHandler(onPressIn, event);
        }}
        onPressOut={(event) => {
          pressOut();
          callHandler(onPressOut, event);
        }}
        style={({ pressed }) => [
          styles.button,
          {
            backgroundColor: isDisabled ? theme.backgroundSelected : theme.primary,
            flexDirection: isRtl ? 'row-reverse' : 'row',
            opacity: isDisabled ? 0.68 : 1,
          },
          pressed && !isDisabled ? styles.pressed : null,
        ]}
        {...props}>
        {loading ? <ActivityIndicator color={theme.onPrimary} /> : icon ? <EcoPestIcon color={theme.onPrimary} name={icon} size={22} /> : null}
        <ThemedText style={[styles.buttonText, { color: theme.onPrimary }]}>{children}</ThemedText>
      </Pressable>
    </Animated.View>
  );
}

export function SecondaryButton({
  children,
  disabled,
  icon,
  loading = false,
  onPress,
  selected = false,
  stretch = false,
  onPressIn,
  onPressOut,
  ...props
}: LoadingButtonProps) {
  const theme = useTheme();
  const { isRtl } = useLanguage();
  const { pressIn, pressOut, scale } = usePressScale(0.96);
  const isDisabled = disabled || loading;

  return (
    <Animated.View style={[styles.secondaryButtonWrap, stretch ? styles.secondaryButtonWrapStretch : null, { transform: [{ scale }] }]}>
      <Pressable
        accessibilityRole="button"
        disabled={isDisabled}
        onPress={(event) => {
          void selectionHaptic();
          callHandler(onPress, event);
        }}
        onPressIn={(event) => {
          pressIn();
          callHandler(onPressIn, event);
        }}
        onPressOut={(event) => {
          pressOut();
          callHandler(onPressOut, event);
        }}
        style={({ pressed }) => [
          styles.secondaryButton,
          {
            backgroundColor: selected ? theme.primarySoft : theme.surfaceCard,
            borderColor: selected ? theme.primary : theme.border,
            flexDirection: isRtl ? 'row-reverse' : 'row',
            opacity: isDisabled ? 0.62 : 1,
          },
          pressed && !isDisabled ? styles.pressed : null,
        ]}
        {...props}>
        {loading ? <ActivityIndicator color={theme.primary} /> : icon ? <EcoPestIcon color={selected ? theme.primary : theme.textSecondary} name={icon} size={20} /> : null}
        <ThemedText type="smallBold" style={{ color: selected ? theme.primary : theme.text }}>
          {children}
        </ThemedText>
      </Pressable>
    </Animated.View>
  );
}

export function IconButton({
  disabled,
  icon,
  label,
  loading = false,
  onPress,
  onPressIn,
  onPressOut,
  variant = 'surface',
  ...props
}: Omit<LoadingButtonProps, 'children' | 'icon'> & { icon: EcoPestIconName; label: string; variant?: 'primary' | 'surface' | 'ghost' }) {
  const theme = useTheme();
  const { pressIn, pressOut, scale } = usePressScale(0.94);
  const isDisabled = disabled || loading;
  const isPrimary = variant === 'primary';
  const iconColor = isPrimary ? theme.onPrimary : variant === 'ghost' ? theme.primary : theme.textSecondary;

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Pressable
        accessibilityLabel={label}
        accessibilityRole="button"
        disabled={isDisabled}
        onPress={(event) => {
          void selectionHaptic();
          callHandler(onPress, event);
        }}
        onPressIn={(event) => {
          pressIn();
          callHandler(onPressIn, event);
        }}
        onPressOut={(event) => {
          pressOut();
          callHandler(onPressOut, event);
        }}
        style={({ pressed }) => [
          styles.iconButton,
          {
            backgroundColor: isPrimary ? theme.primary : variant === 'surface' ? theme.backgroundElement : 'transparent',
            borderColor: variant === 'surface' ? theme.border : 'transparent',
            opacity: isDisabled ? 0.62 : 1,
          },
          pressed && !isDisabled ? styles.pressed : null,
        ]}
        {...props}>
        {loading ? (
          <ActivityIndicator color={iconColor} />
        ) : (
          <EcoPestIcon color={iconColor} name={icon} size={23} />
        )}
      </Pressable>
    </Animated.View>
  );
}

export function MobileTopBar({
  leftIcon,
  leftLabel,
  onLeftPress,
  onRightPress,
  rightIcon,
  rightLabel,
  title,
}: {
  leftIcon?: EcoPestIconName;
  leftLabel?: string;
  onLeftPress?: () => void;
  onRightPress?: () => void;
  rightIcon?: EcoPestIconName;
  rightLabel?: string;
  title: string;
}) {
  const { isRtl } = useLanguage();

  return (
    <View style={[styles.topBar, { flexDirection: isRtl ? 'row-reverse' : 'row' }]}>
      {leftIcon ? (
        <IconButton icon={leftIcon} label={leftLabel ?? title} onPress={onLeftPress} variant="ghost" />
      ) : (
        <View style={styles.topBarSpacer} />
      )}
      <ThemedText type="title" style={styles.topBarTitle}>
        {title}
      </ThemedText>
      {rightIcon ? (
        <IconButton icon={rightIcon} label={rightLabel ?? title} onPress={onRightPress} variant="surface" />
      ) : (
        <View style={styles.topBarSpacer} />
      )}
    </View>
  );
}

export function StatTile({
  icon,
  label,
  trend = 'neutral',
  value,
}: {
  icon?: string;
  label: string;
  trend?: 'up' | 'down' | 'neutral';
  value: string;
}) {
  const theme = useTheme();
  const trendColor = trend === 'up' ? theme.successStrong : trend === 'down' ? theme.dangerStrong : theme.textSecondary;
  const trendArrow = trend === 'up' ? '↑' : trend === 'down' ? '↓' : '';

  return (
    <Card style={styles.statTile}>
      <View style={styles.statHeader}>
        {icon ? <ThemedText style={styles.statIcon}>{icon}</ThemedText> : null}
        <ThemedText type="smallBold" style={{ color: trendColor }}>
          {trendArrow}
        </ThemedText>
      </View>
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
      <ThemedText type="subtitle" style={{ color: trendColor }}>
        {value}
      </ThemedText>
    </Card>
  );
}

export function StatusBadge({ status }: { status: StatusOption }) {
  const { statusOptionLabels } = useLanguage();
  const colors = statusColors[status];

  return <StatusChip backgroundColor={colors.background} label={statusOptionLabels[status]} textColor={colors.text} />;
}

function chipToneColor(tone: ChipTone, theme: ReturnType<typeof useTheme>): { backgroundColor: string; textColor: string } {
  if (tone === 'success') {
    return { backgroundColor: theme.successSoft, textColor: theme.successStrong };
  }

  if (tone === 'warning') {
    return { backgroundColor: theme.warningSoft, textColor: theme.warningStrong };
  }

  if (tone === 'danger') {
    return { backgroundColor: theme.dangerSoft, textColor: theme.dangerStrong };
  }

  if (tone === 'info') {
    return { backgroundColor: theme.infoSoft, textColor: theme.info };
  }

  return { backgroundColor: theme.background, textColor: theme.textSecondary };
}

export function StatusChip({
  backgroundColor,
  label,
  textColor,
  tone = 'neutral',
}: {
  backgroundColor?: string;
  label: string;
  textColor?: string;
  tone?: ChipTone;
}) {
  const theme = useTheme();
  const toneColor = chipToneColor(tone, theme);

  return (
    <View style={[styles.statusBadge, { backgroundColor: backgroundColor ?? toneColor.backgroundColor }]}>
      <ThemedText type="smallBold" style={{ color: textColor ?? toneColor.textColor }}>
        {label}
      </ThemedText>
    </View>
  );
}

export function SyncBanner({
  actionLabel,
  body,
  loading = false,
  onAction,
  title,
  tone = 'neutral',
}: {
  actionLabel?: string;
  body: string;
  loading?: boolean;
  onAction?: () => void;
  title: string;
  tone?: ChipTone;
}) {
  const theme = useTheme();
  const { isRtl } = useLanguage();
  const toneColor = chipToneColor(tone, theme);

  return (
    <View
      style={[
        styles.syncBanner,
        {
          backgroundColor: toneColor.backgroundColor,
          borderColor: toneColor.textColor,
          flexDirection: isRtl ? 'row-reverse' : 'row',
        },
      ]}>
      <View style={styles.syncBannerCopy}>
        <ThemedText type="smallBold" style={{ color: toneColor.textColor }}>
          {title}
        </ThemedText>
        <ThemedText type="small" style={{ color: tone === 'neutral' ? theme.textSecondary : toneColor.textColor }}>
          {body}
        </ThemedText>
      </View>
      {actionLabel && onAction ? (
        <SecondaryButton loading={loading} onPress={onAction} stretch>
          {actionLabel}
        </SecondaryButton>
      ) : null}
    </View>
  );
}

export function StationSummary({ station }: { station: Station }) {
  const { isRtl, strings } = useLanguage();

  return (
    <Card>
      <View style={[styles.summaryHeader, { flexDirection: isRtl ? 'row-reverse' : 'row' }]}>
        <View style={styles.summaryCopy}>
          <ThemedText type="title">{station.label}</ThemedText>
          <ThemedText selectable themeColor="textSecondary">
            {station.location}
          </ThemedText>
        </View>
        <StatusChip label={station.isActive ? strings.report.stationActive : strings.report.stationInactive} tone={station.isActive ? 'success' : 'danger'} />
      </View>
      <View style={[styles.metaRow, { flexDirection: isRtl ? 'row-reverse' : 'row' }]}>
        <StatusChip label={`${strings.report.stationLabel} ${station.stationId}`} tone="info" />
        {station.zone ? <StatusChip label={station.zone} /> : null}
      </View>
    </Card>
  );
}

function syncTone(status?: ReportSyncStatus): ChipTone {
  if (status === 'submitted') {
    return 'success';
  }

  if (status === 'failed') {
    return 'danger';
  }

  if (status === 'queued' || status === 'syncing') {
    return 'warning';
  }

  return 'neutral';
}

function reviewTone(status?: 'pending' | 'rejected' | 'reviewed'): ChipTone {
  if (status === 'reviewed') {
    return 'success';
  }

  if (status === 'rejected') {
    return 'danger';
  }

  return 'warning';
}

export function ReportCard({
  action,
  createdAt,
  notes,
  reviewStatus,
  stationId,
  stationLabel,
  status,
  syncStatus,
}: {
  action?: ReactNode;
  createdAt?: string;
  notes?: string;
  reviewStatus?: 'pending' | 'rejected' | 'reviewed';
  stationId: string;
  stationLabel?: string;
  status: StatusOption[];
  syncStatus?: ReportSyncStatus;
}) {
  const { isRtl, language, strings } = useLanguage();
  const locale = languageDateLocales[language];
  const dateLabel = createdAt
    ? new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(createdAt))
    : null;
  const syncLabel = syncStatus ? strings.syncStatus[syncStatus] : null;
  const reviewLabel = reviewStatus ? strings.reviewStatus[reviewStatus] : null;

  return (
    <Card>
      <View style={[styles.reportHeader, { flexDirection: isRtl ? 'row-reverse' : 'row' }]}>
        <View style={styles.summaryCopy}>
          <ThemedText type="smallBold">{stationLabel ?? `${strings.report.stationLabel} ${stationId}`}</ThemedText>
          <ThemedText selectable type="small" themeColor="textSecondary">
            {dateLabel ?? stationId}
          </ThemedText>
        </View>
        {syncLabel ? <StatusChip label={syncLabel} tone={syncTone(syncStatus)} /> : null}
      </View>
      <View style={[styles.metaRow, { flexDirection: isRtl ? 'row-reverse' : 'row' }]}>
        {status.map((item) => (
          <StatusBadge key={item} status={item} />
        ))}
      </View>
      {reviewLabel ? <StatusChip label={reviewLabel} tone={reviewTone(reviewStatus)} /> : null}
      {notes ? <ThemedText>{notes}</ThemedText> : null}
      {action}
    </Card>
  );
}

export function SyncIndicator({ status }: { status: SyncState }) {
  const theme = useTheme();
  const opacity = useRef(new Animated.Value(1)).current;
  const color =
    status === 'synced'
      ? theme.successStrong
      : status === 'failed'
        ? theme.dangerStrong
        : status === 'syncing'
          ? theme.warningStrong
          : theme.warningStrong;

  useEffect(() => {
    if (status !== 'syncing') {
      opacity.setValue(1);
      return undefined;
    }

    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { duration: 520, toValue: 0.35, useNativeDriver: true }),
        Animated.timing(opacity, { duration: 520, toValue: 1, useNativeDriver: true }),
      ]),
    );
    loop.start();

    return () => loop.stop();
  }, [opacity, status]);

  return <Animated.View style={[styles.syncDot, { backgroundColor: color, opacity }]} />;
}

export function SkeletonLoader({
  borderRadius = Radius.md,
  height,
  width,
}: {
  borderRadius?: number;
  height: number;
  width: ViewStyle['width'];
}) {
  const theme = useTheme();
  const opacity = useRef(new Animated.Value(0.35)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { duration: 760, toValue: 0.85, useNativeDriver: true }),
        Animated.timing(opacity, { duration: 760, toValue: 0.35, useNativeDriver: true }),
      ]),
    );
    loop.start();

    return () => loop.stop();
  }, [opacity]);

  return <Animated.View style={[styles.skeleton, { backgroundColor: theme.border, borderRadius, height, opacity, width }]} />;
}

export function EmptyState({
  actionLabel,
  icon = '·',
  onAction,
  subtitle,
  title,
}: {
  actionLabel?: string;
  icon?: string;
  onAction?: () => void;
  subtitle: string;
  title: string;
}) {
  const theme = useTheme();

  return (
    <View style={styles.emptyState}>
      <View style={[styles.emptyIcon, { backgroundColor: theme.primarySoft }]}>
        <ThemedText style={[styles.emptyIconText, { color: theme.primary }]}>{icon}</ThemedText>
      </View>
      <ThemedText type="smallBold" style={styles.emptyTitle}>
        {title}
      </ThemedText>
      <ThemedText type="small" themeColor="textSecondary" style={styles.emptySubtitle}>
        {subtitle}
      </ThemedText>
      {actionLabel && onAction ? <PrimaryButton onPress={onAction}>{actionLabel}</PrimaryButton> : null}
    </View>
  );
}

export function ToastProvider({ children, topOffset = 56 }: { children: ReactNode; topOffset?: number }) {
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const translateY = useRef(new Animated.Value(-96)).current;
  const showToast = useCallback(
    (message: string, variant: ToastVariant = 'info') => {
      setToast({ id: Date.now(), message, variant });
      Animated.timing(translateY, { duration: 180, toValue: 0, useNativeDriver: true }).start();
    },
    [translateY],
  );
  const value = useMemo<ToastContextValue>(() => ({ showToast }), [showToast]);

  useEffect(() => {
    if (!toast) {
      return undefined;
    }

    const timeout = setTimeout(() => {
      Animated.timing(translateY, { duration: 180, toValue: -96, useNativeDriver: true }).start(() => setToast(null));
    }, 3000);

    return () => clearTimeout(timeout);
  }, [toast, translateY]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {toast ? <ToastBanner toast={toast} topOffset={topOffset} translateY={translateY} /> : null}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const value = useContext(ToastContext);

  if (!value) {
    throw new Error('useToast must be used inside ToastProvider');
  }

  return value;
}

function ToastBanner({ toast, topOffset, translateY }: { toast: ToastMessage; topOffset: number; translateY: Animated.Value }) {
  const theme = useTheme();
  const { isRtl } = useLanguage();
  const color =
    toast.variant === 'success'
      ? theme.successStrong
      : toast.variant === 'warning'
        ? theme.warningStrong
        : toast.variant === 'error'
          ? theme.dangerStrong
          : theme.accent;

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.toast,
        Shadow.md,
        {
          backgroundColor: theme.surfaceCard,
          borderColor: color,
          flexDirection: isRtl ? 'row-reverse' : 'row',
          top: topOffset,
          transform: [{ translateY }],
        },
      ]}>
      <View style={[styles.toastDot, { backgroundColor: color }]} />
      <ThemedText type="smallBold" style={styles.toastText}>
        {toast.message}
      </ThemedText>
    </Animated.View>
  );
}

export function BottomSheet({
  children,
  onDismiss,
  title,
  visible,
}: {
  children: ReactNode;
  onDismiss: () => void;
  title?: string;
  visible: boolean;
}) {
  const theme = useTheme();
  const translateY = useRef(new Animated.Value(320)).current;
  const backdropOpacity = translateY.interpolate({
    inputRange: [0, 320],
    outputRange: [0.34, 0],
  });

  useEffect(() => {
    Animated.timing(translateY, {
      duration: 220,
      toValue: visible ? 0 : 320,
      useNativeDriver: true,
    }).start();
  }, [translateY, visible]);

  return (
    <Modal animationType="none" onRequestClose={onDismiss} transparent visible={visible}>
      <View style={styles.bottomSheetRoot}>
        <Pressable accessibilityRole="button" onPress={onDismiss} style={StyleSheet.absoluteFill}>
          <Animated.View style={[styles.bottomSheetBackdrop, { opacity: backdropOpacity }]} />
        </Pressable>
        <Animated.View
          style={[
            styles.bottomSheet,
            Shadow.md,
            {
              backgroundColor: theme.surfaceCard,
              borderColor: theme.border,
              transform: [{ translateY }],
            },
          ]}>
          {title ? <ThemedText type="title">{title}</ThemedText> : null}
          <ScrollView contentContainerStyle={styles.bottomSheetScrollContent} showsVerticalScrollIndicator={false}>
            {children}
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  bottomSheet: {
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    borderWidth: 1,
    gap: Spacing.md,
    maxHeight: '82%',
    padding: Spacing.lg,
    width: '100%',
  },
  bottomSheetBackdrop: {
    backgroundColor: '#020617',
    flex: 1,
  },
  bottomSheetRoot: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  bottomSheetScrollContent: {
    gap: Spacing.md,
  },
  brandCopy: {
    flex: 1,
    gap: Spacing.xs,
  },
  brandLetter: {
    fontFamily: Fonts.sansHeavy,
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.heavy,
    lineHeight: Typography.fontSize.xl * Typography.lineHeight.tight,
  },
  brandLetterCompact: {
    fontSize: Typography.fontSize.lg,
    lineHeight: Typography.fontSize.lg * Typography.lineHeight.tight,
  },
  brandMark: {
    alignItems: 'center',
    borderRadius: Radius.md,
    borderWidth: 1,
    height: TouchTarget,
    justifyContent: 'center',
    width: TouchTarget,
  },
  brandMarkCompact: {
    height: 44,
    width: 44,
  },
  brandNameArabic: {
    fontSize: Typography.fontSize.md,
  },
  brandNameCompact: {
    fontSize: Typography.fontSize.base,
  },
  brandRow: {
    alignItems: 'center',
    gap: Spacing.md,
  },
  brandRowCompact: {
    gap: Spacing.sm,
  },
  button: {
    alignItems: 'center',
    borderRadius: Radius.md,
    gap: Spacing.sm,
    justifyContent: 'center',
    minHeight: TouchTarget,
    minWidth: TouchTarget,
    paddingHorizontal: Spacing.lg,
  },
  buttonText: {
    fontFamily: Fonts.sansBold,
    fontSize: 17,
    fontWeight: Typography.fontWeight.bold,
    textAlign: 'center',
  },
  card: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    gap: Spacing.md,
    overflow: 'hidden',
    padding: Spacing.lg,
    position: 'relative',
  },
  content: {
    flex: 1,
    gap: Spacing.md,
    maxWidth: 800,
    paddingHorizontal: Spacing.md,
    paddingTop: 0,
    width: '100%',
  },
  fieldGroup: {
    gap: Spacing.xs,
  },
  input: {
    borderRadius: Radius.md,
    borderWidth: 1,
    fontFamily: Fonts.sans,
    fontSize: Typography.fontSize.base,
    minHeight: TouchTarget,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  inputMultiline: {
    minHeight: 132,
    paddingTop: Spacing.md,
  },
  emptyIcon: {
    alignItems: 'center',
    borderRadius: Radius.lg,
    height: 64,
    justifyContent: 'center',
    width: 64,
  },
  emptyIconText: {
    fontFamily: Fonts.sansHeavy,
    fontSize: Typography.fontSize.xxl,
    fontWeight: Typography.fontWeight.heavy,
  },
  emptyState: {
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.xl,
  },
  emptySubtitle: {
    maxWidth: 320,
    textAlign: 'center',
  },
  emptyTitle: {
    fontSize: Typography.fontSize.base,
    textAlign: 'center',
  },
  iconButton: {
    alignItems: 'center',
    borderRadius: Radius.full,
    borderWidth: 1,
    height: TouchTarget,
    justifyContent: 'center',
    width: TouchTarget,
  },
  iconButtonText: {
    fontFamily: Fonts.sansBold,
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.bold,
    lineHeight: Typography.fontSize.lg * Typography.lineHeight.tight,
  },
  pressed: {
    opacity: 0.84,
  },
  secondaryButton: {
    alignItems: 'center',
    borderRadius: Radius.md,
    borderWidth: 1,
    gap: Spacing.sm,
    justifyContent: 'center',
    minHeight: TouchTarget,
    minWidth: TouchTarget,
    paddingHorizontal: Spacing.md,
  },
  secondaryButtonWrap: {},
  secondaryButtonWrapStretch: {
    alignSelf: 'stretch',
  },
  shell: {
    alignItems: 'center',
    flex: 1,
  },
  skeleton: {
    overflow: 'hidden',
  },
  statHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statIcon: {
    fontSize: Typography.fontSize.lg,
    lineHeight: Typography.fontSize.lg * Typography.lineHeight.tight,
  },
  statTile: {
    flex: 1,
    justifyContent: 'space-between',
    minHeight: 124,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    borderRadius: Radius.full,
    minHeight: 36,
    justifyContent: 'center',
    paddingHorizontal: Spacing.md,
  },
  summaryCopy: {
    flex: 1,
    gap: Spacing.xs,
  },
  summaryHeader: {
    alignItems: 'flex-start',
    gap: Spacing.md,
    justifyContent: 'space-between',
  },
  metaRow: {
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  reportHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: Spacing.md,
    justifyContent: 'space-between',
  },
  syncBanner: {
    alignItems: 'center',
    borderRadius: Radius.lg,
    borderWidth: 1,
    gap: Spacing.sm,
    padding: Spacing.md,
  },
  syncBannerCopy: {
    flex: 2,
    gap: Spacing.xs,
  },
  syncDot: {
    borderRadius: Radius.full,
    height: 10,
    width: 10,
  },
  toast: {
    alignItems: 'center',
    borderRadius: Radius.lg,
    borderWidth: 1,
    gap: Spacing.sm,
    left: Spacing.md,
    minHeight: TouchTarget,
    paddingHorizontal: Spacing.md,
    position: 'absolute',
    right: Spacing.md,
    zIndex: 50,
  },
  toastDot: {
    borderRadius: Radius.full,
    height: 10,
    width: 10,
  },
  toastText: {
    flex: 1,
  },
  topBar: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 64,
    width: '100%',
  },
  topBarSpacer: {
    height: TouchTarget,
    width: TouchTarget,
  },
  topBarTitle: {
    flex: 1,
    fontSize: Typography.fontSize.xl,
    textAlign: 'center',
  },
  wordmarkRow: {
    alignItems: 'baseline',
    gap: Spacing.sm,
  },
});
