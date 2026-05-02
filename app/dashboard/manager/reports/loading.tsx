export default function ManagerReportsLoading() {
  return (
    <main className="min-h-dvh bg-[var(--surface-subtle)] px-4 py-6 sm:px-6 lg:px-8" dir="rtl">
      <section className="mx-auto max-w-7xl animate-pulse space-y-6">
        <div className="h-8 w-56 rounded bg-[var(--border-subtle)]" />
        <div className="h-32 rounded-xl border border-[var(--border)] bg-[var(--surface)]" />
        <div className="h-64 rounded-xl border border-[var(--border)] bg-[var(--surface)]" />
      </section>
    </main>
  );
}
