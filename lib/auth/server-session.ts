import "server-only";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth, type BetterAuthSession } from "@/lib/auth/better-auth";
import { ensureAuthUserSchema } from "@/lib/auth/ensure-auth-schema";
import { isBlockedAccountFlag } from "@/lib/db/boolean";
import { requiredTimestamp } from "@/lib/db/mappers";
import { ensureRuntimeDatabaseSchema } from "@/lib/db/runtime-schema";
import { getActiveAppUser, getAppSettings, getAppUser } from "@/lib/db/repositories";
import type { AppUser, UserRole } from "@/types";

export interface SessionCheckResult {
  isValid: boolean;
  isDisabled: boolean;
  session: CurrentSession | null;
}

export interface CurrentSession {
  uid: string;
  role: UserRole;
  user: AppUser;
}

const validRoles = new Set<UserRole>(["client", "technician", "supervisor", "manager"]);

function normalizeRole(value: unknown): UserRole | null {
  return typeof value === "string" && validRoles.has(value as UserRole) ? (value as UserRole) : null;
}

function userFromBetterAuth(user: BetterAuthSession["user"]): AppUser | null {
  const role = normalizeRole(user.role);
  const isActive = !isBlockedAccountFlag(user.banned);

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
    await ensureAuthUserSchema();

    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session) {
      return null;
    }

    const sessionUser = userFromBetterAuth(session.user);

    if (!sessionUser) {
      return null;
    }

    const user = await getActiveAppUser(sessionUser.uid);

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
  const result = await checkSessionWithStatus();

  if (result.isDisabled) {
    redirect("/account-disabled");
  }

  if (!result.isValid || !result.session) {
    redirect("/login");
  }

  const settings = await getAppSettings();
  if (settings.maintenanceEnabled && (result.session.role === "client" || result.session.role === "technician")) {
    redirect("/maintenance");
  }

  await ensureRuntimeDatabaseSchema();

  return result.session;
}

export async function requireRole(roles: UserRole[]): Promise<CurrentSession> {
  const session = await requireSession();

  if (!roles.includes(session.role)) {
    redirect("/unauthorized");
  }

  return session;
}

/**
 * Check session and detect if account was disabled.
 * If disabled, revoke the session and redirect to account-disabled page.
 */
export async function checkSessionWithStatus(): Promise<SessionCheckResult> {
  try {
    await ensureAuthUserSchema();

    const authSession = await auth.api.getSession({
      headers: await headers(),
    });

    if (!authSession) {
      return { isValid: false, isDisabled: false, session: null };
    }

    const sessionUser = userFromBetterAuth(authSession.user);

    // If userFromBetterAuth returned null, it could be due to banned status or invalid role
    if (!sessionUser) {
      // Check if user exists but is banned (disabled)
      const user = await getAppUser(authSession.user.id);
      if (user && !user.isActive) {
        // User exists but is disabled - revoke session
        await revokeCurrentSession();
        return { isValid: false, isDisabled: true, session: null };
      }
      return { isValid: false, isDisabled: false, session: null };
    }

    // Also check database for latest status (in case banned status changed since session started)
    const dbUser = await getActiveAppUser(sessionUser.uid);
    if (!dbUser) {
      // User exists in auth but not active in DB - revoke session
      const fullUser = await getAppUser(sessionUser.uid);
      if (fullUser && !fullUser.isActive) {
        await revokeCurrentSession();
        return { isValid: false, isDisabled: true, session: null };
      }
      return { isValid: false, isDisabled: false, session: null };
    }

    return {
      isValid: true,
      isDisabled: false,
      session: {
        uid: dbUser.uid,
        role: dbUser.role,
        user: dbUser,
      },
    };
  } catch (_error: unknown) {
    return { isValid: false, isDisabled: false, session: null };
  }
}

/**
 * Revoke the current session (sign out)
 */
export async function revokeCurrentSession(): Promise<void> {
  try {
    await auth.api.signOut({
      headers: await headers(),
    });
  } catch (_error: unknown) {
    // Ignore errors during sign out
  }
}

/**
 * Require session and redirect to account-disabled if account is disabled
 */
export async function requireActiveSession(): Promise<CurrentSession> {
  const result = await checkSessionWithStatus();

  if (result.isDisabled) {
    redirect("/account-disabled");
  }

  if (!result.isValid || !result.session) {
    redirect("/login");
  }

  return result.session;
}
