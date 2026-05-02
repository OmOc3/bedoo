import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';
import * as Location from 'expo-location';
import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EcoPestIcon } from '@/components/icons';
import { BottomSheet, MobileTopBar, PrimaryButton, ScreenShell, SecondaryButton, useToast } from '@/components/ecopest-ui';
import { ThemedText } from '@/components/themed-text';
import { BottomTabInset, Radius, Shadow, Spacing, TouchTarget, Typography } from '@/constants/theme';
import { useLanguage } from '@/contexts/language-context';
import { useTheme } from '@/hooks/use-theme';
import { useStation } from '@/hooks/use-station';
import { useCurrentUser } from '@/lib/auth';
import { errorHaptic, successHaptic, warningHaptic } from '@/lib/haptics';
import { languageDateLocales } from '@/lib/i18n';
import { apiGet } from '@/lib/sync/api-client';
import type { Station } from '@/lib/sync/types';

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

function formatDistance(value?: number): string {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return 'داخل النطاق';
  }

  return value < 1000 ? `${Math.round(value)} م` : `${(value / 1000).toFixed(1)} كم`;
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
  const [nearbyStations, setNearbyStations] = useState<Station[]>([]);
  const [nearbyError, setNearbyError] = useState<string | null>(null);
  const [isLoadingNearby, setIsLoadingNearby] = useState(false);
  const theme = useTheme();
  const { language, strings } = useLanguage();
  const t = strings.scan;
  const normalizedStationId = normalizeStationId(stationId);
  const preview = useStation(previewStationId ?? '', strings.errors.loadStation);
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

  const loadNearbyStations = useCallback(async (showFeedback = false): Promise<void> => {
    setIsLoadingNearby(true);
    setNearbyError(null);

    try {
      const permissionResult = await Location.requestForegroundPermissionsAsync();

      if (!permissionResult.granted) {
        throw new Error('اسمح للتطبيق بقراءة الموقع لعرض المحطات القريبة.');
      }

      const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Highest });
      const params = new URLSearchParams({
        lat: String(position.coords.latitude),
        lng: String(position.coords.longitude),
      });

      if (typeof position.coords.accuracy === 'number' && Number.isFinite(position.coords.accuracy)) {
        params.set('accuracyMeters', String(position.coords.accuracy));
      }

      const stations = await apiGet<Station[]>(`/api/mobile/stations?${params.toString()}`, {
        fallbackErrorMessage: 'تعذر تحميل المحطات القريبة.',
        networkErrorMessage: 'تعذر الاتصال بالخادم لتحميل المحطات القريبة.',
      });

      setNearbyStations(stations);

      if (showFeedback) {
        showToast('تم تحديث المحطات القريبة.', 'success');
        await successHaptic();
      }
    } catch (loadError: unknown) {
      const message = loadError instanceof Error ? loadError.message : 'تعذر تحديد موقعك الحالي.';

      setNearbyStations([]);
      setNearbyError(message);
      showToast(message, 'error');
      await warningHaptic();
    } finally {
      setIsLoadingNearby(false);
    }
  }, [showToast]);

  useEffect(() => {
    if (currentUser && !isTechnician) {
      showToast(strings.errors.accessDenied, 'error');
      void warningHaptic();
      router.replace('/(tabs)');
    }
  }, [currentUser, isTechnician, showToast, strings.errors.accessDenied]);

  useEffect(() => {
    if (currentUser && isTechnician) {
      void loadNearbyStations();
    }
  }, [currentUser, isTechnician, loadNearbyStations]);

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
            {t.instruction}
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

          <View style={[styles.nearbySection, Shadow.sm, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
            <View style={[styles.nearbyHeader, { flexDirection: 'row' }]}>
              <View style={styles.nearbyHeaderCopy}>
                <ThemedText type="title" style={styles.nearbyTitle}>
                  المحطات القريبة
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  تظهر المحطات النشطة داخل نطاق موقعك الحالي فقط.
                </ThemedText>
              </View>
              <SecondaryButton icon="map-pin" loading={isLoadingNearby} onPress={() => void loadNearbyStations(true)}>
                تحديث
              </SecondaryButton>
            </View>

            {nearbyError ? <ThemedText selectable style={{ color: theme.danger }}>{nearbyError}</ThemedText> : null}
            {error ? <ThemedText selectable style={{ color: theme.danger }}>{error}</ThemedText> : null}

            {nearbyStations.length > 0 ? (
              <View style={styles.nearbyList}>
                {nearbyStations.map((station) => (
                  <View style={[styles.nearbyCard, { backgroundColor: theme.surfaceCard, borderColor: theme.border }]} key={station.stationId}>
                    <View style={[styles.nearbyCardHeader, { flexDirection: 'row' }]}>
                      <View style={styles.nearbyCardCopy}>
                        <ThemedText type="smallBold" style={{ color: theme.primary }}>
                          #{station.stationId}
                        </ThemedText>
                        <ThemedText type="title" style={styles.nearbyStationLabel}>
                          {station.label}
                        </ThemedText>
                        <ThemedText type="small" themeColor="textSecondary">
                          {station.location}
                        </ThemedText>
                      </View>
                      <View style={[styles.distancePill, { backgroundColor: theme.primarySoft }]}>
                        <ThemedText type="smallBold" style={{ color: theme.primary }}>
                          {formatDistance(station.distanceMeters)}
                        </ThemedText>
                      </View>
                    </View>
                    <PrimaryButton icon="file-text" onPress={() => openReport(station.stationId)}>
                      {strings.actions.openReport}
                    </PrimaryButton>
                  </View>
                ))}
              </View>
            ) : !isLoadingNearby ? (
              <View style={[styles.nearbyEmpty, { borderColor: theme.border }]}>
                <EcoPestIcon color={theme.textSecondary} name="map-pin" size={28} />
                <ThemedText type="small" themeColor="textSecondary" style={styles.permissionText}>
                  لا توجد محطات قريبة. اقترب من المحطة أو استخدم QR المثبت عليها.
                </ThemedText>
              </View>
            ) : null}
          </View>

          {scanHistory.length > 0 ? (
            <View style={styles.historyBlock}>
              <ThemedText type="smallBold">{t.historyTitle}</ThemedText>
              <View style={[styles.historyList]}>
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
                  accessibilityLabel={`${t.stationImageLabel} ${preview.station.label}`}
                  accessibilityIgnoresInvertColors
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

          <View style={[styles.actions]}>
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
  distancePill: {
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
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
  instruction: {
    fontSize: Typography.fontSize.md,
    textAlign: 'center',
  },
  manualTitle: {
    textAlign: 'center',
  },
  nearbyCard: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    gap: Spacing.md,
    padding: Spacing.md,
  },
  nearbyCardCopy: {
    flex: 1,
    gap: Spacing.xs,
  },
  nearbyCardHeader: {
    alignItems: 'flex-start',
    gap: Spacing.sm,
  },
  nearbyEmpty: {
    alignItems: 'center',
    borderRadius: Radius.lg,
    borderStyle: 'dashed',
    borderWidth: 1,
    gap: Spacing.sm,
    padding: Spacing.lg,
  },
  nearbyHeader: {
    alignItems: 'flex-start',
    gap: Spacing.sm,
    justifyContent: 'space-between',
  },
  nearbyHeaderCopy: {
    flex: 1,
    gap: Spacing.xs,
  },
  nearbyList: {
    gap: Spacing.md,
  },
  nearbySection: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    gap: Spacing.md,
    padding: Spacing.lg,
  },
  nearbyStationLabel: {
    fontSize: Typography.fontSize.md,
  },
  nearbyTitle: {
    fontSize: Typography.fontSize.lg,
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
