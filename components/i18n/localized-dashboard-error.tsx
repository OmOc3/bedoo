"use client";

import type { ReactNode } from "react";
import { useLanguage } from "@/components/i18n/language-provider";
import { Button } from "@/components/ui/button";
import type { I18nMessages } from "@/lib/i18n";

type PageErrorKey = keyof I18nMessages["pageErrors"];

interface LocalizedDashboardErrorProps {
  description?: ReactNode;
  descriptionKey?: PageErrorKey;
  reset?: () => void;
  titleKey: PageErrorKey;
  titleLevel?: "h1" | "h2";
}

export function LocalizedDashboardError({
  description,
  descriptionKey,
  reset,
  titleKey,
  titleLevel = "h2",
}: LocalizedDashboardErrorProps) {
  const { direction, messages } = useLanguage();
  const body =
    description ??
    (descriptionKey ? messages.pageErrors[descriptionKey] : messages.pageErrors.tryAgainShort);
  const TitleTag = titleLevel;

  return (
    <main className="flex min-h-dvh items-center bg-[var(--surface-subtle)] px-4 py-6 text-start" dir={direction}>
      <section className="mx-auto w-full max-w-md rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5">
        <TitleTag className="text-lg font-semibold text-[var(--foreground)]">{messages.pageErrors[titleKey]}</TitleTag>
        <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{body}</p>
        {reset ? (
          <Button className="mt-5" onClick={reset} type="button">
            {messages.actions.retry}
          </Button>
        ) : null}
      </section>
    </main>
  );
}
