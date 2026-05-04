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
const arabicTextPattern = /[\u0600-\u06FF]/u;

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

const clientSignupCopy = {
  ar: {
    accessCode: 'كود الدخول',
    accountCreatedNoSession: 'تم إنشاء الحساب لكن تعذر حفظ الجلسة. سجل الدخول من الشاشة الرئيسية.',
    addresses: 'العناوين',
    alreadyHaveAccount: 'لدي حساب بالفعل',
    body: 'حساب واحد لكل جهاز لمتابعة الطلبات والمحطات والتقارير من نفس بيانات الويب.',
    confirmAccessCode: 'تأكيد كود الدخول',
    createAccount: 'إنشاء الحساب',
    createFailed: 'تعذر إنشاء حساب العميل.',
    customerName: 'اسم العميل',
    missingFields: 'أكمل الاسم والبريد والهاتف وكود الدخول.',
    phone: 'رقم الهاتف',
    title: 'إنشاء حساب عميل',
    codeMismatch: 'تأكيد كود الدخول لا يطابق الكود الأول.',
  },
  en: {
    accessCode: 'Access code',
    accountCreatedNoSession: 'The account was created, but the session could not be saved. Sign in from the main screen.',
    addresses: 'Addresses',
    alreadyHaveAccount: 'I already have an account',
    body: 'One account per device to track orders, stations, and reports from the same web data.',
    confirmAccessCode: 'Confirm access code',
    createAccount: 'Create account',
    createFailed: 'Could not create the client account.',
    customerName: 'Client name',
    missingFields: 'Enter the name, email, phone, and access code.',
    phone: 'Phone number',
    title: 'Create client account',
    codeMismatch: 'The access code confirmation does not match the first code.',
  },
} as const;

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
  const { language, strings } = useLanguage();
  const t = clientSignupCopy[language];
  const { showToast } = useToast();

  async function submit(): Promise<void> {
    if (!form.displayName.trim() || !form.email.trim() || !form.phone.trim() || !form.accessCode.trim()) {
      setError(t.missingFields);
      await warningHaptic();
      return;
    }

    if (form.accessCode !== form.confirmAccessCode) {
      setError(t.codeMismatch);
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
        const apiMessage = typeof payload?.message === 'string' ? payload.message : null;
        throw new Error(apiMessage && !(language === 'en' && arabicTextPattern.test(apiMessage)) ? apiMessage : t.createFailed);
      }

      const cookie = response.headers.get('set-cookie');

      if (!cookie) {
        throw new Error(t.accountCreatedNoSession);
      }

      await persistAuthCookie(cookie);
      await reloadCurrentUser();
      await successHaptic();
      router.replace('/(tabs)');
    } catch (signupError: unknown) {
      const message = signupError instanceof Error ? signupError.message : t.createFailed;
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
                <ThemedText type="subtitle">{t.title}</ThemedText>
                <ThemedText themeColor="textSecondary" style={styles.centerText}>
                  {t.body}
                </ThemedText>
              </View>
              <View style={styles.formStack}>
                <InputField label={t.customerName} onChangeText={(value) => setForm((current) => ({ ...current, displayName: value }))} value={form.displayName} />
                <InputField contentDirection="ltr" label={strings.auth.email} onChangeText={(value) => setForm((current) => ({ ...current, email: value }))} value={form.email} />
                <InputField contentDirection="ltr" label={t.phone} onChangeText={(value) => setForm((current) => ({ ...current, phone: value }))} value={form.phone} />
                <InputField contentDirection="ltr" label={t.accessCode} onChangeText={(value) => setForm((current) => ({ ...current, accessCode: value }))} secureTextEntry value={form.accessCode} />
                <InputField contentDirection="ltr" label={t.confirmAccessCode} onChangeText={(value) => setForm((current) => ({ ...current, confirmAccessCode: value }))} secureTextEntry value={form.confirmAccessCode} />
                <InputField label={t.addresses} multiline onChangeText={(value) => setForm((current) => ({ ...current, addressesText: value }))} value={form.addressesText} />
                {error ? (
                  <ThemedText selectable style={{ color: theme.danger }}>
                    {error}
                  </ThemedText>
                ) : null}
                <PrimaryButton icon="user" loading={submitting} onPress={() => void submit()}>
                  {t.createAccount}
                </PrimaryButton>
                <SecondaryButton icon="login" onPress={() => router.replace('/login')}>
                  {t.alreadyHaveAccount}
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
