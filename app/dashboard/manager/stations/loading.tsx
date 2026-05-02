export default function ManagerStationsLoading() {
  return (
    <main className="min-h-dvh bg-[var(--surface-subtle)] px-4 py-6 sm:px-6 lg:px-8" dir="rtl">
      <section className="mx-auto max-w-7xl animate-pulse space-y-6">
        <div className="h-8 w-48 rounded bg-[var(--border-subtle)]" />
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5">
          <div className="space-y-3">
            <div className="h-4 w-1/3 rounded bg-[var(--border-subtle)]" />
            <div className="h-4 w-2/3 rounded bg-[var(--border-subtle)]" />
            <div className="h-4 w-1/2 rounded bg-[var(--border-subtle)]" />
          </div>
        </div>
      </section>
    </main>
  );
}
