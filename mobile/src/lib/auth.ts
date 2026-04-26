import { createContext, createElement, type ReactNode, useContext, useEffect, useMemo, useState } from 'react';

import { authClient } from '@/lib/auth-client';
import { apiGet } from '@/lib/sync/api-client';
import type { AuthenticatedUserResponse } from '@/lib/sync/types';

interface MobileAuthSession {
  session: {
    expiresAt: Date | string;
    id: string;
    userId: string;
  };
  user: {
    email: string;
    id: string;
    name?: null | string;
  };
}

export interface CurrentMobileUser {
  profile: AuthenticatedUserResponse;
  session: MobileAuthSession;
}

interface AuthContextValue {
  currentUser: CurrentMobileUser | null;
  ready: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function isMobileAuthSession(value: unknown): value is MobileAuthSession {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as { session?: unknown; user?: unknown };

  if (!candidate.session || typeof candidate.session !== 'object' || !candidate.user || typeof candidate.user !== 'object') {
    return false;
  }

  const session = candidate.session as Partial<MobileAuthSession['session']>;
  const user = candidate.user as Partial<MobileAuthSession['user']>;

  return (
    typeof session.id === 'string' &&
    typeof session.userId === 'string' &&
    (typeof session.expiresAt === 'string' || session.expiresAt instanceof Date) &&
    typeof user.id === 'string' &&
    typeof user.email === 'string'
  );
}

function isActiveUserResponse(value: unknown): value is AuthenticatedUserResponse {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const user = value as Partial<AuthenticatedUserResponse>;

  return (
    user.isActive === true &&
    typeof user.uid === 'string' &&
    typeof user.email === 'string' &&
    typeof user.displayName === 'string' &&
    (user.role === 'technician' || user.role === 'supervisor' || user.role === 'manager')
  );
}

export async function loadMobileUserProfile(): Promise<AuthenticatedUserResponse | null> {
  const profile = await apiGet<AuthenticatedUserResponse>('/api/mobile/me');

  return isActiveUserResponse(profile) ? profile : null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const sessionState = authClient.useSession();
  const [profile, setProfile] = useState<AuthenticatedUserResponse | null>(null);
  const [isResolvingProfile, setIsResolvingProfile] = useState(true);
  const sessionData = sessionState.data;
  const session = isMobileAuthSession(sessionData) ? sessionData : null;

  useEffect(() => {
    let isMounted = true;

    async function resolveProfile(): Promise<void> {
      if (sessionState.isPending) {
        return;
      }

      if (!session) {
        setProfile(null);
        setIsResolvingProfile(false);
        return;
      }

      setIsResolvingProfile(true);

      try {
        const nextProfile = await loadMobileUserProfile();

        if (!nextProfile) {
          await authClient.signOut();

          if (isMounted) {
            setProfile(null);
          }
          return;
        }

        if (isMounted) {
          setProfile(nextProfile);
        }
      } catch {
        await authClient.signOut();

        if (isMounted) {
          setProfile(null);
        }
      } finally {
        if (isMounted) {
          setIsResolvingProfile(false);
        }
      }
    }

    void resolveProfile();

    return () => {
      isMounted = false;
    };
  }, [session, sessionState.isPending]);

  const value = useMemo<AuthContextValue>(
    () => ({
      currentUser: session && profile ? { profile, session } : null,
      ready: !sessionState.isPending && !isResolvingProfile,
    }),
    [isResolvingProfile, profile, session, sessionState.isPending],
  );

  return createElement(AuthContext.Provider, { value }, children);
}

function useAuthContext(): AuthContextValue {
  const value = useContext(AuthContext);

  if (!value) {
    throw new Error('useAuthContext must be used inside AuthProvider');
  }

  return value;
}

export function useCurrentUser(): CurrentMobileUser | null {
  return useAuthContext().currentUser;
}

export function useAuthReady(): boolean {
  return useAuthContext().ready;
}

export async function signOut(): Promise<void> {
  await authClient.signOut();
}
