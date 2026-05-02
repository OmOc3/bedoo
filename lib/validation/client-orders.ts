import { z } from "zod";
import { updateUserProfileSchema } from "@/lib/validation/users";

export function clientAddressLinesFromText(value: string | undefined): string[] {
  return (value ?? "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

export const createClientOrderSchema = z.object({
  stationLabel: z.string().trim().min(2).max(120),
  stationLocation: z.string().trim().min(3).max(300),
  stationDescription: z.string().trim().max(500).optional(),
  note: z.string().trim().max(600).optional(),
  lat: z.number().min(-90).max(90).optional(),
  lng: z.number().min(-180).max(180).optional(),
});

export const updateClientOrderStatusSchema = z.object({
  orderId: z.string().trim().min(1),
  status: z.enum(["pending", "in_progress", "completed", "cancelled"]),
});

const clientPhoneSchema = z
  .string()
  .trim()
  .max(40, "رقم الهاتف طويل جدًا.")
  .regex(/^[0-9+\s().-]*$/, "رقم الهاتف يجب أن يحتوي على أرقام ورموز اتصال فقط.")
  .optional()
  .or(z.literal(""));

export const updateClientProfileSchema = z
  .object({
    addressesText: z.string().trim().max(1200).optional().or(z.literal("")),
    clientUid: z.string().trim().min(1),
    phone: clientPhoneSchema,
  })
  .superRefine((values, context) => {
    const addresses = clientAddressLinesFromText(values.addressesText);

    if (addresses.length > 8) {
      context.addIssue({
        code: "custom",
        message: "لا يمكن إضافة أكثر من 8 عناوين للعميل.",
        path: ["addressesText"],
      });
    }

    addresses.forEach((address, index) => {
      if (address.length < 3 || address.length > 180) {
        context.addIssue({
          code: "custom",
          message: `العنوان رقم ${index + 1} يجب أن يكون بين 3 و180 حرفًا.`,
          path: ["addressesText"],
        });
      }
    });
  });

export const updateClientStationAccessSchema = z.object({
  clientUid: z.string().trim().min(1),
  stationIds: z.array(z.string().trim().min(1)).max(500),
});

export const updateClientAccountProfileSchema = updateUserProfileSchema.extend({
  phone: clientPhoneSchema,
});

export const updateClientAccountPasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "كلمة المرور الحالية مطلوبة."),
    newPassword: z
      .string()
      .min(8, "كلمة المرور الجديدة يجب ألا تقل عن 8 أحرف.")
      .max(32, "كلمة المرور الجديدة يجب ألا تزيد عن 32 حرفًا."),
    confirmPassword: z.string().min(1, "تأكيد كلمة المرور مطلوب."),
  })
  .superRefine((values, context) => {
    if (values.newPassword !== values.confirmPassword) {
      context.addIssue({
        code: "custom",
        message: "تأكيد كلمة المرور لا يطابق كلمة المرور الجديدة.",
        path: ["confirmPassword"],
      });
    }

    if (values.currentPassword === values.newPassword) {
      context.addIssue({
        code: "custom",
        message: "استخدم كلمة مرور جديدة مختلفة عن الحالية.",
        path: ["newPassword"],
      });
    }
  });

export type CreateClientOrderValues = z.infer<typeof createClientOrderSchema>;
export type UpdateClientAccountPasswordValues = z.infer<typeof updateClientAccountPasswordSchema>;
export type UpdateClientAccountProfileValues = z.infer<typeof updateClientAccountProfileSchema>;
export type UpdateClientOrderStatusValues = z.infer<typeof updateClientOrderStatusSchema>;
export type UpdateClientProfileValues = z.infer<typeof updateClientProfileSchema>;
export type UpdateClientStationAccessValues = z.infer<typeof updateClientStationAccessSchema>;
