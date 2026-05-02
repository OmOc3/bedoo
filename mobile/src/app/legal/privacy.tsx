import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BrandHeader, Card, ScreenShell, SecondaryButton } from '@/components/ecopest-ui';
import { ThemedText } from '@/components/themed-text';
import { BottomTabInset, Spacing } from '@/constants/theme';
import { useLanguage } from '@/contexts/language-context';
import { getLocaleStrings, getTextDirection, type Language } from '@/lib/i18n';

export default function PrivacyScreen() {
  const { language } = useLanguage();
  const [legalLanguage, setLegalLanguage] = useState<Language>(language);
  const legalStrings = getLocaleStrings(legalLanguage).i18n;
  const content = legalStrings.legal.privacyContent;
  const legalDirection = getTextDirection(legalLanguage);
  const legalTextStyle = {
    textAlign: legalDirection === 'rtl' ? 'right' : 'left',
    writingDirection: legalDirection,
  } as const;

  return (
    <ScreenShell>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <BrandHeader compact subtitle={content.subtitle} />

          <View style={[styles.languageRow]}>
            <SecondaryButton selected={legalLanguage === 'ar'} onPress={() => setLegalLanguage('ar')}>
              {legalStrings.settings.languageArabic}
            </SecondaryButton>
            <SecondaryButton selected={legalLanguage === 'en'} onPress={() => setLegalLanguage('en')}>
              {legalStrings.settings.languageEnglish}
            </SecondaryButton>
          </View>

          <Card>
            <ThemedText type="title" style={legalTextStyle}>{content.title}</ThemedText>
            <ThemedText themeColor="textSecondary" style={legalTextStyle}>{content.subtitle}</ThemedText>
          </Card>

          {content.sections.map((section) => (
            <Card key={section.title}>
              <ThemedText type="smallBold" style={legalTextStyle}>{section.title}</ThemedText>
              <ThemedText style={legalTextStyle}>{section.body}</ThemedText>
            </Card>
          ))}
        </ScrollView>
      </SafeAreaView>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  languageRow: {
    gap: Spacing.two,
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
