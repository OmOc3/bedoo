export default function ScanLoading() {
  return (
    <main className="flex min-h-dvh items-center bg-[var(--surface-subtle)] px-4 py-12 sm:px-6" dir="rtl">
      <section className="mx-auto w-full max-w-md animate-pulse rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-6">
        <div className="mb-5 h-14 w-14 rounded-xl bg-[var(--border-subtle)]" />
        <div className="h-8 w-40 rounded bg-[var(--border-subtle)]" />
        <div className="mt-4 space-y-3">
          <div className="h-4 w-full rounded bg-[var(--border-subtle)]" />
          <div className="h-4 w-2/3 rounded bg-[var(--border-subtle)]" />
          <div className="h-12 rounded bg-[var(--border-subtle)]" />
        </div>
      </section>
    </main>
  );
}
