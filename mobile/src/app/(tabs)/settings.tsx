import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native';
import { useEffect, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EcoPestIcon, type EcoPestIconName } from '@/components/icons';
import { InputField, MobileTopBar, ScreenShell, SecondaryButton, useToast } from '@/components/ecopest-ui';
import { ThemedText } from '@/components/themed-text';
import { BottomTabInset, Brand, Fonts, Radius, Shadow, Spacing, TouchTarget, Typography, WebBaseUrl } from '@/constants/theme';
import { useKeepAwakeMode } from '@/contexts/keep-awake-context';
import { useLanguage } from '@/contexts/language-context';
import { useTextScale } from '@/contexts/text-scale-context';
import { type ThemeMode, useThemeMode } from '@/contexts/theme-context';
import { useTheme } from '@/hooks/use-theme';
import { signOut, useCurrentUser } from '@/lib/auth';
import { errorHaptic, successHaptic } from '@/lib/haptics';
import { getApiBaseUrl, setApiBaseUrl } from '@/lib/sync/api-client';
import { type Language } from '@/lib/i18n';

const modes: ThemeMode[] = ['system', 'light', 'dark'];
const languageOptions: Language[] = ['ar', 'en'];
const languageLabelKeys: Record<Language, 'languageArabic' | 'languageEnglish'> = {
  ar: 'languageArabic',
  en: 'languageEnglish',
};
const modeLabelKeys: Record<ThemeMode, 'themeSystem' | 'themeLight' | 'themeDark'> = {
  system: 'themeSystem',
  light: 'themeLight',
  dark: 'themeDark',
};

