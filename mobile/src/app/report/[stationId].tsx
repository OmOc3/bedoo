import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Location from 'expo-location';
import { Directory, File, Paths } from 'expo-file-system';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View, type AppStateStatus } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EcoPestIcon } from '@/components/icons';
import { InputField, MobileTopBar, PrimaryButton, ScreenShell, SecondaryButton, SyncBanner, useToast } from '@/components/ecopest-ui';
import { ThemedText } from '@/components/themed-text';
import { BottomTabInset, Radius, Shadow, Spacing, TouchTarget, Typography } from '@/constants/theme';
import { StatusOptions } from '@/constants/status-options';
import { useLanguage } from '@/contexts/language-context';
import { useStation } from '@/hooks/use-station';
import { useTheme } from '@/hooks/use-theme';
import { useCurrentUser } from '@/lib/auth';
import { clearWorkingDraft, getWorkingDraft, saveSubmittedReport, syncDraft, upsertWorkingDraft } from '@/lib/drafts';
import { errorHaptic, successHaptic, warningHaptic } from '@/lib/haptics';
import { apiGet, apiPost } from '@/lib/sync/api-client';
import type { AttendanceSession, OpenAttendanceResponse, StatusOption } from '@/lib/sync/types';

function getParamValue(value: string | string[] | undefined): string {
  if (Array.isArray(value)) {
    return value[0] ?? '';
  }

  return value ?? '';
}

type InspectionPhotoType = 'image/jpeg' | 'image/png' | 'image/webp';

interface InspectionPhoto {
  name: string;
  type: InspectionPhotoType;
  uri: string;
}

function safeFilePart(value: string): string {
  return value.replace(/[^A-Za-z0-9._-]/g, '-').replace(/-+/g, '-').slice(0, 80) || 'station';
}

function persistCapturedPhoto(sourceUri: string, fileName: string): string {
  const directory = new Directory(Paths.document, 'report-photos');
  const source = new File(sourceUri);
  const destination = new File(directory, fileName);

  directory.create({ idempotent: true, intermediates: true });
  source.copy(destination);

  return destination.uri;
}

function formatAttendanceDistance(value?: number): string {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return 'داخل النطاق';
  }

  return value < 1000 ? `${Math.round(value)} م` : `${(value / 1000).toFixed(1)} كم`;
}

