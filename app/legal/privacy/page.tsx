import type { Metadata } from "next";
import { CopyrightFooter } from "@/components/legal/copyright-footer";
import { BrandLockup } from "@/components/layout/brand";
import { BRAND } from "@/lib/brand";
import { getI18nMessages, getRequestLocale, getRequestLocaleDirection } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getRequestLocale();
  const t = getI18nMessages(locale);

  return {
    title: t.legal.privacy,
  };
}

const sections = [
  {
    titleAr: "البيانات التي نجمعها",
    titleEn: "Data Collected",
    bodyAr:
      "قد تعالج المنصة بيانات الحساب، الأدوار، محطات الطعوم، تقارير الفحص، الملاحظات، التوقيتات، وسجلات النشاط اللازمة لتشغيل الخدمة.",
    bodyEn:
      "The platform may process account data, roles, bait stations, inspection reports, notes, timestamps, and activity logs needed to operate the service.",
  },
  {
    titleAr: "كيف نستخدم البيانات",
    titleEn: "How We Use Data",
    bodyAr:
      "تستخدم البيانات لتقديم الخدمة، حماية الحسابات، عرض التقارير، مراجعة العمليات، إنشاء الصادرات، وتحسين موثوقية سير العمل الميداني.",
    bodyEn:
      "Data is used to provide the service, protect accounts, show reports, review operations, generate exports, and improve field workflow reliability.",
  },
  {
    titleAr: "تخزين البيانات",
    titleEn: "Data Storage",
    bodyAr:
      "تستخدم المنصة قاعدة بيانات SQL ونظام جلسات آمن لتخزين المصادقة والبيانات التشغيلية وفق إعدادات المشروع وسياسات الأمان المفعلة.",
    bodyEn:
      "The platform uses a SQL database and secure session system for authentication and operational data according to the project's configuration and active security policies.",
  },
  {
    titleAr: "حقوق المستخدم",
    titleEn: "User Rights",
    bodyAr:
      "يمكن للمستخدمين طلب الوصول إلى بياناتهم أو تصحيحها أو تعطيل حساباتهم من خلال مسؤول النظام داخل المؤسسة، بحسب السياسات المعمول بها.",
    bodyEn:
      "Users may request access, correction, or account deactivation through their organization's system administrator, subject to applicable policies.",
  },
  {
    titleAr: "التواصل",
    titleEn: "Contact",
    bodyAr: `لأي استفسار حول الخصوصية، تواصل مع ${BRAND.companyNameArabic} عبر قناة الدعم المعتمدة لدى مؤسستك.`,
    bodyEn: `For privacy questions, contact ${BRAND.companyName} through your organization's approved support channel.`,
  },
] as const;

export default async function PrivacyPage() {
  const locale = await getRequestLocale();
  const direction = await getRequestLocaleDirection();
  const t = getI18nMessages(locale);
  const isEnglish = locale === "en";
  const pageTitle = isEnglish ? `${t.legal.privacy} ${BRAND.name}` : `${t.legal.privacy} ${BRAND.nameArabic}`;
  const intro = isEnglish
    ? "Generic privacy policy for review and customization."
    : "نص عام لسياسة الخصوصية للمراجعة والتخصيص.";

  return (
    <main className="min-h-dvh bg-[var(--surface-subtle)] px-4 py-8 text-start sm:px-6 lg:px-8" dir={direction}>
      <article className="mx-auto max-w-4xl rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-control sm:p-8">
        <BrandLockup className="mb-8" />
        <div className="border-b border-[var(--border)] pb-6">
          <p className="text-sm font-medium text-teal-700">{t.legal.privacy}</p>
          <h1 className="mt-2 text-2xl font-bold text-[var(--foreground)]">{pageTitle}</h1>
          <p className="mt-2 text-base leading-7 text-[var(--muted)]">{intro}</p>
        </div>

        <div className="mt-8 space-y-7">
          {sections.map((section) => (
            <section
              className="grid gap-3 border-b border-[var(--border-subtle)] pb-6 last:border-b-0 last:pb-0"
              key={section.titleEn}
            >
              <div>
                <h2 className="text-lg font-semibold text-[var(--foreground)]">{isEnglish ? section.titleEn : section.titleAr}</h2>
              </div>
              <p className="text-sm leading-7 text-[var(--foreground)]">{isEnglish ? section.bodyEn : section.bodyAr}</p>
            </section>
          ))}
        </div>
      </article>
      <CopyrightFooter />
    </main>
  );
}