function SettingsCard({ children, title }: { children: ReactNode; title: string }) {
  const theme = useTheme();

  return (
    <View style={styles.section}>
      <ThemedText type="title" style={styles.sectionTitle}>
        {title}
      </ThemedText>
      <View style={[styles.settingsCard, Shadow.sm, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>{children}</View>
    </View>
  );
}

function SettingsRow({
  children,
  icon,
  subtitle,
  title,
}: {
  children?: ReactNode;
  icon: EcoPestIconName;
  subtitle?: string;
  title: string;
}) {
  const theme = useTheme();

  return (
    <View style={styles.settingsRow}>
      <View style={[styles.rowIcon, { backgroundColor: theme.background }]}>
        <EcoPestIcon color={theme.textSecondary} name={icon} size={25} />
      </View>
      <View style={styles.rowCopy}>
        <ThemedText type="smallBold" style={styles.rowTitle}>
          {title}
        </ThemedText>
        {subtitle ? (
          <ThemedText type="small" themeColor="textSecondary">
            {subtitle}
          </ThemedText>
        ) : null}
      </View>
      {children}
    </View>
  );
}

export default function SettingsScreen() {
  const { mode, resolvedTheme, setMode } = useThemeMode();
  const { keepAwakeEnabled, setKeepAwakeEnabled } = useKeepAwakeMode();
  const { largeTextEnabled, setLargeTextEnabled } = useTextScale();
  const { language, needsRestart, roleLabels, setLanguage, strings } = useLanguage();
  const currentUser = useCurrentUser();
  const theme = useTheme();
  const t = strings.settings;
  const legal = strings.legal;
  const [webAppUrl, setWebAppUrlState] = useState(WebBaseUrl);
  const { showToast } = useToast();

  useEffect(() => {
    let isMounted = true;

    void getApiBaseUrl().then((value) => {
      if (isMounted) {
        setWebAppUrlState(value);
      }
    });

    return () => {
      isMounted = false;
    };
  }, []);

  async function saveWebAppUrl(): Promise<void> {
    const cleanUrl = webAppUrl.trim();

    if (!cleanUrl) {
      return;
    }

    await setApiBaseUrl(cleanUrl);
    showToast('تم حفظ رابط البوابة.', 'success');
  }

  async function logout(): Promise<void> {
    try {
      await signOut();
      showToast(t.logoutDone, 'success');
      await successHaptic();
      router.replace('/login');
    } catch {
      showToast(strings.auth.logoutError, 'error');
      await errorHaptic();
    }
  }

  const profile = currentUser?.profile;

  return (
    <ScreenShell>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.scrollContent} contentInsetAdjustmentBehavior="automatic" showsVerticalScrollIndicator={false}>
          <MobileTopBar
            leftIcon="menu"
            leftLabel="القائمة"
            onLeftPress={() => router.push('/(tabs)')}
            rightIcon="user"
            rightLabel="الحساب"
            title={t.title}
          />

          <View style={[styles.profileCard, Shadow.sm, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
            <View style={[styles.avatar, { backgroundColor: theme.surfaceCardDark }]}>
              <EcoPestIcon color={theme.onPrimary} name="user" size={30} />
            </View>
            <View style={styles.profileCopy}>
              <ThemedText type="title">{profile?.displayName ?? 'مستخدم EcoPest'}</ThemedText>
              <ThemedText themeColor="textSecondary">{profile ? roleLabels[profile.role] : 'فريق ميداني'}</ThemedText>
            </View>
            <View style={[styles.editCircle, { backgroundColor: theme.background }]}>
              <EcoPestIcon color={theme.text} name="edit" size={22} />
            </View>
          </View>

          <SettingsCard title="إعدادات التطبيق">
            <SettingsRow icon="globe" title={t.languageTitle}>
              <View style={styles.segmented}>
                {languageOptions.map((item) => (
                  <SecondaryButton key={item} selected={language === item} onPress={() => void setLanguage(item)}>
                    {t[languageLabelKeys[item]]}
                  </SecondaryButton>
                ))}
              </View>
            </SettingsRow>
            {needsRestart ? (
              <ThemedText type="small" themeColor="textSecondary" style={styles.restartHint}>
                {t.languageRestartHint}
              </ThemedText>
            ) : null}
            <View style={[styles.rowDivider, { backgroundColor: theme.border }]} />
            <SettingsRow icon="moon" subtitle={`${t.themeCurrent}: ${resolvedTheme === 'dark' ? t.themeDark : t.themeLight}`} title={t.themeTitle}>
              <View style={styles.segmented}>
                {modes.map((item) => (
                  <SecondaryButton key={item} selected={mode === item} onPress={() => setMode(item)}>
                    {t[modeLabelKeys[item]]}
                  </SecondaryButton>
                ))}
              </View>
            </SettingsRow>
            <View style={[styles.rowDivider, { backgroundColor: theme.border }]} />
            <SettingsRow icon="type" title={t.largeTextTitle}>
              <Switch
                onValueChange={setLargeTextEnabled}
                thumbColor={theme.backgroundElement}
                trackColor={{ false: theme.border, true: theme.primaryLight }}
                value={largeTextEnabled}
              />
            </SettingsRow>
          </SettingsCard>

          <SettingsCard title="البيانات والمزامنة">
            <SettingsRow icon="sun" subtitle={t.keepAwakeBody} title={t.keepAwakeTitle}>
              <Switch
                onValueChange={setKeepAwakeEnabled}
                thumbColor={theme.backgroundElement}
                trackColor={{ false: theme.border, true: theme.primaryLight }}
                value={keepAwakeEnabled}
              />
            </SettingsRow>
            <View style={[styles.rowDivider, { backgroundColor: theme.border }]} />
            <SettingsRow icon="link" title={t.webAppTitle} />
            <View style={styles.webUrlRow}>
              <SecondaryButton onPress={() => void saveWebAppUrl()}>{strings.actions.save}</SecondaryButton>
              <View style={styles.webInput}>
                <InputField
                  autoCapitalize="none"
                  autoCorrect={false}
                  label={t.webAppUrlLabel}
                  onChangeText={setWebAppUrlState}
                  placeholder={t.webAppUrlPlaceholder}
                  value={webAppUrl}
                />
              </View>
            </View>
          </SettingsCard>

          <View style={styles.section}>
            <ThemedText type="title" style={styles.sectionTitle}>
              الحساب والأمان
            </ThemedText>
            <View style={[styles.securityCard, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
              <EcoPestIcon color={theme.textSecondary} name="shield" size={28} />
              <ThemedText themeColor="textSecondary" style={styles.securityText}>
                {t.securityBody}
              </ThemedText>
            </View>
          </View>

          <Pressable
            accessibilityRole="button"
            onPress={() => void logout()}
            style={({ pressed }) => [
              styles.logoutButton,
              { borderColor: theme.danger, opacity: pressed ? 0.76 : 1 },
            ]}>
            <EcoPestIcon color={theme.danger} name="logout" size={26} />
            <ThemedText type="title" style={[styles.logoutText, { color: theme.danger }]}>
              {t.logoutCta}
            </ThemedText>
          </Pressable>

          <View style={styles.legalRow}>
            <Pressable accessibilityRole="link" onPress={() => router.push('/legal/terms')}>
              <ThemedText type="linkPrimary">{legal.terms}</ThemedText>
            </Pressable>
            <Pressable accessibilityRole="link" onPress={() => router.push('/legal/privacy')}>
              <ThemedText type="linkPrimary">{legal.privacy}</ThemedText>
            </Pressable>
            <ThemedText type="small" themeColor="textSecondary">
              © 2025 {Brand.companyName} · {legal.allRightsReserved}
            </ThemedText>
          </View>
        </ScrollView>
      </SafeAreaView>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  avatar: {
    alignItems: 'center',
    borderRadius: Radius.full,
    height: 74,
    justifyContent: 'center',
    width: 74,
  },
  editCircle: {
    alignItems: 'center',
    borderRadius: Radius.full,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  legalRow: {
    alignItems: 'center',
    gap: Spacing.sm,
  },
  logoutButton: {
    alignItems: 'center',
    borderRadius: Radius.lg,
    borderWidth: 2,
    flexDirection: 'row-reverse',
    gap: Spacing.md,
    justifyContent: 'center',
    minHeight: 78,
  },
  logoutText: {
    fontSize: Typography.fontSize.lg,
  },
  profileCard: {
    alignItems: 'center',
    borderRadius: Radius.lg,
    borderWidth: 1,
    flexDirection: 'row-reverse',
    gap: Spacing.lg,
    minHeight: 132,
    padding: Spacing.lg,
  },
  profileCopy: {
    flex: 1,
    gap: Spacing.xs,
  },
  restartHint: {
    paddingHorizontal: Spacing.md,
  },
  rowCopy: {
    flex: 1,
    gap: Spacing.xs,
  },
  rowDivider: {
    height: 1,
    marginHorizontal: -Spacing.lg,
  },
  rowIcon: {
    alignItems: 'center',
    borderRadius: Radius.full,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  rowTitle: {
    fontSize: Typography.fontSize.base,
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
    fontFamily: Fonts.sansMedium,
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.medium,
  },
  securityCard: {
    alignItems: 'flex-start',
    borderRadius: Radius.lg,
    borderWidth: 1,
    flexDirection: 'row-reverse',
    gap: Spacing.md,
    padding: Spacing.lg,
  },
  securityText: {
    flex: 1,
    textAlign: 'center',
  },
  segmented: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    justifyContent: 'flex-start',
  },
  settingsCard: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    gap: Spacing.md,
    padding: Spacing.lg,
  },
  settingsRow: {
    alignItems: 'center',
    flexDirection: 'row-reverse',
    gap: Spacing.md,
    minHeight: TouchTarget,
  },
  webInput: {
    flex: 1,
    minWidth: 190,
  },
  webUrlRow: {
    alignItems: 'flex-end',
    flexDirection: 'row-reverse',
    gap: Spacing.sm,
  },
});
