import { z } from "zod";

const accessCodeSchema = z
  .string()
  .trim()
  .min(8, "كود الدخول يجب ألا يقل عن 8 أحرف.")
  .max(32, "كود الدخول يجب ألا يزيد عن 32 حرفًا.")
  .regex(/^[A-Za-z0-9]+$/, "كود الدخول يجب أن يتكون من حروف وأرقام فقط.");

export const createUserSchema = z.object({
  displayName: z.string().trim().min(1),
  email: z.string().trim().email(),
  password: accessCodeSchema,
  role: z.enum(["technician", "supervisor", "manager"]),
});

export const updateUserRoleSchema = z.object({
  role: z.enum(["technician", "supervisor", "manager"]),
});

export const updateUserActiveSchema = z.object({
  isActive: z.boolean(),
});

export const updateUserAccessCodeSchema = z.object({
  password: accessCodeSchema,
});

export type CreateUserValues = z.infer<typeof createUserSchema>;
export type UpdateUserRoleValues = z.infer<typeof updateUserRoleSchema>;
export type UpdateUserActiveValues = z.infer<typeof updateUserActiveSchema>;
export type UpdateUserAccessCodeValues = z.infer<typeof updateUserAccessCodeSchema>;
