import { statusOptionLabels, type SharedStatusOption } from "../shared/constants";

export const REPORT_EXPORT_DEFAULT_RANGE_DAYS = 90;
export const REPORT_EXPORT_MAX_ROWS = 5000;

export function csvCell(value: string | number): string {
  const rawText = String(value);
  const text = /^[=+\-@]/.test(rawText) ? `'${rawText}` : rawText;

  if (text.includes('"') || text.includes(",") || text.includes("\n") || text.includes("\r")) {
    return `"${text.replace(/"/g, '""')}"`;
  }

  return text;
}

export function csvRow(values: (string | number)[]): string {
  return values.map(csvCell).join(",");
}

export function defaultExportDateFrom(now = new Date()): Date {
  const date = new Date(now);

  date.setDate(date.getDate() - REPORT_EXPORT_DEFAULT_RANGE_DAYS);
  date.setHours(0, 0, 0, 0);

  return date;
}

export function statusLabelsForCsv(status: SharedStatusOption[]): string {
  return status.map((item) => statusOptionLabels[item]).join(" | ");
}
