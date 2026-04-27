import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EcoPestIcon } from '@/components/icons';
import { BottomSheet, InputField, MobileTopBar, PrimaryButton, ScreenShell, SecondaryButton, useToast } from '@/components/ecopest-ui';
import { ThemedText } from '@/components/themed-text';
import { BottomTabInset, Radius, Shadow, Spacing, TouchTarget, Typography } from '@/constants/theme';
import { useLanguage } from '@/contexts/language-context';
import { useTheme } from '@/hooks/use-theme';
import { useStation } from '@/hooks/use-station';
import { useCurrentUser } from '@/lib/auth';
import { errorHaptic, successHaptic, warningHaptic } from '@/lib/haptics';
import { languageDateLocales } from '@/lib/i18n';

function normalizeStationId(value: string): string {
  return value.trim().replace(/^\/+|\/+$/g, '');
}

function extractStationIdFromQr(value: string): string | null {
  const match = value.match(/\/station\/([^/?#]+)\/report/);

  return match?.[1] ? decodeURIComponent(match[1]) : null;
}

function timestampToDate(timestamp?: string): Date | null {
  if (!timestamp) {
    return null;
  }

  const date = new Date(timestamp);

  return Number.isNaN(date.getTime()) ? null : date;
}

export default function ScanScreen() {
  const [stationId, setStationId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [lastScannedValue, setLastScannedValue] = useState<string | null>(null);
  const [scanHistory, setScanHistory] = useState<string[]>([]);
  const [previewStationId, setPreviewStationId] = useState<string | null>(null);
  const [isPreviewVisible, setIsPreviewVisible] = useState(false);
  const [isTorchEnabled, setIsTorchEnabled] = useState(false);
  const theme = useTheme();
  const { isRtl, language, strings } = useLanguage();
  const t = strings.scan;
  const normalizedStationId = normalizeStationId(stationId);
  const preview = useStation(previewStationId ?? '');
  const { showToast } = useToast();
  const currentUser = useCurrentUser();
  const isTechnician = currentUser?.profile.role === 'technician';
  const locale = languageDateLocales[language];
  const lastVisitedAt = useMemo(() => timestampToDate(preview.station?.lastVisitedAt), [preview.station?.lastVisitedAt]);
  const previewPhotoUrl = preview.station?.photoUrls?.[0];

  useEffect(() => {
    if (!lastScannedValue) {
      return undefined;
    }

    const timeout = setTimeout(() => setLastScannedValue(null), 2500);

    return () => clearTimeout(timeout);
  }, [lastScannedValue]);

  function addToScanHistory(nextStationId: string): void {
    setScanHistory((current) => [nextStationId, ...current.filter((item) => item !== nextStationId)].slice(0, 5));
  }

  function openPreview(nextStationId: string): void {
    addToScanHistory(nextStationId);
    setPreviewStationId(nextStationId);
    setIsPreviewVisible(true);
  }

  function openReport(nextStationId = normalizedStationId) {
    const reportStationId = normalizeStationId(nextStationId);

    if (!reportStationId) {
      setError(strings.validation.stationIdRequired);
      void warningHaptic();
      return;
    }

    setError(null);
    setIsPreviewVisible(false);
    router.push({ pathname: '/report/[stationId]', params: { stationId: reportStationId } });
  }

  function handleBarcodeScanned(result: BarcodeScanningResult) {
    if (!result.data || result.data === lastScannedValue) {
      return;
    }

    setLastScannedValue(result.data);
    const scannedStationId = extractStationIdFromQr(result.data);

    if (scannedStationId) {
      setStationId(scannedStationId);
      setError(null);
      void successHaptic();
      openPreview(scannedStationId);
      return;
    }

    setError(t.invalidQr);
    showToast(t.invalidQr, 'error');
    void errorHaptic();
  }

  useEffect(() => {
    if (currentUser && !isTechnician) {
      showToast(strings.errors.accessDenied, 'error');
      void warningHaptic();
      router.replace('/(tabs)');
    }
  }, [currentUser, isTechnician, showToast, strings.errors.accessDenied]);

  if (currentUser && !isTechnician) {
    return (
      <ScreenShell>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.permissionBox}>
            <ThemedText type="title" style={styles.manualTitle}>
              {strings.errors.accessDeniedTitle}
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary" style={styles.permissionText}>
              {strings.errors.accessDenied}
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
        <ScrollView contentContainerStyle={styles.scrollContent} contentInsetAdjustmentBehavior="automatic" showsVerticalScrollIndicator={false}>
          <MobileTopBar leftIcon="arrow-left" leftLabel={strings.actions.back} onLeftPress={() => router.push('/(tabs)')} title={t.title} />

          <ThemedText themeColor="textSecondary" style={styles.instruction}>
            وجه الكاميرا نحو رمز QR الخاص بالمحطة
          </ThemedText>

          <View style={[styles.cameraFrame, Shadow.md, { backgroundColor: theme.surfaceCardDark, borderColor: theme.border }]}>
            {permission?.granted ? (
              <>
                <CameraView
                  barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
                  enableTorch={isTorchEnabled}
                  facing="back"
                  onBarcodeScanned={handleBarcodeScanned}
                  style={StyleSheet.absoluteFill}
                />
                <View pointerEvents="none" style={[styles.cameraOverlay, { backgroundColor: `${theme.primary}55` }]} />
                <View pointerEvents="none" style={[styles.scanGuide, { borderColor: theme.primaryLight }]}>
                  <View style={[styles.scanGuideLine, { backgroundColor: theme.primaryLight }]} />
                </View>
              </>
            ) : (
              <View style={styles.permissionBox}>
                <View style={[styles.permissionIcon, { backgroundColor: theme.primarySoft }]}>
                  <EcoPestIcon color={theme.primary} name="qr-code" size={34} />
                </View>
                <ThemedText type="small" themeColor="textSecondary" style={styles.permissionText}>
                  {t.cameraPermissionBody}
                </ThemedText>
                <PrimaryButton icon="camera" onPress={requestPermission}>
                  {t.enableCamera}
                </PrimaryButton>
              </View>
            )}
          </View>

          {permission?.granted ? (
            <View style={styles.torchRow}>
              <SecondaryButton icon="flashlight" selected={isTorchEnabled} onPress={() => setIsTorchEnabled((current) => !current)}>
                {isTorchEnabled ? t.torchOff : t.torchOn}
              </SecondaryButton>
            </View>
          ) : null}

          <View style={[styles.divider, { backgroundColor: theme.border }]} />

          <View style={styles.manualSection}>
            <ThemedText type="title" style={styles.manualTitle}>
              أدخل رقم المحطة يدويًا
            </ThemedText>
            <InputField
              autoCapitalize="none"
              autoCorrect={false}
              label={t.manualStationLabel}
              onChangeText={setStationId}
              placeholder={t.manualStationPlaceholder}
              style={styles.input}
              value={stationId}
            />
            {error ? <ThemedText selectable style={{ color: theme.danger }}>{error}</ThemedText> : null}
            <PrimaryButton icon="file-text" onPress={() => openReport()}>
              {strings.actions.openReport}
            </PrimaryButton>
          </View>

          {scanHistory.length > 0 ? (
            <View style={styles.historyBlock}>
              <ThemedText type="smallBold">{t.historyTitle}</ThemedText>
              <View style={[styles.historyList, { flexDirection: isRtl ? 'row-reverse' : 'row' }]}>
                {scanHistory.map((historyStationId) => (
                  <Pressable
                    accessibilityRole="button"
                    key={historyStationId}
                    onPress={() => openPreview(historyStationId)}
                    style={[styles.historyChip, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
                    <ThemedText type="smallBold">{historyStationId}</ThemedText>
                  </Pressable>
                ))}
              </View>
            </View>
          ) : null}
        </ScrollView>
      </SafeAreaView>

      <BottomSheet onDismiss={() => setIsPreviewVisible(false)} title={t.previewTitle} visible={isPreviewVisible}>
        <View style={styles.previewContent}>
          <ThemedText type="smallBold">
            {strings.report.stationLabel} {previewStationId ?? '-'}
          </ThemedText>

          {preview.loading ? (
            <ThemedText type="small" themeColor="textSecondary">
              {t.previewLoading}
            </ThemedText>
          ) : null}

          {!preview.loading && preview.station ? (
            <View style={styles.previewContent}>
              {previewPhotoUrl ? (
                <Image
                  accessibilityLabel={`صورة المحطة ${preview.station.label}`}
                  resizeMode="cover"
                  source={{ uri: previewPhotoUrl }}
                  style={[styles.previewPhoto, { borderColor: theme.border }]}
                />
              ) : null}
              <ThemedText type="title">{preview.station.label}</ThemedText>
              <ThemedText themeColor="textSecondary">
                {t.stationLocation}: {preview.station.location}
              </ThemedText>
              {preview.station.zone ? (
                <ThemedText themeColor="textSecondary">
                  {t.stationZone}: {preview.station.zone}
                </ThemedText>
              ) : null}
              <ThemedText themeColor="textSecondary">
                {t.stationLastVisit}:{' '}
                {lastVisitedAt ? new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(lastVisitedAt) : t.previewMissing}
              </ThemedText>
            </View>
          ) : null}

          {!preview.loading && preview.error ? (
            <ThemedText type="small" style={{ color: theme.warningStrong }}>
              {preview.error}
            </ThemedText>
          ) : null}

          <View style={[styles.actions, { flexDirection: isRtl ? 'row-reverse' : 'row' }]}>
            <SecondaryButton onPress={() => setIsPreviewVisible(false)}>{strings.actions.cancel}</SecondaryButton>
            <PrimaryButton icon="file-text" onPress={() => openReport(previewStationId ?? '')}>
              {strings.actions.openReport}
            </PrimaryButton>
          </View>
        </View>
      </BottomSheet>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  actions: {
    gap: Spacing.sm,
  },
  cameraFrame: {
    alignSelf: 'center',
    aspectRatio: 1,
    borderRadius: Radius.lg,
    borderWidth: 1,
    maxWidth: 462,
    overflow: 'hidden',
    position: 'relative',
    width: '75%',
  },
  cameraOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  divider: {
    height: 1,
    width: '100%',
  },
  historyBlock: {
    gap: Spacing.sm,
  },
  historyChip: {
    borderRadius: Radius.md,
    borderWidth: 1,
    minHeight: TouchTarget,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  historyList: {
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  input: {
    textAlign: 'left',
  },
  instruction: {
    fontSize: Typography.fontSize.md,
    textAlign: 'center',
  },
  manualSection: {
    gap: Spacing.md,
  },
  manualTitle: {
    textAlign: 'center',
  },
  permissionBox: {
    alignItems: 'center',
    flex: 1,
    gap: Spacing.md,
    justifyContent: 'center',
    padding: Spacing.lg,
  },
  permissionIcon: {
    alignItems: 'center',
    borderRadius: Radius.full,
    height: 72,
    justifyContent: 'center',
    width: 72,
  },
  permissionText: {
    textAlign: 'center',
  },
  previewContent: {
    gap: Spacing.sm,
  },
  previewPhoto: {
    aspectRatio: 16 / 9,
    borderRadius: Radius.md,
    borderWidth: 1,
    width: '100%',
  },
  safeArea: {
    flex: 1,
    width: '100%',
  },
  scanGuide: {
    borderRadius: Radius.md,
    borderWidth: 4,
    bottom: '12%',
    left: '12%',
    position: 'absolute',
    right: '12%',
    top: '12%',
  },
  scanGuideLine: {
    height: 3,
    left: 0,
    position: 'absolute',
    right: 0,
    top: '50%',
  },
  scrollContent: {
    gap: Spacing.lg,
    paddingBottom: BottomTabInset + Spacing.xl,
  },
  torchRow: {
    alignItems: 'center',
  },
});
