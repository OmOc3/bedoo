import Link from "next/link";
import { getRequestLocale, getRequestLocaleDirection } from "@/lib/i18n/server";

export default async function OfflinePage() {
  const locale = await getRequestLocale();
  const direction = await getRequestLocaleDirection();
  const copy =
    locale === "en"
      ? {
          back: "Back to scan",
          body: "This page cannot load right now. Try again when the network is available.",
          title: "No connection",
        }
      : {
          back: "العودة لصفحة المسح",
          body: "لا يمكن تحميل الصفحة الآن. أعد المحاولة عند توفر الاتصال بالشبكة.",
          title: "لا يوجد اتصال",
        };

  return (
    <main className="flex min-h-dvh items-center bg-[var(--background)] px-4 py-6 text-start" dir={direction}>
      <section className="mx-auto w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 text-center shadow-card">
        <h1 className="text-2xl font-bold text-[var(--foreground)]">{copy.title}</h1>
        <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{copy.body}</p>
        <Link
          className="mt-5 inline-flex min-h-11 items-center justify-center rounded-lg bg-[var(--primary)] px-4 py-2.5 text-sm font-semibold text-[var(--primary-foreground)] shadow-sm transition-all duration-150 hover:bg-[var(--primary-hover)] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2"
          href="/scan"
        >
          {copy.back}
        </Link>
      </section>
    </main>
  );
}
