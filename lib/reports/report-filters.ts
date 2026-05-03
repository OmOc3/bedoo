import { z } from "zod";

export const reportsFilterSchema = z.object({
  stationId: z.string().trim().optional(),
  technicianUid: z.string().trim().optional(),
  dateFrom: z.string().trim().optional(),
  dateTo: z.string().trim().optional(),
  reviewStatus: z.enum(["", "pending", "reviewed", "rejected"]).optional(),
});

export type ReportsFilterValues = z.infer<typeof reportsFilterSchema>;

export function buildReportsListingHref(
  basePath: string,
  filters: ReportsFilterValues,
  reviewStatus: ReportsFilterValues["reviewStatus"],
): string {
  const merged: ReportsFilterValues = {
    stationId: filters.stationId,
    technicianUid: filters.technicianUid,
    dateFrom: filters.dateFrom,
    dateTo: filters.dateTo,
    reviewStatus: reviewStatus ?? "",
  };
  const params = new URLSearchParams();

  Object.entries(merged).forEach(([key, value]) => {
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      params.set(key, String(value));
    }
  });

  const query = params.toString();

  return query.length > 0 ? `${basePath}?${query}` : basePath;
}
