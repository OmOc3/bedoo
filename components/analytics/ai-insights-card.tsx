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
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-control">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full bg-teal-50 px-3 py-1 text-xs font-bold text-teal-700 dark:bg-slate-800 dark:text-teal-300">
            <span className="h-2 w-2 rounded-full bg-teal-500" />
            {insights?.source === "gemini" ? i18n.insights.sourceGemini : i18n.insights.sourceFallback}
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-900">{i18n.insights.title}</h2>
            <p className="mt-1 text-sm leading-6 text-slate-500">{i18n.insights.subtitle}</p>
          </div>
        </div>
        <button
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-teal-700 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-teal-600 disabled:cursor-not-allowed disabled:opacity-50"
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
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {error}
        </div>
      ) : null}

      {insights ? (
        <div className="mt-5 space-y-5">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm leading-7 text-slate-700">{insights.summary}</p>
            <p className="mt-3 text-xs font-medium text-slate-500">
              {i18n.insights.generatedAt}: {insights.generatedAt}
            </p>
            {insights.note ? <p className="mt-2 text-xs font-medium text-amber-700">{insights.note}</p> : null}
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <h3 className="text-sm font-bold text-slate-900">{i18n.insights.alerts}</h3>
              <ul className="mt-3 space-y-3 text-sm leading-6 text-slate-700">
                {insights.alerts.map((item) => (
                  <li className="flex gap-3" key={item}>
                    <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-amber-500" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <h3 className="text-sm font-bold text-slate-900">{i18n.insights.recommendations}</h3>
              <ul className="mt-3 space-y-3 text-sm leading-6 text-slate-700">
                {insights.recommendations.map((item) => (
                  <li className="flex gap-3" key={item}>
                    <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-teal-500" />
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
