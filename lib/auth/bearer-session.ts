import "server-only";

import type { NextRequest } from "next/server";
import { getActiveAppUser } from "@/lib/auth/user-profile";
import { AppError } from "@/lib/errors";
import { adminAuth } from "@/lib/firebase-admin";
import type { AppUser, UserRole } from "@/types";

export interface BearerSession {
  uid: string;
  role: UserRole;
  user: AppUser;
}

export function getBearerToken(request: NextRequest): string | null {
  const authorization = request.headers.get("authorization");

  if (!authorization) {
    return null;
  }

  const [scheme, token] = authorization.split(" ");

  if (scheme?.toLowerCase() !== "bearer" || !token) {
    return null;
  }

  return token;
}

export async function requireBearerRole(request: NextRequest, roles: UserRole[]): Promise<BearerSession> {
  const token = getBearerToken(request);

  if (!token) {
    throw new AppError("سجل الدخول قبل استخدام تطبيق الموبايل.", "AUTH_REQUIRED", 401);
  }

  const decodedToken = await adminAuth().verifyIdToken(token, true);
  const user = await getActiveAppUser(decodedToken.uid);

  if (!user) {
    throw new AppError("انتهت الجلسة أو أن الحساب غير نشط.", "AUTH_INVALID_TOKEN", 401);
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
