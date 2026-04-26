import "server-only";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth, type BetterAuthSession } from "@/lib/auth/better-auth";
import { requiredTimestamp } from "@/lib/db/mappers";
import type { AppUser, UserRole } from "@/types";

export interface CurrentSession {
  uid: string;
  role: UserRole;
  user: AppUser;
}

const validRoles = new Set<UserRole>(["technician", "supervisor", "manager"]);

function normalizeRole(value: unknown): UserRole | null {
  return typeof value === "string" && validRoles.has(value as UserRole) ? (value as UserRole) : null;
}

function userFromBetterAuth(user: BetterAuthSession["user"]): AppUser | null {
  const role = normalizeRole(user.role);
  const isActive = user.banned !== true;

  if (!role || !isActive) {
    return null;
  }

  return {
    uid: user.id,
    email: user.email,
    displayName: user.name,
    role,
    createdAt: requiredTimestamp(user.createdAt),
    isActive,
  };
}

export async function getCurrentSession(): Promise<CurrentSession | null> {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session) {
      return null;
    }

    const user = userFromBetterAuth(session.user);

    if (!user) {
      return null;
    }

    return {
      uid: user.uid,
      role: user.role,
      user,
    };
  } catch (_error: unknown) {
    return null;
  }
}

export async function requireSession(): Promise<CurrentSession> {
  const session = await getCurrentSession();

  if (!session) {
    redirect("/login");
  }

  return session;
}

export async function requireRole(roles: UserRole[]): Promise<CurrentSession> {
  const session = await requireSession();

  if (!roles.includes(session.role)) {
    redirect("/unauthorized");
  }

  return session;
}
