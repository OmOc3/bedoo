"use client";

import { useState, useTransition } from "react";
import { generateManagerInsightsAction } from "@/app/actions/insights";
import { i18n } from "@/lib/i18n";
import type { AiInsightsResult } from "@/types";

export function AIInsightsCard() {
  const [insights, setInsights] = useState<AiInsightsResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-card sm:p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full bg-[var(--primary-soft)] px-3 py-1 text-xs font-bold text-[var(--primary)]">
            <span aria-hidden="true" className="h-2 w-2 rounded-full bg-[var(--primary)]" />
            {insights?.source === "gemini" ? i18n.insights.sourceGemini : i18n.insights.sourceFallback}
          </div>
          <div>
            <h2 className="border-r-2 border-[var(--primary)] pr-3 text-base font-semibold text-[var(--foreground)]">{i18n.insights.title}</h2>
            <p className="mt-1 text-sm leading-6 text-[var(--muted)]">{i18n.insights.subtitle}</p>
          </div>
        </div>
        <button
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[var(--primary)] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all duration-150 hover:bg-[var(--primary-hover)] hover:shadow active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2"
          disabled={isPending}
          onClick={() => {
            startTransition(async () => {
              setError(null);
              const result = await generateManagerInsightsAction();

              if (result.error && !result.insights) {
                setError(result.error);
                setInsights(null);
                return;
              }

              setError(result.error ?? null);
              setInsights(result.insights ?? null);
            });
          }}
          type="button"
        >
          {isPending ? (
            <span aria-hidden="true" className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
          ) : null}
          {isPending ? i18n.insights.generating : i18n.insights.generate}
        </button>
      </div>

      {error ? (
        <div
          className="mt-4 rounded-lg border border-[var(--danger)] bg-[var(--danger-soft)] px-4 py-3 text-sm font-medium text-[var(--danger)]"
          role="alert"
        >
          {error}
        </div>
      ) : null}

      {insights ? (
        <div className="mt-5 space-y-5 border-t border-[var(--border)] pt-5" aria-live="polite" role="status">
          <div className="space-y-2">
            <p className="text-sm leading-7 text-[var(--foreground)]">{insights.summary}</p>
            <p className="text-xs font-medium text-[var(--muted)]">
              {i18n.insights.generatedAt}: {insights.generatedAt}
            </p>
            {insights.note ? <p className="text-xs font-medium text-[var(--warning)]">{insights.note}</p> : null}
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-[var(--foreground)]">{i18n.insights.alerts}</h3>
              <ul className="space-y-3 text-sm leading-6 text-[var(--foreground)]">
                {insights.alerts.map((item) => (
                  <li className="flex gap-3" key={item}>
                    <span aria-hidden="true" className="mt-2 h-2 w-2 shrink-0 rounded-full bg-[var(--warning)]" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-bold text-[var(--foreground)]">{i18n.insights.recommendations}</h3>
              <ul className="space-y-3 text-sm leading-6 text-[var(--foreground)]">
                {insights.recommendations.map((item) => (
                  <li className="flex gap-3" key={item}>
                    <span aria-hidden="true" className="mt-2 h-2 w-2 shrink-0 rounded-full bg-[var(--primary)]" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
