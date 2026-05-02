"use client";

export default function StationsMapError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="min-h-dvh bg-[var(--surface-subtle)] px-4 py-6 text-right sm:px-6 lg:px-8" dir="rtl">
      <section className="mx-auto max-w-3xl rounded-2xl border border-red-200 bg-[var(--surface)] p-6 shadow-control">
        <h1 className="text-xl font-bold text-[var(--foreground)]">تعذر تحميل خريطة المحطات</h1>
        <p className="mt-2 text-sm leading-6 text-[var(--muted)]">أعد المحاولة أو ارجع لقائمة المحطات.</p>
        <button
          className="mt-5 inline-flex min-h-11 items-center justify-center rounded-lg bg-[var(--primary)] px-5 py-2.5 text-sm font-semibold text-[var(--primary-foreground)] transition-colors hover:bg-[var(--primary-hover)]"
          onClick={reset}
          type="button"
        >
          إعادة المحاولة
        </button>
      </section>
    </main>
  );
}
