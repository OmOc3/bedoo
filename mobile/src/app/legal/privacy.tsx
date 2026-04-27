// Mobile Privacy Policy screen for EcoPest field data and technician account transparency.
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BrandHeader, Card, ScreenShell, SecondaryButton } from '@/components/ecopest-ui';
import { ThemedText } from '@/components/themed-text';
import { BottomTabInset, Spacing } from '@/constants/theme';
import { useLanguage } from '@/contexts/language-context';

type LegalLanguage = 'ar' | 'en';

interface LegalSection {
  body: string;
  title: string;
}

const privacyContent: Record<LegalLanguage, { subtitle: string; title: string; sections: LegalSection[] }> = {
  ar: {
    title: 'سياسة الخصوصية',
    subtitle: 'ما الذي يحفظه التطبيق، وما الذي لا يجمعه.',
    sections: [
      {
        title: 'البيانات التي نجمعها',
        body: 'نحفظ بيانات التقرير مثل رقم المحطة، حالة الفحص، الملاحظات، وقت الإرسال، وحساب الفني الذي أرسل التقرير. لا نجمع موقع الجهاز الجغرافي في هذا الإصدار.',
      },
      {
        title: 'كيف نستخدم البيانات',
        body: 'تُستخدم البيانات لمتابعة الزيارات، مراجعة التقارير، معرفة المحطات التي تحتاج إجراء، وحفظ سجل تشغيلي يمكن الرجوع إليه.',
      },
      {
        title: 'تخزين البيانات',
        body: 'تُحفظ بيانات التطبيق في قاعدة بيانات SQL آمنة. الصور خارج هذا الإصدار، وبيانات التقارير تُربط بحساب الفني داخل Better Auth.',
      },
      {
        title: 'حقوق المستخدم',
        body: 'يمكنك طلب تصحيح بيانات حسابك أو مراجعة التقارير المرتبطة بك عبر مسؤول النظام في شركتك.',
      },
      {
        title: 'الاحتفاظ بالبيانات',
        body: 'تُحفظ التقارير وسجلات المراجعة حسب سياسة شركتك التشغيلية. المسودات المحلية تبقى على جهازك حتى تُرسل أو تُحذف.',
      },
      {
        title: 'التواصل',
        body: 'لأي سؤال حول الخصوصية، استخدم قناة الدعم المعتمدة داخل شركتك.',
      },
    ],
  },
  en: {
    title: 'Privacy Policy',
    subtitle: 'What the app stores, and what it does not collect.',
    sections: [
      {
        title: 'Data Collected',
        body: 'We store report data such as station ID, inspection status, notes, submission time, and the technician account that submitted the report. Device location is not collected in this version.',
      },
      {
        title: 'How We Use Data',
        body: 'Data is used to track visits, review reports, identify stations that need action, and keep an operational record for follow-up.',
      },
      {
        title: 'Data Storage',
        body: 'App data is stored in a secure SQL database. Photos are outside this version, and report data is tied to the technician account in Better Auth.',
      },
      {
        title: 'User Rights',
        body: 'You can request account corrections or review reports tied to your account through your company system administrator.',
      },
      {
        title: 'Data Retention',
        body: 'Reports and review logs are retained according to your company operations policy. Local drafts stay on your device until submitted or deleted.',
      },
      {
        title: 'Contact',
        body: 'For privacy questions, use the approved support channel inside your organization.',
      },
    ],
  },
};

export default function PrivacyScreen() {
  const { direction, isRtl } = useLanguage();
  const [legalLanguage, setLegalLanguage] = useState<LegalLanguage>('ar');
  const content = privacyContent[legalLanguage];

  return (
    <ScreenShell>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <BrandHeader compact subtitle={content.subtitle} />

          <View style={[styles.languageRow, { flexDirection: isRtl ? 'row-reverse' : 'row' }]}>
            <SecondaryButton selected={legalLanguage === 'ar'} onPress={() => setLegalLanguage('ar')}>
              العربية
            </SecondaryButton>
            <SecondaryButton selected={legalLanguage === 'en'} onPress={() => setLegalLanguage('en')}>
              English
            </SecondaryButton>
          </View>

          <Card>
            <ThemedText type="title">{content.title}</ThemedText>
            <ThemedText themeColor="textSecondary">{content.subtitle}</ThemedText>
          </Card>

          {content.sections.map((section) => (
            <Card key={section.title}>
              <ThemedText type="smallBold">{section.title}</ThemedText>
              <ThemedText style={{ writingDirection: direction }}>{section.body}</ThemedText>
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
