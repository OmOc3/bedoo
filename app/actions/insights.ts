"use server";

import { buildFallbackManagerReport, buildManagerAiReportData } from "@/lib/ai/manager-report";
import { requireRole } from "@/lib/auth/server-session";
import { writeAuditLogRecord } from "@/lib/db/repositories";
import { formatDateTimeRome } from "@/lib/datetime";
import { generateGeminiInsights, hasGeminiConfigured } from "@/lib/gemini";
import type { I18nMessages } from "@/lib/i18n";
import { getIntlLocaleForApp } from "@/lib/i18n";
import { getI18nMessages, getRequestLocale } from "@/lib/i18n/server";
import { getErrorMessage } from "@/lib/utils";
import type { AiDataCoverageItem, AiInsightsResult } from "@/types";

export interface GenerateManagerInsightsActionResult {
  error?: string;
  insights?: AiInsightsResult;
}

function generatedAtLabel(t: I18nMessages, intlLocale: string): string {
  return formatDateTimeRome(new Date(), {
    locale: intlLocale,
    unavailableLabel: t.common.unavailable,
  });
}

function buildUnavailableFallback(note: string, t: I18nMessages, intlLocale: string): AiInsightsResult {
  return {
    summary: t.insights.fallbackSummary,
    fullReport: t.insights.fallbackFullReport,
    alerts: [note],
    recommendations: [t.insights.fallbackRecommendation],
    sections: [
      {
        title: t.insights.fallbackSectionTitle,
        body: t.insights.fallbackSectionBody,
        items: [note],
      },
    ],
    dataQualityNotes: [note],
    dataCoverage: [],
    generatedAt: generatedAtLabel(t, intlLocale),
    note,
    source: "fallback",
  };
}

async function writeAiReportAuditLog(input: {
  actorRole: "manager" | "supervisor";
  actorUid: string;
  coverage: AiDataCoverageItem[];
  error?: string;
  source: AiInsightsResult["source"];
}): Promise<void> {
  await writeAuditLogRecord({
    actorUid: input.actorUid,
    actorRole: input.actorRole,
    action: "ai.manager_report.generate",
    entityType: "ai_report",
    entityId: crypto.randomUUID(),
    metadata: {
      source: input.source,
      error: input.error,
      coverage: input.coverage.map((item) => ({
        key: item.key,
        includedRows: item.includedRows,
        totalRows: item.totalRows,
        truncated: item.truncated,
      })),
    },
  });
}

export async function generateManagerInsightsAction(): Promise<GenerateManagerInsightsActionResult> {
  const session = await requireRole(["manager", "supervisor"]);
  const locale = await getRequestLocale();
  const t = getI18nMessages(locale);
  const intlLocale = getIntlLocaleForApp(locale);

  try {
    const reportData = await buildManagerAiReportData({ requestedBy: session.user });
    const fallback = buildFallbackManagerReport(reportData.payload);

    if (!hasGeminiConfigured()) {
      await writeAiReportAuditLog({
        actorUid: session.uid,
        actorRole: session.role as "manager" | "supervisor",
        coverage: reportData.coverage,
        source: "fallback",
      });

      return { insights: fallback };
    }

    try {
      const geminiInsights = await generateGeminiInsights({
        payload: { ...reportData.payload },
        prompt: t.insights.geminiManagerPrompt,
      });

      const insights = geminiInsights
        ? {
            ...geminiInsights,
            dataCoverage: reportData.coverage,
          }
        : fallback;

      await writeAiReportAuditLog({
        actorUid: session.uid,
        actorRole: session.role as "manager" | "supervisor",
        coverage: reportData.coverage,
        source: insights.source,
      });

      return { insights };
    } catch (error: unknown) {
      const note = getErrorMessage(error);
      const insights: AiInsightsResult = {
        ...fallback,
        note,
      };

      await writeAiReportAuditLog({
        actorUid: session.uid,
        actorRole: session.role as "manager" | "supervisor",
        coverage: reportData.coverage,
        error: note,
        source: "fallback",
      });

      return {
        error: t.insights.unavailable,
        insights,
      };
    }
  } catch (error: unknown) {
    const note = getErrorMessage(error);

    return {
      error: t.insights.unavailable,
      insights: buildUnavailableFallback(note, t, intlLocale),
    };
  }
}
