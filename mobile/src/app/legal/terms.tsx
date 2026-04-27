// Mobile Terms of Use screen for EcoPest field technicians and operations teams.
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

const termsContent: Record<LegalLanguage, { subtitle: string; title: string; sections: LegalSection[] }> = {
  ar: {
    title: 'شروط الاستخدام',
    subtitle: 'اقرأها مرة واحدة قبل استخدام التطبيق في الزيارات الميدانية.',
    sections: [
      {
        title: 'وصف الخدمة',
        body: 'إيكوبست يساعد فرق مكافحة الآفات على إدارة محطات الطعوم، مسح رموز QR، حفظ تقارير الزيارة، ومتابعة المراجعات التشغيلية.',
      },
      {
        title: 'الاستخدام المقبول',
        body: 'استخدم التطبيق فقط للزيارات الفعلية ومحطات شركتك. لا تدخل بيانات محطة لا تعمل عليها، ولا تشارك الوصول مع شخص آخر.',
      },
      {
        title: 'مسؤوليات الحساب',
        body: 'حسابك مرتبط بالتقارير التي ترسلها. حافظ على كلمة المرور، وأبلغ المشرف إذا فقدت الجهاز أو لاحظت نشاطًا غير معتاد.',
      },
      {
        title: 'حدود المسؤولية',
        body: 'التطبيق يدعم التسجيل والمتابعة، لكنه لا يستبدل إجراءات السلامة أو تعليمات الشركة أو الحكم المهني أثناء الفحص.',
      },
      {
        title: 'التواصل',
        body: 'لأي سؤال قانوني أو تشغيلي، استخدم قناة الدعم المعتمدة داخل شركتك.',
      },
    ],
  },
  en: {
    title: 'Terms of Use',
    subtitle: 'Read this once before using the app during field visits.',
    sections: [
      {
        title: 'Service Description',
        body: 'EcoPest helps pest control teams manage bait stations, scan QR codes, save visit reports, and follow operational reviews.',
      },
      {
        title: 'Acceptable Use',
        body: 'Use the app only for real visits and stations assigned to your company. Do not enter station data you did not inspect or share access with anyone else.',
      },
      {
        title: 'Account Responsibilities',
        body: 'Your account is tied to the reports you submit. Protect your password and tell your supervisor if your device is lost or activity looks unusual.',
      },
      {
        title: 'Limitation of Liability',
        body: 'The app supports recording and follow-up. It does not replace safety procedures, company instructions, or professional judgment during inspection.',
      },
      {
        title: 'Contact',
        body: 'For legal or operational questions, use the approved support channel inside your organization.',
      },
    ],
  },
};

export default function TermsScreen() {
  const { direction, isRtl } = useLanguage();
  const [legalLanguage, setLegalLanguage] = useState<LegalLanguage>('ar');
  const content = termsContent[legalLanguage];

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
