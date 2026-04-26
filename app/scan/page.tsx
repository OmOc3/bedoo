import type { Metadata } from "next";
import Link from "next/link";
import { CopyrightFooter } from "@/components/legal/copyright-footer";
import { BrandLockup } from "@/components/layout/brand";
import { ManualStationEntry } from "@/components/station/manual-station-entry";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { getCurrentSession } from "@/lib/auth/server-session";
import { i18n } from "@/lib/i18n";

export const metadata: Metadata = {
  title: i18n.scan.title,
};

export default async function ScanInstructionsPage() {
  const session = await getCurrentSession();

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-slate-50 px-4 py-8 text-right sm:px-6" dir="rtl">
      <section className="mx-auto w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-control sm:p-6">
        <div className="mb-6 flex items-start justify-between gap-3">
          <BrandLockup />
          <ThemeToggle />
        </div>
        <div className="mb-5 grid h-14 w-14 grid-cols-2 gap-1 rounded-xl border border-teal-100 bg-teal-50 p-3 dark:border-slate-700 dark:bg-slate-900">
          <span className="rounded-sm bg-teal-700 dark:bg-teal-400" />
          <span className="rounded-sm bg-teal-700 opacity-70 dark:bg-teal-400" />
          <span className="rounded-sm bg-teal-700 opacity-70 dark:bg-teal-400" />
          <span className="rounded-sm border-2 border-teal-700 dark:border-teal-400" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900">{i18n.scan.title}</h1>
        <p className="mt-3 text-base leading-7 text-slate-600">
          وجّه كاميرا الهاتف إلى رمز QR المثبت على محطة الطعوم. سيفتح الرابط نموذج الفحص الخاص بالمحطة لتسجيل الحالة
          والملاحظات.
        </p>
        <p className="mt-3 rounded-lg bg-slate-50 px-4 py-3 text-sm font-medium leading-6 text-slate-700">
          إذا لم يعمل المسح، أدخل رقم المحطة يدويًا في الحقل التالي.
        </p>

        <div className="mt-6">
          <ManualStationEntry />
        </div>

        {!session ? (
          <Link
            className="mt-4 inline-flex min-h-[44px] w-full items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-3 text-base font-medium text-slate-700 transition-colors hover:bg-slate-50"
            href="/login"
          >
            {i18n.scan.loginCta}
          </Link>
        ) : null}
      </section>
      <CopyrightFooter className="max-w-md px-0" />
    </main>
  );
}
