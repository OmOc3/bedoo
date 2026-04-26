import { useState } from 'react';
import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';
import { Linking, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BrandHeader, Card, PrimaryButton, ScreenShell, SecondaryButton } from '@/components/bedoo-ui';
import { ThemedText } from '@/components/themed-text';
import { BottomTabInset, Spacing, WebBaseUrl } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

function normalizeStationId(value: string): string {
  return value.trim().replace(/^\/+|\/+$/g, '');
}

export default function ScanScreen() {
  const [stationId, setStationId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [lastScannedValue, setLastScannedValue] = useState<string | null>(null);
  const theme = useTheme();
  const normalizedStationId = normalizeStationId(stationId);

  function openReport() {
    if (!normalizedStationId) {
      setError('أدخل رقم المحطة أولًا.');
      return;
    }

    setError(null);
    Linking.openURL(`${WebBaseUrl}/station/${encodeURIComponent(normalizedStationId)}/report`);
  }

  function handleBarcodeScanned(result: BarcodeScanningResult) {
    if (!result.data || result.data === lastScannedValue) {
      return;
    }

    setLastScannedValue(result.data);
    const match = result.data.match(/\/station\/([^/]+)\/report/);

    if (match?.[1]) {
      setStationId(decodeURIComponent(match[1]));
      return;
    }

    setError('تم مسح QR، لكنه لا يطابق رابط محطة Bedoo.');
  }

  return (
    <ScreenShell>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <BrandHeader subtitle="مسح QR أو إدخال رقم المحطة" />

          <Card>
            <ThemedText type="title">مسح محطة</ThemedText>
            <ThemedText themeColor="textSecondary">
              استخدم كاميرا الهاتف لمسح QR الموجود على المحطة. إذا لم يفتح الرابط تلقائيًا، أدخل رقم المحطة يدويًا.
            </ThemedText>
            <View style={[styles.cameraFrame, { borderColor: theme.border, backgroundColor: theme.background }]}>
              {permission?.granted ? (
                <>
                  <CameraView
                    barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
                    facing="back"
                    onBarcodeScanned={handleBarcodeScanned}
                    style={StyleSheet.absoluteFill}
                  />
                  <View pointerEvents="none" style={[styles.scanGuide, { borderColor: theme.primary }]} />
                </>
              ) : (
                <View style={styles.permissionBox}>
                  <ThemedText type="small" themeColor="textSecondary">
                    فعّل الكاميرا لمسح QR مباشرة من التطبيق.
                  </ThemedText>
                  <PrimaryButton onPress={requestPermission}>تفعيل الكاميرا</PrimaryButton>
                </View>
              )}
            </View>
          </Card>

          <Card>
            <ThemedText type="smallBold">رقم المحطة</ThemedText>
            <TextInput
              autoCapitalize="none"
              autoCorrect={false}
              onChangeText={setStationId}
              placeholder="stationId"
              placeholderTextColor={theme.textSecondary}
              style={[
                styles.input,
                {
                  backgroundColor: theme.background,
                  borderColor: theme.border,
                  color: theme.text,
                },
              ]}
              value={stationId}
            />
            {error ? <ThemedText style={{ color: theme.danger }}>{error}</ThemedText> : null}
            <PrimaryButton onPress={openReport}>فتح نموذج التقرير</PrimaryButton>
          </Card>

          <View style={styles.actions}>
            <SecondaryButton onPress={() => Linking.openURL(`${WebBaseUrl}/scan`)}>
              صفحة المسح على الويب
            </SecondaryButton>
            <SecondaryButton onPress={() => Linking.openURL(`${WebBaseUrl}/login`)}>
              تسجيل الدخول
            </SecondaryButton>
          </View>
        </ScrollView>
      </SafeAreaView>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  actions: {
    flexDirection: 'row-reverse',
    gap: Spacing.two,
  },
  cameraFrame: {
    aspectRatio: 1,
    borderRadius: 18,
    borderWidth: 1,
    overflow: 'hidden',
    position: 'relative',
  },
  input: {
    borderRadius: 14,
    borderWidth: 1,
    fontSize: 16,
    minHeight: 52,
    paddingHorizontal: Spacing.three,
    textAlign: 'left',
  },
  permissionBox: {
    flex: 1,
    gap: Spacing.three,
    justifyContent: 'center',
    padding: Spacing.three,
  },
  scanGuide: {
    borderRadius: 18,
    borderWidth: 3,
    bottom: '18%',
    left: '18%',
    position: 'absolute',
    right: '18%',
    top: '18%',
  },
  safeArea: {
    flex: 1,
    width: '100%',
  },
  scrollContent: {
    gap: Spacing.three,
    paddingBottom: BottomTabInset + Spacing.four,
  },
});
