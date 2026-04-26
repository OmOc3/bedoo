import Link from "next/link";

export default function NotFoundPage() {
  return (
    <main className="flex min-h-dvh items-center bg-slate-50 px-4 py-6 text-right" dir="rtl">
      <section className="mx-auto w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 text-center">
        <h1 className="text-2xl font-bold text-slate-900">الصفحة غير موجودة</h1>
        <p className="mt-2 text-sm leading-6 text-slate-500">الرابط الذي تحاول فتحه غير متاح أو تم تغييره.</p>
        <Link
          className="mt-5 inline-flex min-h-11 items-center justify-center rounded-lg bg-teal-700 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-teal-600"
          href="/login"
        >
          العودة لتسجيل الدخول
        </Link>
      </section>
    </main>
  );
}
