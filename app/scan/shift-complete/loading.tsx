export default function ShiftCompleteLoading() {
  return (
    <main className="min-h-dvh bg-[var(--surface-subtle)] px-4 py-6 text-right" dir="rtl">
      <section className="mx-auto w-full max-w-lg rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 w-24 rounded bg-[var(--border)]" />
          <div className="h-7 w-40 rounded bg-[var(--border)]" />
          <div className="h-20 rounded-lg bg-[var(--surface-subtle)]" />
          <div className="h-20 rounded-lg bg-[var(--surface-subtle)]" />
          <div className="h-12 rounded-lg bg-[var(--border)]" />
        </div>
      </section>
    </main>
  );
}
