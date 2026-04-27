import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TextInput, View, type TextInputProps } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EcoPestIcon, type EcoPestIconName } from '@/components/icons';
import { PrimaryButton, ScreenShell, useToast } from '@/components/ecopest-ui';
import { ThemedText } from '@/components/themed-text';
import { BottomTabInset, Fonts, Radius, Shadow, Spacing, TouchTarget, Typography } from '@/constants/theme';
import { useLanguage } from '@/contexts/language-context';
import { useTheme } from '@/hooks/use-theme';
import { authClient } from '@/lib/auth-client';
import { loadMobileUserProfile } from '@/lib/auth';
import { getMobileHomeRoute } from '@/lib/auth-routes';
import { errorHaptic, successHaptic } from '@/lib/haptics';

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function LoginField({ icon, label, style, ...props }: TextInputProps & { icon: EcoPestIconName; label: string }) {
  const theme = useTheme();

  return (
    <View style={styles.fieldGroup}>
      <ThemedText type="smallBold" style={styles.fieldLabel}>
        {label}
      </ThemedText>
      <View style={[styles.inputShell, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
        <TextInput
          placeholderTextColor={theme.textSecondary}
          style={[styles.input, { color: theme.text, writingDirection: 'ltr' }, style]}
          textAlign="left"
          {...props}
        />
        <EcoPestIcon color={theme.textSecondary} name={icon} size={24} />
      </View>
    </View>
  );
}

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [accessCode, setAccessCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const { strings } = useLanguage();
  const theme = useTheme();
  const { showToast } = useToast();

  function mapAuthError(errorValue: unknown): string {
    if (errorValue instanceof Error && errorValue.message === strings.auth.missingProfile) {
      return strings.auth.missingProfile;
    }

    if (errorValue instanceof Error && errorValue.message === 'NETWORK_ERROR') {
      return strings.auth.networkError;
    }

    if (errorValue instanceof Error && errorValue.message === 'USER_DISABLED') {
      return strings.auth.userDisabled;
    }

    if (errorValue instanceof Error && errorValue.message === 'INVALID_CREDENTIALS') {
      return strings.auth.invalidCredentials;
    }

    return strings.auth.genericLoginError;
  }

  async function submitLogin(): Promise<void> {
    const cleanEmail = email.trim();

    if (!cleanEmail) {
      setError(strings.validation.requiredEmail);
      return;
    }

    if (!isValidEmail(cleanEmail)) {
      setError(strings.auth.invalidEmail);
      return;
    }

    if (!accessCode.trim()) {
      setError(strings.auth.accessCodeRequired);
      return;
    }

    setError(null);
    setIsSigningIn(true);

    try {
      const result = await authClient.signIn.email({
        email: cleanEmail,
        password: accessCode.trim(),
      });

      if (result.error) {
        throw new Error(result.error.code === 'USER_BANNED' ? 'USER_DISABLED' : 'INVALID_CREDENTIALS');
      }

      const profile = await loadMobileUserProfile();

      if (!profile) {
        await authClient.signOut();
        throw new Error(strings.auth.missingProfile);
      }

      await successHaptic();
      setAccessCode('');
      router.replace(getMobileHomeRoute(profile.role));
    } catch (loginError: unknown) {
      await authClient.signOut().catch(() => undefined);
      const message = mapAuthError(loginError);
      setError(message);
      showToast(message, 'error');
      await errorHaptic();
    } finally {
      setIsSigningIn(false);
    }
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
            <View style={[styles.loginCard, Shadow.sm, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
              <View style={[styles.loginHero, { backgroundColor: theme.surfaceCard }]}>
                <View style={[styles.logoCircle, { backgroundColor: theme.primaryLight }]}>
                  <EcoPestIcon color={theme.onPrimary} name="map-pin" size={32} strokeWidth={2.6} />
                </View>
                <ThemedText type="subtitle" style={styles.brandTitle}>
                  {strings.appNameArabic}
                </ThemedText>
                <ThemedText type="title" themeColor="textSecondary" style={styles.loginTitle}>
                  {strings.auth.loginTitle}
                </ThemedText>
                <ThemedText themeColor="textSecondary" style={styles.loginSubtitle}>
                  {strings.auth.loginSubtitle}
                </ThemedText>
              </View>

              <View style={styles.loginForm}>
                <LoginField
                  autoCapitalize="none"
                  autoComplete="email"
                  autoCorrect={false}
                  icon="mail"
                  inputMode="email"
                  label={strings.auth.email}
                  onChangeText={setEmail}
                  placeholder={strings.auth.emailPlaceholder}
                  value={email}
                />

                <LoginField
                  autoCapitalize="none"
                  autoComplete="off"
                  icon="key"
                  label={strings.auth.accessCode}
                  onChangeText={setAccessCode}
                  placeholder={strings.auth.accessCodePlaceholder}
                  secureTextEntry
                  value={accessCode}
                />

                {error ? (
                  <ThemedText selectable style={{ color: theme.danger }}>
                    {error}
                  </ThemedText>
                ) : null}

                <PrimaryButton disabled={isSigningIn} icon="login" loading={isSigningIn} onPress={() => void submitLogin()}>
                {isSigningIn ? strings.auth.signingIn : strings.actions.login}
              </PrimaryButton>
              </View>

              <View style={[styles.loginFooter, { borderTopColor: theme.border }]}>
                <ThemedText type="small" themeColor="textSecondary" style={styles.footerText}>
                  تواجه مشكلة في تسجيل الدخول؟ <ThemedText type="linkPrimary">اتصل بالدعم الفني</ThemedText>
                </ThemedText>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  brandTitle: {
    fontSize: Typography.fontSize.xxl,
    textAlign: 'center',
  },
  fieldGroup: {
    gap: Spacing.sm,
  },
  fieldLabel: {
    fontSize: Typography.fontSize.base,
    textAlign: 'right',
  },
  footerText: {
    textAlign: 'center',
  },
  input: {
    flex: 1,
    fontFamily: Fonts.sans,
    fontSize: Typography.fontSize.base,
    minHeight: TouchTarget,
    paddingHorizontal: Spacing.md,
  },
  inputShell: {
    alignItems: 'center',
    borderRadius: Radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    minHeight: 58,
    paddingHorizontal: Spacing.md,
  },
  keyboardView: {
    flex: 1,
  },
  loginCard: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    overflow: 'hidden',
    width: '100%',
  },
  loginFooter: {
    borderTopWidth: 1,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
  },
  loginForm: {
    gap: Spacing.lg,
    padding: Spacing.lg,
  },
  loginHero: {
    alignItems: 'center',
    gap: Spacing.sm,
    paddingBottom: Spacing.xl,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xxl,
  },
  loginSubtitle: {
    textAlign: 'center',
  },
  loginTitle: {
    fontFamily: Fonts.sans,
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.regular,
    textAlign: 'center',
  },
  logoCircle: {
    alignItems: 'center',
    borderRadius: Radius.full,
    height: 56,
    justifyContent: 'center',
    width: 56,
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
