import type { UserRole } from "@/types";

export const ROLE_REDIRECTS: Record<UserRole, string> = {
  client: "/client/portal",
  technician: "/scan",
  supervisor: "/dashboard/supervisor",
  manager: "/dashboard/manager",
};

export function getRoleRedirect(role: UserRole): string {
  return ROLE_REDIRECTS[role];
}
