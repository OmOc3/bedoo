import { getI18nMessages, getLocaleDirection, type I18nMessages } from "@/lib/i18n";
import { getRequestLocale } from "@/lib/i18n/server";

type PageLoadingKey = keyof I18nMessages["pageLoading"];

export async function AsyncRouteLoading({ messageKey }: { messageKey: PageLoadingKey }) {
  const locale = await getRequestLocale();
  const t = getI18nMessages(locale);
  const direction = getLocaleDirection(locale);

  return (
    <main className="min-h-dvh bg-[var(--background)] px-4 py-6 text-start sm:px-6 lg:px-8" dir={direction}>
      <section className="mx-auto max-w-7xl rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 text-sm text-[var(--muted)] shadow-card">
        {t.pageLoading[messageKey]}
      </section>
    </main>
  );
}
