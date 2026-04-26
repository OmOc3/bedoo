import "server-only";

export { submitReportRecord as submitReportWithAdmin } from "@/lib/db/repositories";
export type { SubmitReportInput, SubmitReportResult } from "@/lib/db/repositories";
