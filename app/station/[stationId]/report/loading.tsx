export default function StationReportLoading() {
  return (
    <main className="min-h-dvh bg-slate-50 px-4 py-6" dir="rtl">
      <section className="mx-auto w-full max-w-lg animate-pulse space-y-4">
        <div className="h-8 w-48 rounded bg-slate-200" />
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="space-y-3">
            <div className="h-4 w-1/3 rounded bg-slate-200" />
            <div className="h-4 w-2/3 rounded bg-slate-200" />
            <div className="h-24 rounded bg-slate-200" />
          </div>
        </div>
      </section>
    </main>
  );
}
