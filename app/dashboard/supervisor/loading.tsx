export default function SupervisorDashboardLoading() {
  return (
    <main className="min-h-dvh bg-slate-50 px-4 py-6 sm:px-6 lg:px-8" dir="rtl">
      <section className="mx-auto max-w-7xl animate-pulse space-y-6">
        <div className="h-8 w-48 rounded bg-slate-200" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="h-32 rounded-xl border border-slate-200 bg-white" />
          <div className="h-32 rounded-xl border border-slate-200 bg-white" />
          <div className="h-32 rounded-xl border border-slate-200 bg-white" />
          <div className="h-32 rounded-xl border border-slate-200 bg-white" />
        </div>
      </section>
    </main>
  );
}