function formatAttendanceTime(value?: string): string {
  if (!value) {
    return 'غير متاح';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'غير متاح';
  }

  return new Intl.DateTimeFormat('ar-EG', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

function StatusOptionRow({ label, onPress, selected }: { label: string; onPress: () => void; selected: boolean }) {
  const theme = useTheme();

  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.statusRow,
        {
          backgroundColor: selected ? theme.primarySoft : theme.backgroundElement,
          borderColor: selected ? theme.primaryLight : theme.border,
          flexDirection: 'row',
          opacity: pressed ? 0.82 : 1,
        },
      ]}>
      <View style={[styles.checkbox, { backgroundColor: selected ? theme.primary : theme.backgroundElement, borderColor: selected ? theme.primary : theme.border }]}>
        {selected ? <EcoPestIcon color={theme.onPrimary} name="check" size={18} /> : null}
      </View>
      <ThemedText type="smallBold" style={styles.statusLabel}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

function PhotoCapturePanel({
  onError,
  onPhotoCaptured,
  onPhotoRemoved,
  photoUri,
  stationId,
}: {
  onError: (message: string) => void;
  onPhotoCaptured: (photo: InspectionPhoto) => void;
  onPhotoRemoved: () => void;
  photoUri: string | null;
  stationId: string;
}) {
  const theme = useTheme();
  const { strings } = useLanguage();
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView | null>(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const t = strings.report;

  async function openCamera(): Promise<void> {
    if (permission?.granted) {
      setIsCameraOpen(true);
      return;
    }

    const result = await requestPermission();

    if (result.granted) {
      setIsCameraOpen(true);
      return;
    }

    onError(t.cameraPermissionBody);
    await warningHaptic();
  }

  async function capturePhoto(): Promise<void> {
    if (!cameraRef.current) {
      onError(t.photoCaptureFailed);
      await errorHaptic();
      return;
    }

    setIsCapturing(true);

    try {
      const captured = await cameraRef.current.takePictureAsync({ quality: 0.72 });
      const name = `report-${safeFilePart(stationId)}-${Date.now()}.jpg`;
      const uri = persistCapturedPhoto(captured.uri, name);

      onPhotoCaptured({ name, type: 'image/jpeg', uri });
      setIsCameraOpen(false);
      await successHaptic();
    } catch {
      onError(t.photoCaptureFailed);
      await errorHaptic();
    } finally {
      setIsCapturing(false);
    }
  }

  if (isCameraOpen) {
    return (
      <View style={[styles.cameraBox, { backgroundColor: theme.surfaceCardDark, borderColor: theme.border }]}>
        <CameraView ref={cameraRef} facing="back" style={StyleSheet.absoluteFill} />
        <View style={[styles.cameraActions, { flexDirection: 'row' }]}>
          <SecondaryButton disabled={isCapturing} onPress={() => setIsCameraOpen(false)}>
            {strings.actions.cancel}
          </SecondaryButton>
          <PrimaryButton disabled={isCapturing} icon="camera" loading={isCapturing} onPress={() => void capturePhoto()}>
            {t.capturePhoto}
          </PrimaryButton>
        </View>
      </View>
    );
  }

  if (photoUri) {
    return (
      <View style={styles.photoCaptureSection}>
        <View style={[styles.photoPreviewFrame, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
          <Image accessibilityLabel={t.photoPreviewLabel} resizeMode="cover" source={{ uri: photoUri }} style={styles.photoPreview} />
        </View>
        <ThemedText type="small" themeColor="textSecondary" style={styles.photoHint}>
          {t.photoUploadHint}
        </ThemedText>
        <View style={[styles.photoActions, { flexDirection: 'row' }]}>
          <SecondaryButton icon="camera" onPress={() => void openCamera()}>
            {t.retakePhoto}
          </SecondaryButton>
          <SecondaryButton icon="trash" onPress={onPhotoRemoved}>
            {t.removePhoto}
          </SecondaryButton>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.photoBox, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
      <View style={[styles.photoIcon, { backgroundColor: theme.background }]}>
        <EcoPestIcon color={theme.textSecondary} name="camera" size={34} />
      </View>
      <ThemedText type="smallBold" style={{ color: theme.primary }}>
        {t.addPhoto}
      </ThemedText>
      <ThemedText type="small" themeColor="textSecondary" style={styles.photoHint}>
        {t.photoHint}
      </ThemedText>
      <PrimaryButton icon="camera" onPress={() => void openCamera()}>
        {t.takePhoto}
      </PrimaryButton>
    </View>
  );
}

export default function StationReportScreen() {
  const params = useLocalSearchParams();
  const stationId = useMemo(() => decodeURIComponent(getParamValue(params.stationId)), [params.stationId]);
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState<StatusOption[]>([]);
  const [inspectionPhotoName, setInspectionPhotoName] = useState<string | undefined>();
  const [inspectionPhotoType, setInspectionPhotoType] = useState<InspectionPhotoType | undefined>();
  const [inspectionPhotoUri, setInspectionPhotoUri] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [attendanceError, setAttendanceError] = useState<string | null>(null);
  const [attendanceNotes, setAttendanceNotes] = useState('');
  const [attendanceSession, setAttendanceSession] = useState<AttendanceSession | null>(null);
  const [isAttendanceLoading, setIsAttendanceLoading] = useState(false);
  const { statusOptionLabels, strings } = useLanguage();
  const { error: stationError, loading: stationLoading, station } = useStation(stationId, strings.errors.loadStation);
  const theme = useTheme();
  const { showToast } = useToast();
  const currentUser = useCurrentUser();
  const isTechnician = currentUser?.profile.role === 'technician';
  const hasStationAttendance = attendanceSession?.clockInLocation?.stationId === stationId;
  const hasOtherOpenAttendance = Boolean(attendanceSession && !hasStationAttendance);
  const stationPhotoUrl = station?.photoUrls?.[0];
  const notesRef = useRef(notes);
  const statusRef = useRef(status);
  const inspectionPhotoNameRef = useRef(inspectionPhotoName);
  const inspectionPhotoTypeRef = useRef(inspectionPhotoType);
  const inspectionPhotoUriRef = useRef(inspectionPhotoUri);
  const lastAutoSavedSignature = useRef('');

  useEffect(() => {
    notesRef.current = notes;
    statusRef.current = status;
    inspectionPhotoNameRef.current = inspectionPhotoName;
    inspectionPhotoTypeRef.current = inspectionPhotoType;
    inspectionPhotoUriRef.current = inspectionPhotoUri;
  }, [inspectionPhotoName, inspectionPhotoType, inspectionPhotoUri, notes, status]);

  useEffect(() => {
    let isMounted = true;

    async function hydrateWorkingDraft(): Promise<void> {
      const draft = await getWorkingDraft(stationId);

      if (isMounted && draft) {
        setNotes(draft.notes);
        setStatus(draft.status);
        setInspectionPhotoName(draft.inspectionPhotoName);
        setInspectionPhotoType(draft.inspectionPhotoType);
        setInspectionPhotoUri(draft.inspectionPhotoUri ?? null);
        lastAutoSavedSignature.current = JSON.stringify({
          inspectionPhotoUri: draft.inspectionPhotoUri ?? null,
          notes: draft.notes,
          status: draft.status,
        });
      }
    }

    void hydrateWorkingDraft();

    return () => {
      isMounted = false;
    };
  }, [stationId]);

  function toggleStatus(value: StatusOption): void {
    setStatus((current) => (current.includes(value) ? current.filter((item) => item !== value) : [...current, value]));
  }

  function handlePhotoCaptured(photo: InspectionPhoto): void {
    setInspectionPhotoName(photo.name);
    setInspectionPhotoType(photo.type);
    setInspectionPhotoUri(photo.uri);
    setError(null);
  }

  function handlePhotoRemoved(): void {
    setInspectionPhotoName(undefined);
    setInspectionPhotoType(undefined);
    setInspectionPhotoUri(null);
    setError(null);
  }

  const loadOpenAttendance = useCallback(async (): Promise<void> => {
    try {
      const response = await apiGet<OpenAttendanceResponse>('/api/mobile/attendance', {
        fallbackErrorMessage: 'تعذر تحميل حالة الحضور.',
        networkErrorMessage: 'تعذر الاتصال بالخادم لتحميل حالة الحضور.',
      });

      setAttendanceSession(response.openSession);
      setAttendanceError(null);
    } catch (loadError: unknown) {
      setAttendanceError(loadError instanceof Error ? loadError.message : 'تعذر تحميل حالة الحضور.');
    }
  }, []);

  async function readAttendancePosition(): Promise<{ accuracyMeters?: number; lat: number; lng: number }> {
    const permissionResult = await Location.requestForegroundPermissionsAsync();

    if (!permissionResult.granted) {
      throw new Error('اسمح للتطبيق بقراءة الموقع لتسجيل الحضور.');
    }

    const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Highest });

    return {
      ...(typeof position.coords.accuracy === 'number' && Number.isFinite(position.coords.accuracy)
        ? { accuracyMeters: position.coords.accuracy }
        : {}),
      lat: position.coords.latitude,
      lng: position.coords.longitude,
    };
  }

  async function submitAttendance(action: 'clockIn' | 'clockOut'): Promise<void> {
    setIsAttendanceLoading(true);
    setAttendanceError(null);

    try {
      const location = await readAttendancePosition();
      const response = await apiPost<AttendanceSession>('/api/mobile/attendance', {
        action,
        notes: attendanceNotes.trim() || undefined,
        stationId: stationId.trim(),
        ...location,
      });

      setAttendanceSession(action === 'clockOut' ? null : response);
      setAttendanceNotes('');
      showToast(action === 'clockIn' ? 'تم تسجيل حضور المحطة.' : 'تم تسجيل الانصراف من المحطة.', 'success');
      await successHaptic();

      if (action === 'clockOut') {
        await loadOpenAttendance();
      }
    } catch (attendanceActionError: unknown) {
      const message = attendanceActionError instanceof Error ? attendanceActionError.message : 'تعذر تحديث الحضور.';

      setAttendanceError(message);
      showToast(message, 'error');
      await warningHaptic();
    } finally {
      setIsAttendanceLoading(false);
    }
  }

  function validateDraft(): boolean {
    if (!stationId.trim()) {
      setError(strings.validation.stationIdRequired);
      void warningHaptic();
      return false;
    }

    if (notes.length > 500) {
      setError(strings.validation.notesTooLong);
      void warningHaptic();
      return false;
    }

    setError(null);
    return true;
  }

  function validateSubmit(): boolean {
    if (!validateDraft()) {
      return false;
    }

    if (!station) {
      setError(stationError ?? strings.report.stationUnavailable);
      void warningHaptic();
      return false;
    }

    if (!station.isActive) {
      setError(strings.report.inactiveStationHint);
      void warningHaptic();
      return false;
    }

    if (status.length === 0) {
      setError(strings.validation.statusRequired);
      void warningHaptic();
      return false;
    }

    if (isTechnician && !hasStationAttendance) {
      setError('يجب تسجيل الحضور في هذه المحطة قبل إرسال التقرير.');
      void warningHaptic();
      return false;
    }

    return true;
  }

  const autoSaveWorkingDraft = useCallback(
    async (showFeedback: boolean): Promise<void> => {
      const cleanStationId = stationId.trim();
      const currentNotes = notesRef.current.trim();
      const currentStatus = statusRef.current;
      const currentPhotoUri = inspectionPhotoUriRef.current;

      if (!cleanStationId || (currentNotes.length === 0 && currentStatus.length === 0 && !currentPhotoUri)) {
        return;
      }

      const signature = JSON.stringify({ inspectionPhotoUri: currentPhotoUri, notes: currentNotes, status: currentStatus });

      if (signature === lastAutoSavedSignature.current) {
        return;
      }

      try {
        await upsertWorkingDraft({
          inspectionPhotoName: inspectionPhotoNameRef.current,
          inspectionPhotoType: inspectionPhotoTypeRef.current,
          inspectionPhotoUri: currentPhotoUri ?? undefined,
          notes: currentNotes,
          stationId: cleanStationId,
          status: currentStatus,
        });
        lastAutoSavedSignature.current = signature;

        if (showFeedback) {
          showToast(strings.report.autoSaved, 'info');
        }
      } catch {
        showToast(strings.errors.unexpected, 'error');
        await errorHaptic();
      }
    },
    [showToast, stationId, strings.errors.unexpected, strings.report.autoSaved],
  );

  useEffect(() => {
    const interval = setInterval(() => {
      void autoSaveWorkingDraft(false);
    }, 30000);

    return () => clearInterval(interval);
  }, [autoSaveWorkingDraft]);

  useEffect(() => {
    function handleAppStateChange(nextState: AppStateStatus): void {
      if (nextState === 'background' || nextState === 'inactive') {
        void autoSaveWorkingDraft(false);
      }
    }

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription.remove();
    };
  }, [autoSaveWorkingDraft]);

  async function saveReportDraft(): Promise<void> {
    if (!validateDraft()) {
      return;
    }

    setIsSaving(true);

    try {
      await upsertWorkingDraft({
        inspectionPhotoName,
        inspectionPhotoType,
        inspectionPhotoUri: inspectionPhotoUri ?? undefined,
        notes: notes.trim(),
        stationId: stationId.trim(),
        status,
      });
      lastAutoSavedSignature.current = JSON.stringify({ inspectionPhotoUri, notes: notes.trim(), status });
      showToast(strings.report.draftSaved, 'success');
      await successHaptic();
    } catch {
      setError(strings.errors.unexpected);
      showToast(strings.errors.unexpected, 'error');
      await errorHaptic();
    } finally {
      setIsSaving(false);
    }
  }

  async function submitReport(): Promise<void> {
    if (!validateSubmit()) {
      return;
    }

    setIsSaving(true);

    try {
      const queuedReport = await saveSubmittedReport({
        notes: notes.trim(),
        inspectionPhotoName,
        inspectionPhotoType,
        inspectionPhotoUri: inspectionPhotoUri ?? undefined,
        stationId: stationId.trim(),
        stationLabel: station?.label,
        status,
      });

      await clearWorkingDraft(stationId.trim());
      await syncDraft(queuedReport.id, strings.errors.syncDraft);
      showToast(strings.report.queued, 'success');
      await successHaptic();
      setNotes('');
      setStatus([]);
      setInspectionPhotoName(undefined);
      setInspectionPhotoType(undefined);
      setInspectionPhotoUri(null);
      router.push('/(tabs)/history');
    } catch {
      setError(strings.errors.unexpected);
      showToast(strings.errors.unexpected, 'error');
      await errorHaptic();
    } finally {
      setIsSaving(false);
    }
  }

  useEffect(() => {
    if (currentUser && !isTechnician) {
      showToast(strings.errors.accessDenied, 'error');
      void warningHaptic();
      router.replace('/(tabs)');
    }
  }, [currentUser, isTechnician, showToast, strings.errors.accessDenied]);

  useEffect(() => {
    if (currentUser && isTechnician) {
      void loadOpenAttendance();
    }
  }, [currentUser, isTechnician, loadOpenAttendance]);

  if (currentUser && !isTechnician) {
    return (
      <ScreenShell>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.section}>
            <ThemedText type="title" style={styles.sectionTitle}>
              {strings.errors.accessDeniedTitle}
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
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
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.keyboardView}>
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            contentInsetAdjustmentBehavior="automatic"
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}>
            <MobileTopBar leftIcon="arrow-left" leftLabel={strings.actions.back} onLeftPress={() => router.back()} title={strings.report.screenTitle} />

            <View
              style={[
                styles.stationCard,
                Shadow.sm,
                {
                  backgroundColor: theme.backgroundElement,
                  borderColor: theme.border,
                  flexDirection: 'row',
                },
              ]}>
              {stationPhotoUrl ? (
                <Image
                  accessibilityLabel={`${strings.report.stationImageLabel} ${station?.label ?? stationId}`}
                  resizeMode="cover"
                  source={{ uri: stationPhotoUrl }}
                  style={[styles.stationPhoto, { borderColor: theme.border }]}
                />
              ) : (
                <View style={[styles.stationIcon, { backgroundColor: theme.primarySoft }]}>
                  <EcoPestIcon color={theme.primary} name="target" size={32} />
                </View>
              )}
              <View style={styles.stationCopy}>
                <ThemedText type="title">
                  {station?.label ?? `${strings.report.stationFallbackPrefix} #${stationId || '-'}`}
                </ThemedText>
                <ThemedText type="smallBold" style={{ color: theme.primary }}>
                  {strings.report.stationNumberPrefix} #{station?.stationId ?? stationId}
                </ThemedText>
                <View style={[styles.locationRow, { flexDirection: 'row' }]}>
                  <EcoPestIcon color={theme.textSecondary} name="map-pin" size={18} />
                  <ThemedText type="small" themeColor="textSecondary">
                    {station?.location ?? stationError ?? strings.report.locationUnavailable}
                  </ThemedText>
                </View>
              </View>
            </View>

            {stationLoading ? <SyncBanner body={stationId} title={strings.report.stationLoading} tone="info" /> : null}

            {station?.isActive === false ? (
              <SyncBanner body={strings.report.inactiveStationHint} title={strings.report.stationInactive} tone="danger" />
            ) : null}

            {!stationLoading && !station && stationError ? (
              <SyncBanner body={stationError} title={strings.report.stationUnavailable} tone="warning" />
            ) : null}

            <View style={[styles.attendancePanel, Shadow.sm, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
              <View style={[styles.attendanceHeader, { flexDirection: 'row' }]}>
                <View style={[styles.attendanceIcon, { backgroundColor: hasStationAttendance ? theme.successSoft : theme.primarySoft }]}>
                  <EcoPestIcon color={hasStationAttendance ? theme.successStrong : theme.primary} name="map-pin" size={24} />
                </View>
                <View style={styles.attendanceCopy}>
                  <ThemedText type="title" style={styles.attendanceTitle}>
                    حضور المحطة
                  </ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    يجب تسجيل حضور داخل نطاق المحطة قبل إرسال التقرير.
                  </ThemedText>
                </View>
              </View>

              {hasStationAttendance ? (
                <View style={[styles.attendanceStatusBox, { borderColor: theme.success, backgroundColor: theme.successSoft }]}>
                  <ThemedText type="smallBold" style={{ color: theme.successStrong }}>
                    حضور مسجل لهذه المحطة
                  </ThemedText>
                  <ThemedText type="small" style={{ color: theme.successStrong }}>
                    وقت الحضور: {formatAttendanceTime(attendanceSession?.clockInAt)} · المسافة: {formatAttendanceDistance(attendanceSession?.clockInLocation?.distanceMeters)}
                  </ThemedText>
                </View>
              ) : hasOtherOpenAttendance ? (
                <View style={[styles.attendanceStatusBox, { borderColor: theme.warning, backgroundColor: theme.warningSoft }]}>
                  <ThemedText type="smallBold" style={{ color: theme.warningStrong }}>
                    لديك حضور مفتوح في محطة أخرى
                  </ThemedText>
                  <ThemedText type="small" style={{ color: theme.warningStrong }}>
                    محطة #{attendanceSession?.clockInLocation?.stationId ?? '-'} · {attendanceSession?.clockInLocation?.stationLabel ?? 'غير محدد'}
                  </ThemedText>
                  {attendanceSession?.clockInLocation?.stationId ? (
                    <SecondaryButton
                      icon="file-text"
                      onPress={() =>
                        router.push({
                          pathname: '/report/[stationId]',
                          params: { stationId: attendanceSession.clockInLocation?.stationId ?? '' },
                        })
                      }>
                      فتح محطة الحضور
                    </SecondaryButton>
                  ) : null}
                </View>
              ) : (
                <View style={[styles.attendanceStatusBox, { borderColor: theme.border, backgroundColor: theme.surfaceCard }]}>
                  <ThemedText type="smallBold">لم يتم تسجيل حضور لهذه المحطة بعد</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    سيتم التحقق من الموقع ودقة GPS قبل فتح الإرسال.
                  </ThemedText>
                </View>
              )}

              <InputField
                label="ملاحظات الحضور اختياري"
                multiline
                onChangeText={setAttendanceNotes}
                placeholder="مثال: بداية فحص منطقة المخزن"
                style={styles.attendanceNotes}
                value={attendanceNotes}
              />

              {attendanceError ? <ThemedText selectable style={{ color: theme.danger }}>{attendanceError}</ThemedText> : null}

              {hasStationAttendance ? (
                <SecondaryButton disabled={isAttendanceLoading} icon="logout" loading={isAttendanceLoading} onPress={() => void submitAttendance('clockOut')}>
                  تسجيل الانصراف من المحطة
                </SecondaryButton>
              ) : (
                <PrimaryButton
                  disabled={isAttendanceLoading || hasOtherOpenAttendance}
                  icon="map-pin"
                  loading={isAttendanceLoading}
                  onPress={() => void submitAttendance('clockIn')}>
                  تسجيل حضور المحطة
                </PrimaryButton>
              )}
            </View>

            <View style={styles.section}>
              <ThemedText type="title" style={styles.sectionTitle}>
                {strings.report.stationStatusTitle}
              </ThemedText>
              <View style={styles.statusList}>
                {StatusOptions.map((option) => (
                  <StatusOptionRow
                    key={option.value}
                    label={statusOptionLabels[option.value]}
                    onPress={() => toggleStatus(option.value)}
                    selected={status.includes(option.value)}
                  />
                ))}
              </View>
            </View>

            <View style={styles.section}>
              <ThemedText type="title" style={styles.sectionTitle}>
                {strings.report.notesTitle}
              </ThemedText>
              <InputField
                label={strings.report.notesLabel}
                multiline
                onChangeText={setNotes}
                placeholder={strings.report.notesPlaceholder}
                style={styles.notes}
                value={notes}
              />
            </View>

            <View style={styles.section}>
              <ThemedText type="title" style={styles.sectionTitle}>
                {strings.report.visualDocumentation}
              </ThemedText>
              <PhotoCapturePanel
                onError={setError}
                onPhotoCaptured={handlePhotoCaptured}
                onPhotoRemoved={handlePhotoRemoved}
                photoUri={inspectionPhotoUri}
                stationId={stationId}
              />
            </View>

            {error ? <ThemedText selectable style={{ color: theme.danger }}>{error}</ThemedText> : null}

            <View style={styles.actions}>
              <SecondaryButton disabled={isSaving} icon="clipboard-check" onPress={() => void saveReportDraft()} stretch>
                {strings.report.saveOffline}
              </SecondaryButton>
              <PrimaryButton disabled={isSaving || (isTechnician && !hasStationAttendance)} icon="send" loading={isSaving} onPress={() => void submitReport()}>
                {isSaving ? strings.actions.saving : strings.report.submit}
              </PrimaryButton>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  actions: {
    gap: Spacing.md,
    paddingTop: Spacing.sm,
  },
  attendanceCopy: {
    flex: 1,
    gap: Spacing.xs,
  },
  attendanceHeader: {
    alignItems: 'center',
    gap: Spacing.md,
  },
  attendanceIcon: {
    alignItems: 'center',
    borderRadius: Radius.full,
    height: 52,
    justifyContent: 'center',
    width: 52,
  },
  attendanceNotes: {
    minHeight: 92,
  },
  attendancePanel: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    gap: Spacing.md,
    padding: Spacing.lg,
  },
  attendanceStatusBox: {
    borderRadius: Radius.md,
    borderWidth: 1,
    gap: Spacing.xs,
    padding: Spacing.md,
  },
  attendanceTitle: {
    fontSize: Typography.fontSize.lg,
  },
  checkbox: {
    alignItems: 'center',
    borderRadius: Radius.sm,
    borderWidth: 1,
    height: 34,
    justifyContent: 'center',
    width: 34,
  },
  cameraActions: {
    bottom: Spacing.md,
    gap: Spacing.sm,
    left: Spacing.md,
    position: 'absolute',
    right: Spacing.md,
  },
  cameraBox: {
    aspectRatio: 3 / 4,
    borderRadius: Radius.lg,
    borderWidth: 1,
    maxHeight: 520,
    overflow: 'hidden',
    position: 'relative',
    width: '100%',
  },
  keyboardView: {
    flex: 1,
  },
  locationRow: {
    alignItems: 'center',
    gap: Spacing.xs,
  },
  notes: {
    minHeight: 156,
  },
  photoBox: {
    alignItems: 'center',
    borderRadius: Radius.lg,
    borderStyle: 'dashed',
    borderWidth: 2,
    gap: Spacing.sm,
    minHeight: 188,
    justifyContent: 'center',
    padding: Spacing.lg,
  },
  photoHint: {
    textAlign: 'center',
  },
  photoIcon: {
    alignItems: 'center',
    borderRadius: Radius.full,
    height: 64,
    justifyContent: 'center',
    width: 64,
  },
  photoActions: {
    flexWrap: 'wrap',
    gap: Spacing.sm,
    justifyContent: 'center',
  },
  photoCaptureSection: {
    gap: Spacing.md,
  },
  photoPreview: {
    height: '100%',
    width: '100%',
  },
  photoPreviewFrame: {
    aspectRatio: 4 / 3,
    borderRadius: Radius.lg,
    borderWidth: 1,
    overflow: 'hidden',
    width: '100%',
  },
  safeArea: {
    flex: 1,
    width: '100%',
  },
  scrollContent: {
    gap: Spacing.lg,
    paddingBottom: BottomTabInset + Spacing.xl,
  },
  section: {
    gap: Spacing.md,
  },
  sectionTitle: {
    fontSize: Typography.fontSize.lg,
  },
  stationCard: {
    alignItems: 'center',
    borderRadius: Radius.lg,
    borderWidth: 1,
    gap: Spacing.md,
    minHeight: 112,
    padding: Spacing.lg,
  },
  stationCopy: {
    flex: 1,
    gap: Spacing.sm,
  },
  stationIcon: {
    alignItems: 'center',
    borderRadius: Radius.full,
    height: 66,
    justifyContent: 'center',
    width: 66,
  },
  stationPhoto: {
    borderRadius: Radius.md,
    borderWidth: 1,
    height: 74,
    width: 74,
  },
  statusLabel: {
    flex: 1,
    fontSize: Typography.fontSize.md,
  },
  statusList: {
    gap: Spacing.md,
  },
  statusRow: {
    alignItems: 'center',
    borderRadius: Radius.lg,
    borderWidth: 1,
    gap: Spacing.md,
    minHeight: TouchTarget + 18,
    paddingHorizontal: Spacing.md,
  },
});
