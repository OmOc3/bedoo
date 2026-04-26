import { z } from "zod";

export const createUserSchema = z.object({
  displayName: z.string().trim().min(1),
  email: z.string().trim().email(),
  password: z.string().min(8),
  role: z.enum(["technician", "supervisor", "manager"]),
});

export const updateUserRoleSchema = z.object({
  role: z.enum(["technician", "supervisor", "manager"]),
});

export const updateUserActiveSchema = z.object({
  isActive: z.boolean(),
});

export type CreateUserValues = z.infer<typeof createUserSchema>;
export type UpdateUserRoleValues = z.infer<typeof updateUserRoleSchema>;
export type UpdateUserActiveValues = z.infer<typeof updateUserActiveSchema>;
