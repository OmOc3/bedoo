import { z } from "zod";
import { reportStatusOptions } from "../shared/constants";

const statusOptionSchema = z.enum(reportStatusOptions);

export const mobileReportSyncSchema = z.object({
  clientReportId: z.string().trim().min(1).max(160),
  notes: z.string().trim().max(500).optional(),
  stationId: z.string().trim().min(1),
  status: z.array(statusOptionSchema).min(1),
});

export type MobileReportSyncValues = z.infer<typeof mobileReportSyncSchema>;
