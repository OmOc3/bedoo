import { z } from "zod";
import { i18n } from "../i18n";
import { clientAddressLinesFromText } from "./client-orders";

const disposableEmailDomains = new Set([
  "10minutemail.com",
  "dispostable.com",
  "guerrillamail.com",
  "mailinator.com",
  "minuteinbox.com",
  "sharklasers.com",
  "tempmail.com",
  "temp-mail.org",
  "throwaway.email",
  "trashmail.com",
  "yopmail.com",
]);

const accessCodeRules = z
  .string()
  .trim()
  .min(8, "كود الدخول يجب ألا يقل عن 8 أحرف.")
  .max(32, "كود الدخول يجب ألا يزيد عن 32 حرفًا.")
  .regex(/^[A-Za-z0-9]+$/, "كود الدخول يجب أن يتكون من حروف وأرقام فقط.");

const clientSignupDeviceIdSchema = z
  .string()
  .trim()
  .min(16, "تعذر تحديد الجهاز المستخدم.")
  .max(128, "معرف الجهاز غير صالح.")
  .regex(/^[A-Za-z0-9_-]+$/, "معرف الجهاز غير صالح.");

export const loginFormSchema = z.object({
  email: z.string().trim().min(1, i18n.validation.requiredEmail).email(i18n.auth.invalidEmail),
  password: z.string().min(1, i18n.auth.passwordRequired),
});

export type LoginFormValues = z.infer<typeof loginFormSchema>;

const clientSignupBaseSchema = z.object({
  accessCode: accessCodeRules,
  confirmAccessCode: accessCodeRules,
  addressesText: z.string().trim().max(1200, "العناوين طويلة جدًا.").optional().or(z.literal("")),
  displayName: z.string().trim().min(2, "اسم العميل يجب ألا يقل عن حرفين.").max(100, "اسم العميل طويل جدًا."),
  email: z.string().trim().min(1, i18n.validation.requiredEmail).email(i18n.auth.invalidEmail),
  phone: z
    .string()
    .trim()
    .min(1, "رقم الهاتف مطلوب.")
    .max(40, "رقم الهاتف طويل جدًا.")
    .regex(/^[0-9+\s().-]+$/, "رقم الهاتف يجب أن يحتوي على أرقام ورموز اتصال فقط.")
    .refine((value) => value.replace(/\D/g, "").length >= 8, "أدخل رقم هاتف كاملًا (8 أرقام على الأقل)."),
});

type ClientSignupBaseValues = z.infer<typeof clientSignupBaseSchema>;

function validateClientSignup(values: ClientSignupBaseValues, context: z.RefinementCtx): void {
  if (values.accessCode !== values.confirmAccessCode) {
    context.addIssue({
      code: "custom",
      message: "تأكيد كود الدخول لا يطابق الكود الأول.",
      path: ["confirmAccessCode"],
    });
  }

  const domainPart = values.email.trim().split("@")[1]?.toLowerCase();

  if (domainPart && disposableEmailDomains.has(domainPart)) {
    context.addIssue({
      code: "custom",
      message: "جرّب بريدًا دائمًا من شركتك أو مزودك. عناوين البريد المؤقت غير مسموحة.",
      path: ["email"],
    });
  }

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
}

export const clientSignupSchema = clientSignupBaseSchema.superRefine(validateClientSignup);

export type ClientSignupValues = z.infer<typeof clientSignupSchema>;

export const clientSignupRequestSchema = clientSignupBaseSchema
  .extend({
    deviceId: clientSignupDeviceIdSchema,
  })
  .superRefine(validateClientSignup);

export type ClientSignupRequestValues = z.infer<typeof clientSignupRequestSchema>;

export const sessionRequestSchema = z.object({}).strict();
