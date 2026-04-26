import { z } from "zod";
import { i18n } from "@/lib/i18n";

export const loginFormSchema = z.object({
  email: z.string().trim().min(1, i18n.validation.requiredEmail).email(i18n.auth.invalidEmail),
  password: z.string().min(1, i18n.auth.passwordRequired),
});

export type LoginFormValues = z.infer<typeof loginFormSchema>;

export const sessionRequestSchema = z.object({}).strict();
