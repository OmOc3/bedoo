import type { Metadata } from "next";
import { CopyrightFooter } from "@/components/legal/copyright-footer";
import { BrandLockup } from "@/components/layout/brand";
import { BRAND } from "@/lib/brand";
import { i18n } from "@/lib/i18n";

export const metadata: Metadata = {
  title: i18n.legal.terms,
};

const sections = [
  {
    titleAr: "وصف الخدمة",
    titleEn: "Service Description",
    bodyAr:
      "توفر إيكوبست منصة ويب لإدارة محطات الطعوم، الزيارات الميدانية، تقارير الفنيين، مراجعات المشرفين، وسجلات التدقيق التشغيلية.",
    bodyEn:
      "EcoPest provides a web platform for managing bait stations, field visits, technician reports, supervisor reviews, and operational audit records.",
  },
  {
    titleAr: "الاستخدام المقبول",
    titleEn: "Acceptable Use",
    bodyAr:
      "يلتزم المستخدمون باستخدام الخدمة لأغراض تشغيلية قانونية فقط، وعدم محاولة تعطيل النظام أو الوصول إلى بيانات أو حسابات غير مصرح بها.",
    bodyEn:
      "Users must use the service only for lawful operational purposes and must not attempt to disrupt the system or access unauthorized data or accounts.",
  },
  {
    titleAr: "مسؤوليات الحساب",
    titleEn: "Account Responsibilities",
    bodyAr:
      "يتحمل المستخدم مسؤولية الحفاظ على سرية بيانات الدخول وإبلاغ الإدارة فورًا عند الاشتباه في استخدام غير مصرح للحساب.",
    bodyEn:
      "Users are responsible for keeping sign-in credentials confidential and notifying administration promptly if unauthorized account use is suspected.",
  },
  {
    titleAr: "حدود المسؤولية",
    titleEn: "Limitation of Liability",
    bodyAr:
      "تقدم الخدمة لدعم العمليات واتخاذ القرار، ولا تستبدل إجراءات السلامة المهنية أو المتطلبات النظامية أو مراجعة المختصين.",
    bodyEn:
      "The service supports operations and decision-making, but it does not replace professional safety procedures, regulatory requirements, or expert review.",
  },
  {
    titleAr: "التواصل",
    titleEn: "Contact",
    bodyAr: `للاستفسارات القانونية أو التشغيلية، تواصل مع ${BRAND.companyNameArabic} عبر قناة الدعم المعتمدة لدى مؤسستك.`,
    bodyEn: `For legal or operational questions, contact ${BRAND.companyName} through your organization's approved support channel.`,
  },
] as const;

export default function TermsPage() {
  return (
    <main className="min-h-dvh bg-[var(--surface-subtle)] px-4 py-8 text-right sm:px-6 lg:px-8" dir="rtl">
      <article className="mx-auto max-w-4xl rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-control sm:p-8">
        <BrandLockup className="mb-8" />
        <div className="border-b border-[var(--border)] pb-6">
          <p className="text-sm font-medium text-teal-700">
            {i18n.legal.terms} / {i18n.en.legal.terms}
          </p>
          <h1 className="mt-2 text-2xl font-bold text-[var(--foreground)]">شروط استخدام {BRAND.nameArabic}</h1>
          <p className="mt-2 text-base leading-7 text-[var(--muted)]">
            Generic bilingual terms for review and customization. نص عام ثنائي اللغة للمراجعة والتخصيص.
          </p>
        </div>

        <div className="mt-8 space-y-7">
          {sections.map((section) => (
            <section
              className="grid gap-3 border-b border-[var(--border-subtle)] pb-6 last:border-b-0 last:pb-0"
              key={section.titleEn}
            >
              <div>
                <h2 className="text-lg font-semibold text-[var(--foreground)]">{section.titleAr}</h2>
                <p className="text-sm font-medium text-[var(--muted)]" dir="ltr">
                  {section.titleEn}
                </p>
              </div>
              <p className="text-sm leading-7 text-[var(--foreground)]">{section.bodyAr}</p>
              <p className="text-sm leading-7 text-[var(--muted)]" dir="ltr">
                {section.bodyEn}
              </p>
            </section>
          ))}
        </div>
      </article>
      <CopyrightFooter />
    </main>
  );
}
