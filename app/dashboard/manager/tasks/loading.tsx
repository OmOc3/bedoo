export default function ManagerTasksLoading() {
  return (
    <main className="min-h-dvh bg-slate-50 px-4 py-6" dir="rtl">
      <section className="mx-auto max-w-7xl space-y-6">
        <div className="h-32 animate-pulse rounded-2xl border border-slate-200 bg-white" />
        <div className="grid gap-4 md:grid-cols-3">
          <div className="h-28 animate-pulse rounded-2xl border border-slate-200 bg-white" />
          <div className="h-28 animate-pulse rounded-2xl border border-slate-200 bg-white" />
          <div className="h-28 animate-pulse rounded-2xl border border-slate-200 bg-white" />
        </div>
        <div className="h-72 animate-pulse rounded-2xl border border-slate-200 bg-white" />
      </section>
    </main>
  );
}
