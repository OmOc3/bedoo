import * as SecureStore from 'expo-secure-store';
import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Logo } from '@/components/brand/logo';
import { InputField, PrimaryButton, ScreenShell, SecondaryButton, useToast } from '@/components/ecopest-ui';
import { ThemedText } from '@/components/themed-text';
import { BottomTabInset, Radius, Shadow, Spacing } from '@/constants/theme';
import { useLanguage } from '@/contexts/language-context';
import { useThemeMode } from '@/contexts/theme-context';
import { useTheme } from '@/hooks/use-theme';
import { reloadCurrentUser } from '@/lib/auth';
import { persistAuthCookie } from '@/lib/auth-client';
import { errorHaptic, successHaptic, warningHaptic } from '@/lib/haptics';
import { getApiBaseUrl } from '@/lib/sync/api-client';
import type { ApiErrorResponse, LoginSuccessResponse } from '@/lib/sync/types';

const deviceIdStorageKey = 'ecopest_client_signup_device_id';

interface SignupForm {
  accessCode: string;
  addressesText: string;
  confirmAccessCode: string;
  displayName: string;
  email: string;
  phone: string;
}

const emptyForm: SignupForm = {
  accessCode: '',
  addressesText: '',
  confirmAccessCode: '',
  displayName: '',
  email: '',
  phone: '',
};

function randomDeviceId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID().replace(/-/g, '');
  }

  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}${Math.random().toString(36).slice(2)}`;
}

async function getClientSignupDeviceId(): Promise<string> {
  const existing = await SecureStore.getItemAsync(deviceIdStorageKey);

  if (existing) {
    return existing;
  }

  const next = randomDeviceId();
  await SecureStore.setItemAsync(deviceIdStorageKey, next);
  return next;
}

async function parseResponse<T>(response: Response): Promise<T | null> {
  const text = await response.text();

  if (!text) {
    return null;
  }

  return JSON.parse(text) as T;
}

export default function ClientSignupScreen() {
  const [form, setForm] = useState<SignupForm>(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const theme = useTheme();
  const { resolvedTheme } = useThemeMode();
  const { strings } = useLanguage();
  const { showToast } = useToast();

  async function submit(): Promise<void> {
    if (!form.displayName.trim() || !form.email.trim() || !form.phone.trim() || !form.accessCode.trim()) {
      setError('أكمل الاسم والبريد والهاتف وكود الدخول.');
      await warningHaptic();
      return;
    }

    if (form.accessCode !== form.confirmAccessCode) {
      setError('تأكيد كود الدخول لا يطابق الكود الأول.');
      await warningHaptic();
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const baseUrl = await getApiBaseUrl();
      const deviceId = await getClientSignupDeviceId();
      const response = await fetch(`${baseUrl}/api/auth/client-signup`, {
        body: JSON.stringify({
          ...form,
          deviceId,
        }),
        headers: {
          'Content-Type': 'application/json',
        },
        method: 'POST',
      });
      const payload = await parseResponse<LoginSuccessResponse & ApiErrorResponse>(response);

      if (!response.ok) {
        throw new Error(payload?.message ?? 'تعذر إنشاء حساب العميل.');
      }

      const cookie = response.headers.get('set-cookie');

      if (!cookie) {
        throw new Error('تم إنشاء الحساب لكن تعذر حفظ الجلسة. سجل الدخول من الشاشة الرئيسية.');
      }

      await persistAuthCookie(cookie);
      await reloadCurrentUser();
      await successHaptic();
      router.replace('/(tabs)');
    } catch (signupError: unknown) {
      const message = signupError instanceof Error ? signupError.message : 'تعذر إنشاء حساب العميل.';
      setError(message);
      showToast(message, 'error');
      await errorHaptic();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ScreenShell>
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.keyboardView}>
          <ScrollView contentContainerStyle={styles.scrollContent} contentInsetAdjustmentBehavior="automatic" keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <View style={[styles.card, Shadow.sm, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
              <View style={[styles.hero, { backgroundColor: theme.surfaceCard }]}>
                <Logo layout="stacked" size={122} theme={resolvedTheme} variant="full" />
                <ThemedText type="subtitle">إنشاء حساب عميل</ThemedText>
                <ThemedText themeColor="textSecondary" style={styles.centerText}>
                  حساب واحد لكل جهاز لمتابعة الطلبات والمحطات والتقارير من نفس بيانات الويب.
                </ThemedText>
              </View>
              <View style={styles.formStack}>
                <InputField label="اسم العميل" onChangeText={(value) => setForm((current) => ({ ...current, displayName: value }))} value={form.displayName} />
                <InputField contentDirection="ltr" label={strings.auth.email} onChangeText={(value) => setForm((current) => ({ ...current, email: value }))} value={form.email} />
                <InputField contentDirection="ltr" label="رقم الهاتف" onChangeText={(value) => setForm((current) => ({ ...current, phone: value }))} value={form.phone} />
                <InputField contentDirection="ltr" label="كود الدخول" onChangeText={(value) => setForm((current) => ({ ...current, accessCode: value }))} secureTextEntry value={form.accessCode} />
                <InputField contentDirection="ltr" label="تأكيد كود الدخول" onChangeText={(value) => setForm((current) => ({ ...current, confirmAccessCode: value }))} secureTextEntry value={form.confirmAccessCode} />
                <InputField label="العناوين" multiline onChangeText={(value) => setForm((current) => ({ ...current, addressesText: value }))} value={form.addressesText} />
                {error ? (
                  <ThemedText selectable style={{ color: theme.danger }}>
                    {error}
                  </ThemedText>
                ) : null}
                <PrimaryButton icon="user" loading={submitting} onPress={() => void submit()}>
                  إنشاء الحساب
                </PrimaryButton>
                <SecondaryButton icon="login" onPress={() => router.replace('/login')}>
                  لدي حساب بالفعل
                </SecondaryButton>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    overflow: 'hidden',
    width: '100%',
  },
  centerText: {
    textAlign: 'center',
  },
  formStack: {
    gap: Spacing.lg,
    padding: Spacing.lg,
  },
  hero: {
    alignItems: 'center',
    gap: Spacing.sm,
    paddingBottom: Spacing.xl,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xxl,
  },
  keyboardView: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    width: '100%',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingBottom: BottomTabInset + Spacing.lg,
    paddingTop: Spacing.lg,
  },
});
