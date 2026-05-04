"use client";

import { useLanguage } from "@/components/i18n/language-provider";
import type { I18nMessages } from "@/lib/i18n";

type PageErrorKey = keyof I18nMessages["pageErrors"];

interface LocalizedInlineErrorProps {
  messageKey: PageErrorKey;
}

export function LocalizedInlineError({ messageKey }: LocalizedInlineErrorProps) {
  const { direction, messages } = useLanguage();

  return (
    <main className="min-h-dvh bg-[var(--background)] px-4 py-6 text-start sm:px-6 lg:px-8" dir={direction}>
      <section className="mx-auto max-w-7xl rounded-2xl border border-[var(--danger-muted)] bg-[var(--danger-soft)] p-6 text-sm text-[var(--danger)] shadow-card">
        {messages.pageErrors[messageKey]}
      </section>
    </main>
  );
}
