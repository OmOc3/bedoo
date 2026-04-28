import { router } from 'expo-router';
import { useEffect, useState, type ReactNode } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';

import { EcoPestIcon, type EcoPestIconName } from '@/components/icons';
import { InputField, MobileTopBar, PrimaryButton, ScreenShell, useToast } from '@/components/ecopest-ui';
import { ThemedText } from '@/components/themed-text';
import { BottomTabInset, Brand, Fonts, Radius, Shadow, Spacing, TouchTarget, Typography } from '@/constants/theme';
import { useKeepAwakeMode } from '@/contexts/keep-awake-context';
import { useLanguage } from '@/contexts/language-context';
import { useTextScale } from '@/contexts/text-scale-context';
import { type ThemeMode, useThemeMode } from '@/contexts/theme-context';
import { useTheme } from '@/hooks/use-theme';
import { loadMobileUserProfile, reloadCurrentUser, signOut, useCurrentUser } from '@/lib/auth';
import { errorHaptic, successHaptic } from '@/lib/haptics';
import { type Language } from '@/lib/i18n';
import { pickLocalImage, uploadImage } from '@/lib/upload-image';
import { getApiBaseUrl } from '@/lib/sync/api-client';
import { readAuthCookieHeader } from '@/lib/auth-client';

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

