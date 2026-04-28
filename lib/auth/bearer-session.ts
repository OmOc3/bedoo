import "server-only";

import type { NextRequest } from "next/server";
import { auth, type BetterAuthSession } from "@/lib/auth/better-auth";
import { requiredTimestamp } from "@/lib/db/mappers";
import { getActiveAppUser } from "@/lib/db/repositories";
import { AppError } from "@/lib/errors";
import type { AppUser, UserRole } from "@/types";

export interface BearerSession {
  uid: string;
  role: UserRole;
  user: AppUser;
}

const validRoles = new Set<UserRole>(["client", "technician", "supervisor", "manager"]);

function normalizeRole(value: unknown): UserRole | null {
  return typeof value === "string" && validRoles.has(value as UserRole) ? (value as UserRole) : null;
}

function userFromSession(user: BetterAuthSession["user"]): AppUser | null {
  const role = normalizeRole(user.role);

  if (!role || user.banned === true) {
    return null;
  }

  return {
    uid: user.id,
    email: user.email,
    displayName: user.name,
    role,
    createdAt: requiredTimestamp(user.createdAt),
    isActive: true,
  };
}

export function getBearerToken(request: NextRequest): string | null {
  const authorization = request.headers.get("authorization");

  if (!authorization) {
    return null;
  }

  const [scheme, token] = authorization.split(" ");

  return scheme?.toLowerCase() === "bearer" && token ? token : null;
}

export async function requireBearerRole(request: NextRequest, roles: UserRole[]): Promise<BearerSession> {
  const session = await auth.api.getSession({
    headers: request.headers,
  });

  if (!session) {
    throw new AppError("سجل الدخول قبل استخدام تطبيق الموبايل.", "AUTH_REQUIRED", 401);
  }

  const sessionUser = userFromSession(session.user);

  if (!sessionUser) {
    throw new AppError("انتهت الجلسة أو أن الحساب غير نشط.", "AUTH_INVALID_SESSION", 401);
  }

  const user = await getActiveAppUser(sessionUser.uid);

  if (!user) {
    throw new AppError("انتهت الجلسة أو أن الحساب غير نشط.", "AUTH_INVALID_SESSION", 401);
  }

  if (!roles.includes(user.role)) {
    throw new AppError("ليست لديك صلاحية لتنفيذ هذا الإجراء.", "AUTH_FORBIDDEN", 403);
  }

  return {
    uid: user.uid,
    role: user.role,
    user,
  };
}
