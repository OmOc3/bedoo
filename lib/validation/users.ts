import { z } from "zod";
import { userRoles } from "../shared/constants";

const displayNameSchema = z.string().trim().min(1).max(100);

function isAllowedProfileImageUrl(value: string): boolean {
  if (value.length === 0) {
    return true;
  }

  try {
    const url = new URL(value);

    return url.protocol === "https:" && url.hostname === "res.cloudinary.com";
  } catch {
    return false;
  }
}

const profileImageUrlSchema = z
  .string()
  .trim()
  .max(2048)
  .refine(isAllowedProfileImageUrl, "Profile image URL must be a secure Cloudinary URL.");

const optionalProfileImageUrlSchema = profileImageUrlSchema.optional();

const accessCodeSchema = z
  .string()
  .trim()
  .min(8, "كود الدخول يجب ألا يقل عن 8 أحرف.")
  .max(32, "كود الدخول يجب ألا يزيد عن 32 حرفًا.")
  .regex(/^[A-Za-z0-9]+$/, "كود الدخول يجب أن يتكون من حروف وأرقام فقط.");

export const createUserSchema = z.object({
  displayName: displayNameSchema,
  email: z.string().trim().email(),
  password: accessCodeSchema,
  role: z.enum(userRoles),
  image: optionalProfileImageUrlSchema,
});

export const updateUserRoleSchema = z.object({
  role: z.enum(userRoles),
});

export const updateUserActiveSchema = z.object({
  isActive: z.boolean(),
});

export const updateUserAccessCodeSchema = z.object({
  password: accessCodeSchema,
});

export const updateUserProfileSchema = z.object({
  displayName: displayNameSchema,
  image: optionalProfileImageUrlSchema,
});

export const updateUserProfilePatchSchema = z.object({
  displayName: displayNameSchema.optional(),
  image: optionalProfileImageUrlSchema,
});

export type CreateUserValues = z.infer<typeof createUserSchema>;
export type UpdateUserRoleValues = z.infer<typeof updateUserRoleSchema>;
export type UpdateUserActiveValues = z.infer<typeof updateUserActiveSchema>;
export type UpdateUserAccessCodeValues = z.infer<typeof updateUserAccessCodeSchema>;
export type UpdateUserProfileValues = z.infer<typeof updateUserProfileSchema>;
export type UpdateUserProfilePatchValues = z.infer<typeof updateUserProfilePatchSchema>;