function SettingsSection({ children, title }: { children: ReactNode; title: string }) {
  const theme = useTheme();

  return (
    <View style={styles.section}>
      <ThemedText type="smallBold" themeColor="textSecondary" style={styles.sectionTitle}>
        {title}
      </ThemedText>
      <View style={[styles.settingsCard, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
        {children}
      </View>
    </View>
  );
}

function SettingsItem({
  children,
  icon,
  subtitle,
  title,
  onPress,
}: {
  children?: ReactNode;
  icon: EcoPestIconName;
  subtitle?: string;
  title: string;
  onPress?: () => void;
}) {
  const theme = useTheme();

  const content = (
    <View style={[styles.settingsItem, { flexDirection: 'row' }]}>
      <View style={[styles.itemIcon, { backgroundColor: theme.backgroundSelected }]}>
        <EcoPestIcon color={theme.primary} name={icon} size={22} />
      </View>
      <View style={styles.itemCopy}>
        <ThemedText type="default" style={styles.itemTitle}>
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

  if (onPress) {
    return (
      <Pressable onPress={onPress} style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}>
        {content}
      </Pressable>
    );
  }

  return content;
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
  const { showToast } = useToast();

  const [isEditing, setIsEditing] = useState(false);
  const [displayName, setDisplayName] = useState(currentUser?.profile.displayName ?? '');
  const [isSaving, setIsSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  // Local URI shown immediately after picking before upload finishes
  const [localImageUri, setLocalImageUri] = useState<string | null>(null);

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

  async function handleUpdateProfile() {
    if (!currentUser?.profile.uid) return;
    setIsSaving(true);
    try {
      const baseUrl = await getApiBaseUrl();
      const cookie = await readAuthCookieHeader();
      const res = await fetch(`${baseUrl}/api/mobile/users/${currentUser.profile.uid}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Cookie: cookie,
        },
        body: JSON.stringify({ displayName }),
      });
      if (res.ok) {
        showToast("تم تحديث البيانات بنجاح", 'success');
        await successHaptic();
        setIsEditing(false);
        await reloadCurrentUser();
      } else {
        throw new Error('Update failed');
      }
    } catch {
      showToast("تعذر التحديث", 'error');
      await errorHaptic();
    } finally {
      setIsSaving(false);
    }
  }

  async function handlePickImage() {
    if (!currentUser?.profile.uid) return;
    // Step 1: pick locally and show preview immediately
    const localUri = await pickLocalImage();
    if (!localUri) return;
    setLocalImageUri(localUri);
    setUploadingImage(true);
    try {
      // Step 2: upload to server
      const url = await uploadImage(localUri, currentUser.profile.uid);
      if (url) {
        const baseUrl = await getApiBaseUrl();
        const cookie = await readAuthCookieHeader();
        await fetch(`${baseUrl}/api/mobile/users/${currentUser.profile.uid}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Cookie: cookie,
          },
          body: JSON.stringify({ image: url }),
        });
        showToast('تم تحديث الصورة بنجاح', 'success');
        await successHaptic();
        await reloadCurrentUser();
        // Keep the latest image visible instantly until profile refresh settles.
        setLocalImageUri(url);
      } else {
        // Upload failed — revert preview
        setLocalImageUri(null);
        showToast('تعذر رفع الصورة', 'error');
        await errorHaptic();
      }
    } catch {
      setLocalImageUri(null);
      showToast('تعذر رفع الصورة', 'error');
      await errorHaptic();
    } finally {
      setUploadingImage(false);
    }
  }

  const profile = currentUser?.profile;

  useEffect(() => {
    if (localImageUri && profile?.image && localImageUri === profile.image) {
      setLocalImageUri(null);
    }
  }, [localImageUri, profile?.image]);

  return (
    <ScreenShell>
      <SafeAreaView style={styles.safeArea}>
        <MobileTopBar
          leftIcon="menu"
          leftLabel={strings.actions.menu}
          onLeftPress={() => router.push('/(tabs)')}
          title={t.title}
        />
        <ScrollView contentContainerStyle={styles.scrollContent} contentInsetAdjustmentBehavior="automatic" showsVerticalScrollIndicator={false}>
          
          <View style={[styles.profileHeader]}>
             <Pressable onPress={() => void handlePickImage()} style={styles.avatarWrapper}>
                <View style={[styles.avatar, { backgroundColor: theme.primaryLight }]}>
                  {(localImageUri ?? profile?.image) ? (
                     <Image
                       source={{ uri: localImageUri ?? profile!.image! }}
                       style={styles.avatarImage}
                       cachePolicy="none"
                     />
                  ) : (
                     <EcoPestIcon color={theme.onPrimary} name="user" size={40} />
                  )}
                </View>
                <View style={[styles.editBadge, { backgroundColor: theme.primary, borderColor: theme.background }]}>
                  {uploadingImage ? (
                    <ActivityIndicator color={theme.onPrimary} size="small" />
                  ) : (
                    <EcoPestIcon color={theme.onPrimary} name="camera" size={14} />
                  )}
                </View>
             </Pressable>

             {isEditing ? (
               <View style={styles.editForm}>
                  <InputField label="الاسم" value={displayName} onChangeText={setDisplayName} />
                  <View style={[styles.editActions, { flexDirection: 'row' }]}>
                    <PrimaryButton loading={isSaving} onPress={() => void handleUpdateProfile()} icon="check">حفظ</PrimaryButton>
                    <PrimaryButton variant="ghost" onPress={() => setIsEditing(false)}>إلغاء</PrimaryButton>
                  </View>
               </View>
             ) : (
               <View style={styles.profileCopy}>
                 <ThemedText type="subtitle" style={{ textAlign: 'center' }}>{profile?.displayName ?? t.defaultUserName}</ThemedText>
                 <ThemedText themeColor="textSecondary" style={{ textAlign: 'center' }}>{profile ? roleLabels[profile.role] : t.defaultUserRole}</ThemedText>
                 <Pressable onPress={() => setIsEditing(true)} style={[styles.editProfileBtn, { backgroundColor: theme.surfaceCardDark }]}>
                    <ThemedText type="smallBold" themeColor="primary">تعديل الملف الشخصي</ThemedText>
                 </Pressable>
               </View>
             )}
          </View>

          <SettingsSection title={t.appSettingsTitle}>
            <SettingsItem icon="globe" title={t.languageTitle} />
            <View style={{ paddingHorizontal: Spacing.md, paddingBottom: Spacing.md }}>
               <View style={[styles.segmented, { flexDirection: 'row', backgroundColor: theme.backgroundElement, padding: Spacing.xs, borderRadius: Radius.lg, borderWidth: 1, borderColor: theme.border }]}>
                  {languageOptions.map((item) => (
                    <Pressable
                       key={item}
                       onPress={() => void setLanguage(item)}
                       style={[
                         styles.segmentBtn,
                         { flex: 1, alignItems: 'center' },
                         language === item && { backgroundColor: theme.primary },
                       ]}>
                       <ThemedText type="smallBold" style={{ color: language === item ? theme.onPrimary : theme.text }}>
                         {t[languageLabelKeys[item]]}
                       </ThemedText>
                    </Pressable>
                  ))}
               </View>
            </View>
            {needsRestart ? (
              <ThemedText type="small" themeColor="warning" style={styles.restartHint}>
                {t.languageRestartHint}
              </ThemedText>
            ) : null}
            <View style={[styles.divider, { backgroundColor: theme.border }]} />
            
            <SettingsItem icon="moon" title={t.themeTitle} subtitle={`${t.themeCurrent}: ${resolvedTheme === 'dark' ? t.themeDark : t.themeLight}`} />
            <View style={{ paddingHorizontal: Spacing.md, paddingBottom: Spacing.md }}>
               <View style={[styles.segmented, { flexDirection: 'row', backgroundColor: theme.backgroundElement, padding: Spacing.xs, borderRadius: Radius.lg, borderWidth: 1, borderColor: theme.border }]}>
                  {modes.map((item) => (
                    <Pressable
                       key={item}
                       onPress={() => setMode(item)}
                       style={[
                         styles.segmentBtn,
                         { flex: 1, alignItems: 'center' },
                         mode === item && { backgroundColor: theme.primary },
                       ]}>
                       <ThemedText type="smallBold" style={{ color: mode === item ? theme.onPrimary : theme.text }}>
                         {t[modeLabelKeys[item]]}
                       </ThemedText>
                    </Pressable>
                  ))}
               </View>
            </View>
            <View style={[styles.divider, { backgroundColor: theme.border }]} />
            <SettingsItem icon="type" title={t.largeTextTitle}>
              <Switch
                accessibilityHint={t.largeTextBody}
                accessibilityLabel={t.largeTextTitle}
                accessibilityRole="switch"
                accessibilityState={{ checked: largeTextEnabled }}
                onValueChange={setLargeTextEnabled}
                thumbColor={theme.backgroundElement}
                trackColor={{ false: theme.border, true: theme.primaryLight }}
                value={largeTextEnabled}
              />
            </SettingsItem>
          </SettingsSection>

          <SettingsSection title={t.dataSyncTitle}>
            <SettingsItem icon="sun" title={t.keepAwakeTitle} subtitle={t.keepAwakeBody}>
              <Switch
                accessibilityHint={t.keepAwakeBody}
                accessibilityLabel={t.keepAwakeTitle}
                accessibilityRole="switch"
                accessibilityState={{ checked: keepAwakeEnabled }}
                onValueChange={setKeepAwakeEnabled}
                thumbColor={theme.backgroundElement}
                trackColor={{ false: theme.border, true: theme.primaryLight }}
                value={keepAwakeEnabled}
              />
            </SettingsItem>
          </SettingsSection>

          <SettingsSection title={t.accountSecurityTitle}>
            <SettingsItem icon="shield" title="معلومات الأمان" subtitle={t.securityBody} />
          </SettingsSection>

          <View style={styles.footerActions}>
             <Pressable
               accessibilityRole="button"
               onPress={() => void logout()}
               style={({ pressed }) => [
                 styles.logoutButton,
                 { backgroundColor: theme.dangerSoft, opacity: pressed ? 0.76 : 1 },
               ]}>
               <EcoPestIcon color={theme.danger} name="logout" size={24} />
               <ThemedText type="smallBold" style={{ color: theme.danger }}>
                 {t.logoutCta}
               </ThemedText>
             </Pressable>
          </View>

          <View style={styles.legalRow}>
            <Pressable accessibilityRole="link" onPress={() => router.push('/legal/terms')}>
              <ThemedText type="linkPrimary">{legal.terms}</ThemedText>
            </Pressable>
            <Pressable accessibilityRole="link" onPress={() => router.push('/legal/privacy')}>
              <ThemedText type="linkPrimary">{legal.privacy}</ThemedText>
            </Pressable>
            <ThemedText type="small" themeColor="textSecondary">
              © {Brand.copyrightYear()} {Brand.companyName} · {legal.allRightsReserved}
            </ThemedText>
          </View>
        </ScrollView>
      </SafeAreaView>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    width: '100%',
  },
  scrollContent: {
    gap: Spacing.xl,
    paddingHorizontal: Spacing.lg,
    paddingBottom: BottomTabInset + Spacing.xl,
  },
  profileHeader: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
    gap: Spacing.md,
  },
  avatarWrapper: {
    position: 'relative',
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  editBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: Radius.full,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileCopy: {
    alignItems: 'center',
    gap: Spacing.xs,
  },
  editProfileBtn: {
    marginTop: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.full,
  },
  editForm: {
    width: '100%',
    gap: Spacing.md,
    marginTop: Spacing.md,
  },
  editActions: {
    justifyContent: 'center',
    gap: Spacing.md,
  },
  section: {
    gap: Spacing.sm,
  },
  sectionTitle: {
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: Spacing.sm,
  },
  settingsCard: {
    borderRadius: Radius.xl,
    borderWidth: 1,
    overflow: 'hidden',
  },
  settingsItem: {
    alignItems: 'center',
    padding: Spacing.md,
    gap: Spacing.md,
  },
  itemIcon: {
    width: 40,
    height: 40,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemCopy: {
    flex: 1,
    gap: 2,
  },
  itemTitle: {
    fontSize: Typography.fontSize.base,
  },
  divider: {
    height: 1,
    marginLeft: 70,
  },
  segmented: {
    backgroundColor: 'transparent',
    gap: Spacing.xs,
  },
  segmentBtn: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.md,
  },
  restartHint: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.md,
    textAlign: 'center',
  },
  footerActions: {
    paddingTop: Spacing.md,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.lg,
    borderRadius: Radius.xl,
    gap: Spacing.sm,
  },
  legalRow: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: Spacing.md,
    paddingTop: Spacing.lg,
  },
});
