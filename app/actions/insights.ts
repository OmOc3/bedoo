"use server";

import { requireRole } from "@/lib/auth/server-session";
import { buildStatusCounts, buildTechnicianStats, buildZoneStats, reportFromData, stationFromData } from "@/lib/analytics";
import { REPORTS_COL, STATIONS_COL } from "@/lib/collections";
import { adminDb } from "@/lib/firebase-admin";
import { generateGeminiInsights, hasGeminiConfigured } from "@/lib/gemini";
import { i18n, statusOptionLabels } from "@/lib/i18n";
import { getErrorMessage } from "@/lib/utils";
import type { AiInsightsResult, Report, Station } from "@/types";

export interface GenerateManagerInsightsActionResult {
  error?: string;
  insights?: AiInsightsResult;
}

function buildFallbackInsights(stations: Station[], reports: Report[]): AiInsightsResult {
  const zones = buildZoneStats(stations, reports);
  const technicians = buildTechnicianStats(reports);
  const statusSummary = buildStatusCounts(reports);
  const pendingCount = reports.filter((report) => report.reviewStatus === "pending").length;
  const activeStations = stations.filter((station) => station.isActive).length;
  const topZone = zones[0];
  const topTechnician = technicians[0];
  const topStatus = statusSummary[0];
  const alerts = [
    pendingCount > 0 ? `يوجد ${pendingCount} تقريرًا بانتظار المراجعة ويحتاج إلى إغلاق أسرع.` : null,
    topZone ? `المنطقة ${topZone.zone} تسجل أعلى نشاط بعدد ${topZone.reports} تقرير.` : null,
    topTechnician && topTechnician.pending > 0
      ? `${topTechnician.technicianName} لديه ${topTechnician.pending} تقريرًا ما زال بانتظار المراجعة.`
      : null,
  ].filter((value): value is string => Boolean(value));
  const recommendations = [
    pendingCount > 0 ? "خصص نافذة مراجعة يومية ثابتة لتقارير الفنيين المفتوحة." : "استمر على نفس وتيرة المراجعة الحالية.",
    topZone ? `راجع توزيع المحطات في ${topZone.zone} إذا استمر الحجم أعلى من باقي المناطق.` : null,
    topStatus ? `تابع سبب تكرار حالة "${statusOptionLabels[topStatus.status]}" وقيّم الحاجة لإجراء وقائي.` : null,
    activeStations < stations.length ? "راجع أسباب تعطيل المحطات غير النشطة وأعد تفعيل القابل منها." : null,
  ].filter((value): value is string => Boolean(value));

  return {
    alerts,
    generatedAt: new Intl.DateTimeFormat("ar-EG", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date()),
    note: hasGeminiConfigured() ? undefined : i18n.insights.missingKey,
    recommendations,
    source: "fallback",
    summary: `لديك ${stations.length} محطة، منها ${activeStations} نشطة، مع ${reports.length} تقريرًا مسجلًا حتى الآن.`,
  };
}

export async function generateManagerInsightsAction(): Promise<GenerateManagerInsightsActionResult> {
  await requireRole(["manager"]);

  try {
    const [stationsSnapshot, reportsSnapshot] = await Promise.all([
      adminDb().collection(STATIONS_COL).get(),
      adminDb().collection(REPORTS_COL).get(),
    ]);
    const stations = stationsSnapshot.docs.map((doc) => stationFromData(doc.id, doc.data() as Partial<Station>));
    const reports = reportsSnapshot.docs.map((doc) => reportFromData(doc.id, doc.data() as Partial<Report>));
    const fallback = buildFallbackInsights(stations, reports);

    const aiPayload = {
      activeStations: stations.filter((station) => station.isActive).length,
      pendingReviewReports: reports.filter((report) => report.reviewStatus === "pending").length,
      topStatuses: buildStatusCounts(reports).slice(0, 4).map((item) => ({
        count: item.count,
        label: statusOptionLabels[item.status],
        status: item.status,
      })),
      topTechnicians: buildTechnicianStats(reports).slice(0, 4),
      topZones: buildZoneStats(stations, reports).slice(0, 4),
      totalReports: reports.length,
      totalStations: stations.length,
    };

    let geminiInsights: AiInsightsResult | null = null;

    try {
      geminiInsights = await generateGeminiInsights({
        payload: aiPayload,
        prompt:
          "اعرض موجزًا عربيًا قصيرًا للمدير. لخص الوضع التشغيلي الحالي، ثم قدم حتى 3 تنبيهات وحتى 4 توصيات عملية مباشرة قابلة للتنفيذ هذا الأسبوع.",
      });
    } catch (error: unknown) {
      return {
        error: i18n.insights.unavailable,
        insights: {
          ...fallback,
          note: getErrorMessage(error),
        },
      };
    }

    return {
      insights: geminiInsights
        ? {
            ...geminiInsights,
            note: fallback.note,
          }
        : fallback,
    };
  } catch (error: unknown) {
    const message = getErrorMessage(error);

    return {
      insights: {
        ...buildFallbackInsights([], []),
        note: message,
      },
      error: i18n.insights.unavailable,
    };
  }
}
