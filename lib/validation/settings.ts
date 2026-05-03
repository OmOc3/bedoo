import { z } from "zod";

export const updateAppSettingsSchema = z.object({
  maintenanceEnabled: z.boolean(),
  maintenanceMessage: z
    .string()
    .trim()
    .max(280, "رسالة الصيانة طويلة جدًا.")
    .optional()
    .transform((value) => (value && value.length > 0 ? value : undefined)),
  clientDailyStationOrderLimit: z
    .number()
    .int()
    .min(0, "الحد اليومي يجب أن يكون 0 أو أكبر.")
    .max(1000, "الحد اليومي كبير جدًا."),
  supportEmail: z
    .string()
    .trim()
    .email("أدخل بريد دعم صحيحًا.")
    .max(120, "بريد الدعم طويل جدًا.")
    .optional()
    .or(z.literal(""))
    .transform((value) => (value && value.length > 0 ? value.toLowerCase() : undefined)),
  supportHours: z
    .string()
    .trim()
    .max(160, "مواعيد الدعم طويلة جدًا.")
    .optional()
    .transform((value) => (value && value.length > 0 ? value : undefined)),
  supportPhone: z
    .string()
    .trim()
    .max(40, "رقم الدعم طويل جدًا.")
    .regex(/^[0-9+\s().-]*$/, "رقم الدعم يجب أن يحتوي على أرقام ورموز اتصال فقط.")
    .optional()
    .transform((value) => (value && value.length > 0 ? value : undefined)),
});

export type UpdateAppSettingsValues = z.infer<typeof updateAppSettingsSchema>;

