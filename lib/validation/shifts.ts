import { z } from "zod";
import { shiftSalaryStatuses } from "@/lib/shifts/schedule";

const optionalSalaryAmountSchema = z.preprocess((value) => {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? Number(trimmed) : undefined;
  }

  return value;
}, z.number().min(0, "قيمة الراتب لا يمكن أن تكون أقل من صفر.").optional());

export const updateShiftPayrollSchema = z
  .object({
    notes: z
      .string()
      .trim()
      .max(500, "ملاحظات الرواتب طويلة جدًا.")
      .optional()
      .transform((value) => (value && value.length > 0 ? value : undefined)),
    salaryAmount: optionalSalaryAmountSchema,
    salaryStatus: z.enum(shiftSalaryStatuses),
    shiftId: z.string().trim().min(1, "معرف الشيفت مطلوب."),
  })
  .superRefine((value, context) => {
    if (value.salaryStatus === "paid" && value.salaryAmount === undefined) {
      context.addIssue({
        code: "custom",
        message: "أدخل قيمة الراتب قبل اعتماد الدفع.",
        path: ["salaryAmount"],
      });
    }
  });

export type UpdateShiftPayrollValues = z.infer<typeof updateShiftPayrollSchema>;
export type UpdateShiftPayrollInputValues = z.input<typeof updateShiftPayrollSchema>;
