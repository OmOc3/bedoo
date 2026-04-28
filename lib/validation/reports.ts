import { z } from "zod";
import { reportStatusOptions, reviewStatuses } from "../shared/constants";

const statusOptionSchema = z.enum(reportStatusOptions);

export const submitReportSchema = z.object({
  stationId: z.string().trim().min(1),
  status: z.array(statusOptionSchema).min(1),
  notes: z.string().trim().max(500).optional(),
  beforePhoto: z.instanceof(File).optional(),
  afterPhoto: z.instanceof(File).optional(),
  stationPhoto: z.instanceof(File).optional(),
});

export const reviewReportSchema = z.object({
  reviewStatus: z.enum(reviewStatuses),
  reviewNotes: z.string().trim().max(500).optional(),
});

export type SubmitReportValues = z.infer<typeof submitReportSchema>;
export type ReviewReportValues = z.infer<typeof reviewReportSchema>;
