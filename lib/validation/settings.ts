import { z } from "zod";

export const updateAppSettingsSchema = z.object({
  maintenanceEnabled: z.boolean(),
  clientDailyStationOrderLimit: z
    .number()
    .int()
    .min(0, "الحد اليومي يجب أن يكون 0 أو أكبر.")
    .max(1000, "الحد اليومي كبير جدًا."),
});

export type UpdateAppSettingsValues = z.infer<typeof updateAppSettingsSchema>;

