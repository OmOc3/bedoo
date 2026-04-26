import type { UserRole } from '@/lib/sync/types';

export type MobileHomeRoute = '/(tabs)' | '/admin-portal';
export type WebPortalRole = 'manager' | 'supervisor';

export function isWebPortalRole(role: UserRole): role is WebPortalRole {
  return role === 'manager' || role === 'supervisor';
}

export function getMobileHomeRoute(role: UserRole): MobileHomeRoute {
  return isWebPortalRole(role) ? '/admin-portal' : '/(tabs)';
}

export function getWebPortalPath(role: WebPortalRole): '/dashboard/manager' | '/dashboard/supervisor' {
  return role === 'manager' ? '/dashboard/manager' : '/dashboard/supervisor';
}
