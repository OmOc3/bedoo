import type { AppUser, AuthenticatedUserResponse } from "@/types";

export function toAuthenticatedUserResponse(user: AppUser): AuthenticatedUserResponse {
  return {
    uid: user.uid,
    email: user.email,
    displayName: user.displayName,
    role: user.role,
    isActive: user.isActive,
  };
}
