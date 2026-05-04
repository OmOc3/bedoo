import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';
import { router } from 'expo-router';
import { extractStationIdFromQrValue } from '@ecopest/shared/qr';
import { useEffect, useMemo, useState } from 'react';
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
import { getDistanceMeters, maxLocationAccuracyMeters, stationAccessRadiusMeters } from '@/lib/geo';
import * as Location from 'expo-location';

const scanValidationCopy = {
  ar: {
    locationPermission: 'يجب السماح بقراءة الموقع للتحقق من مسافة المحطة.',
    lowAccuracy: 'دقة الموقع ضعيفة. فعّل GPS واقترب من المحطة ثم حاول مرة أخرى.',
    locationUnavailable: 'تعذر تحديد موقعك الحالي للتحقق من المسافة.',
    outOfRange: (distance: number) => `المحطة خارج النطاق المسموح (المسافة: ${distance} متر). لا يمكنك إنشاء تقرير لها.`,
  },
  en: {
    locationPermission: 'Allow location access to verify your distance from the station.',
    lowAccuracy: 'Location accuracy is low. Turn on GPS, move closer to the station, then try again.',
    locationUnavailable: 'Could not read your current location to verify the distance.',
    outOfRange: (distance: number) => `The station is outside the allowed range (distance: ${distance} m). You cannot create a report for it.`,
  },
} as const;

function normalizeStationId(value: string): string {
  const fromQr = extractStationIdFromQrValue(value);

  return (fromQr ?? value).trim().replace(/^\/+|\/+$/g, '');
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
  const [isCheckingLocation, setIsCheckingLocation] = useState(false);
  const theme = useTheme();
  const { language, strings } = useLanguage();
  const t = strings.scan;
  const validationCopy = scanValidationCopy[language];
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

  async function openReport(nextStationId = normalizedStationId) {
    const reportStationId = normalizeStationId(nextStationId);

    if (!reportStationId) {
      setError(strings.validation.stationIdRequired);
      void warningHaptic();
      return;
    }

    if (preview.station?.coordinates) {
      setIsCheckingLocation(true);
      try {
        const permission = await Location.requestForegroundPermissionsAsync();
        if (!permission.granted) {
          setError(validationCopy.locationPermission);
          void warningHaptic();
          setIsCheckingLocation(false);
          return;
        }
        
        const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
        if (
          typeof location.coords.accuracy === 'number' &&
          Number.isFinite(location.coords.accuracy) &&
          location.coords.accuracy > maxLocationAccuracyMeters
        ) {
          setError(validationCopy.lowAccuracy);
          void warningHaptic();
          setIsCheckingLocation(false);
          return;
        }

        const distance = getDistanceMeters(
          location.coords.latitude,
          location.coords.longitude,
          preview.station.coordinates.lat,
          preview.station.coordinates.lng
        );
        
        if (distance > stationAccessRadiusMeters) {
          setError(validationCopy.outOfRange(Math.round(distance)));
          void errorHaptic();
          setIsCheckingLocation(false);
          return;
        }
      } catch {
        setError(validationCopy.locationUnavailable);
        void errorHaptic();
        setIsCheckingLocation(false);
        return;
      }
      setIsCheckingLocation(false);
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
    const scannedStationId = extractStationIdFromQrValue(result.data);

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
            {t.instruction}
          </ThemedText>
          <ThemedText themeColor="textSecondary" style={styles.qrPolicyNote}>
            {t.qrOnlyNote}
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

          {error ? (
            <ThemedText selectable style={{ color: theme.danger }}>
              {error}
            </ThemedText>
          ) : null}

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
            <SecondaryButton disabled={isCheckingLocation} onPress={() => setIsPreviewVisible(false)}>
              {strings.actions.cancel}
            </SecondaryButton>
            <PrimaryButton disabled={isCheckingLocation} loading={isCheckingLocation} icon="file-text" onPress={() => void openReport(previewStationId ?? '')}>
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
  qrPolicyNote: {
    fontSize: Typography.fontSize.sm,
    lineHeight: 20,
    marginTop: Spacing.xs,
    paddingHorizontal: Spacing.md,
    textAlign: 'center',
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
