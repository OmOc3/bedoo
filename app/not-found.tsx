import Link from "next/link";

export const dynamic = "force-dynamic";

export default function NotFoundPage() {
  return (
    <main className="flex min-h-dvh items-center bg-[var(--background)] px-4 py-6 text-right" dir="rtl">
      <section className="mx-auto w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 text-center shadow-card">
        <h1 className="text-2xl font-bold text-[var(--foreground)]">الصفحة غير موجودة</h1>
        <p className="mt-2 text-sm leading-6 text-[var(--muted)]">الرابط الذي تحاول فتحه غير متاح أو تم تغييره.</p>
        <Link
          className="mt-5 inline-flex min-h-11 items-center justify-center rounded-lg bg-[var(--primary)] px-4 py-2.5 text-sm font-semibold text-[var(--primary-foreground)] shadow-sm transition-all duration-150 hover:bg-[var(--primary-hover)] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2"
          href="/login"
        >
          العودة لتسجيل الدخول
        </Link>
      </section>
    </main>
  );
}
