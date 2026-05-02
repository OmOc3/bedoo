export default function StationsMapLoading() {
  return (
    <main className="min-h-dvh bg-[var(--surface-subtle)] px-4 py-6 text-right sm:px-6 lg:px-8" dir="rtl">
      <section className="mx-auto max-w-7xl space-y-6">
        <div className="h-24 rounded-2xl bg-[var(--border-subtle)]" />
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="h-28 rounded-xl bg-[var(--border-subtle)]" />
          <div className="h-28 rounded-xl bg-[var(--border-subtle)]" />
          <div className="h-28 rounded-xl bg-[var(--border-subtle)]" />
        </div>
        <div className="h-[520px] rounded-2xl bg-[var(--border-subtle)]" />
      </section>
    </main>
  );
}
