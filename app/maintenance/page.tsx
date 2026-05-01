import type { Metadata } from "next";
import Link from "next/link";
import { BrandLockup } from "@/components/layout/brand";

export const metadata: Metadata = {
  title: "وضع الصيانة",
};

export default function MaintenancePage() {
  return (
    <main className="min-h-dvh bg-[var(--background)] px-4 py-8 text-right sm:px-6 lg:px-8" dir="rtl">
      <section className="mx-auto max-w-2xl">
        <header className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-card">
          <div className="flex items-start justify-between gap-4">
            <BrandLockup compact />
            <span className="inline-flex items-center rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-800 ring-1 ring-inset ring-amber-100">
              صيانة
            </span>
          </div>
          <h1 className="mt-6 text-2xl font-extrabold text-[var(--foreground)]">الموقع تحت الصيانة</h1>
          <p className="mt-3 text-sm leading-7 text-[var(--muted)]">
            تم تفعيل وضع الصيانة مؤقتًا بواسطة الإدارة. سيتم إعادة فتح النظام تلقائيًا عند انتهاء الصيانة.
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-2">
            <Link
              className="inline-flex min-h-11 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--surface)] px-5 py-2.5 text-sm font-semibold text-[var(--foreground)] transition-colors hover:bg-[var(--surface-subtle)]"
              href="/login"
            >
              الذهاب لتسجيل الدخول
            </Link>
            <Link
              className="inline-flex min-h-11 items-center justify-center rounded-lg bg-[var(--primary)] px-5 py-2.5 text-sm font-semibold text-[var(--primary-foreground)] transition-colors hover:bg-[var(--primary-hover)]"
              href="/"
            >
              تحديث الصفحة
            </Link>
          </div>
        </header>
      </section>
    </main>
  );
}

