import { z } from "zod";
import { BRAND } from "@/lib/brand";
import { isRecord } from "@/lib/utils";
import type { AiInsightsResult } from "@/types";

const aiInsightsSchema = z.object({
  alerts: z.array(z.string().min(1)).max(4),
  recommendations: z.array(z.string().min(1)).max(4),
  summary: z.string().min(1),
});

interface GenerateGeminiInsightsParams {
  payload: Record<string, unknown>;
  prompt: string;
}

interface GeminiCandidatePart {
  text?: string;
}

interface GeminiCandidate {
  content?: {
    parts?: GeminiCandidatePart[];
  };
}

interface GeminiGenerateContentResponse {
  candidates?: GeminiCandidate[];
}

function getGeminiApiKey(): string | null {
  const value = process.env.GEMINI_API_KEY?.trim();

  return value ? value : null;
}

function extractText(response: GeminiGenerateContentResponse): string | null {
  const parts = response.candidates?.[0]?.content?.parts;

  if (!Array.isArray(parts)) {
    return null;
  }

  const text = parts
    .map((part) => (typeof part.text === "string" ? part.text : ""))
    .join("")
    .trim();

  return text.length > 0 ? text : null;
}

function sanitizeModelPayload(text: string): string {
  return text.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/i, "").trim();
}

function parseInsightsPayload(text: string): Pick<AiInsightsResult, "summary" | "alerts" | "recommendations"> {
  const parsed = JSON.parse(sanitizeModelPayload(text)) as unknown;

  return aiInsightsSchema.parse(parsed);
}

export async function generateGeminiInsights({
  payload,
  prompt,
}: GenerateGeminiInsightsParams): Promise<AiInsightsResult | null> {
  const apiKey = getGeminiApiKey();

  if (!apiKey) {
    return null;
  }

  const response = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": apiKey,
    },
    body: JSON.stringify({
      generationConfig: {
        responseJsonSchema: {
          properties: {
            alerts: {
              items: {
                type: "STRING",
              },
              type: "ARRAY",
            },
            recommendations: {
              items: {
                type: "STRING",
              },
              type: "ARRAY",
            },
            summary: {
              type: "STRING",
            },
          },
          required: ["summary", "alerts", "recommendations"],
          type: "OBJECT",
        },
        responseMimeType: "application/json",
        thinkingConfig: {
          thinkingLevel: "low",
        },
      },
      contents: [
        {
          parts: [
            {
              text: `${prompt}\n\nالبيانات:\n${JSON.stringify(payload)}`,
            },
          ],
        },
      ],
      system_instruction: {
        parts: [
          {
            text:
              `أنت محلل عمليات عربي لنظام ${BRAND.name}. أعد فقط JSON صالحًا بدون markdown أو شرح إضافي. المفاتيح المطلوبة فقط: summary, alerts, recommendations.`,
          },
        ],
      },
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Gemini request failed with status ${response.status}`);
  }

  const data = (await response.json()) as unknown;

  if (!isRecord(data)) {
    throw new Error("Invalid Gemini response");
  }

  const content = extractText(data as GeminiGenerateContentResponse);

  if (!content) {
    throw new Error("Gemini returned no text");
  }

  const parsed = parseInsightsPayload(content);

  return {
    ...parsed,
    generatedAt: new Intl.DateTimeFormat("ar-EG", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date()),
    model: "gemini-3-flash-preview",
    source: "gemini",
  };
}

export function hasGeminiConfigured(): boolean {
  return Boolean(getGeminiApiKey());
}
