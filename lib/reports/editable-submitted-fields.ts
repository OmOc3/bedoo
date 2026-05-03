import type { Report } from "@/types";

/** Serializable subset for passage from Server → Client Components (no AppTimestamp/functions). */
export type EditableSubmittedReportFields = Pick<Report, "reportId" | "notes" | "pestTypes" | "status">;

/** Use when rendering from a server page so only JSON-serializable fields cross the client boundary. */
export function editableSubmittedReportFields(report: Report): EditableSubmittedReportFields {
  return {
    reportId: report.reportId,
    notes: report.notes,
    pestTypes: report.pestTypes,
    status: report.status,
  };
}
