import { z } from "zod";
import { pestTypeOptions, reportStatusOptions } from "../shared/constants";

const statusOptionSchema = z.enum(reportStatusOptions);
const pestTypeSchema = z.enum(pestTypeOptions);

export const mobileReportSyncSchema = z.object({
  accuracyMeters: z.number().optional(),
  clientReportId: z.string().trim().min(1).max(160),
  lat: z.number().optional(),
  lng: z.number().optional(),
  notes: z.string().trim().max(500).optional(),
  stationId: z.string().trim().min(1),
  status: z.array(statusOptionSchema).min(1),
  pestTypes: z.array(pestTypeSchema).min(1).optional(),
});

export type MobileReportSyncValues = z.infer<typeof mobileReportSyncSchema>;
