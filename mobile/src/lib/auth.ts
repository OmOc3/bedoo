import { createContext, createElement, type ReactNode, useContext, useEffect, useMemo, useState } from 'react';

import { clearStoredAuthState, hasStoredAuthCookie, persistAuthCookie, readAuthCookieHeader } from '@/lib/auth-client';
import { getApiBaseUrl } from '@/lib/sync/api-client';
import type { AuthenticatedUserResponse, LoginSuccessResponse } from '@/lib/sync/types';

export interface CurrentMobileUser {
  profile: AuthenticatedUserResponse;
}

interface AuthContextValue {
  currentUser: CurrentMobileUser | null;
  ready: boolean;
}

type AuthListener = (profile: AuthenticatedUserResponse | null) => void;

const AuthContext = createContext<AuthContextValue | null>(null);
const authListeners = new Set<AuthListener>();

function notifyAuthListeners(profile: AuthenticatedUserResponse | null): void {
  authListeners.forEach((listener) => listener(profile));
}

function subscribeAuth(listener: AuthListener): () => void {
  authListeners.add(listener);

  return () => {
    authListeners.delete(listener);
  };
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

async function parseJsonResponse<T>(response: Response): Promise<T | null> {
  const text = await response.text();

  if (!text) {
    return null;
  }

  return JSON.parse(text) as T;
}

export async function loadMobileUserProfile(): Promise<AuthenticatedUserResponse | null> {
  const baseUrl = await getApiBaseUrl();
  const cookie = await readAuthCookieHeader();

  if (!cookie) {
    return null;
  }

  const response = await fetch(`${baseUrl}/api/mobile/me`, {
    headers: {
      Cookie: cookie,
    },
  });

  if (!response.ok) {
    return null;
  }

  const profile = await parseJsonResponse<AuthenticatedUserResponse>(response);

  return isActiveUserResponse(profile) ? profile : null;
}

export async function signInWithPassword(email: string, password: string): Promise<AuthenticatedUserResponse> {
  const baseUrl = await getApiBaseUrl();
  let response: Response;

  try {
    response = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        password,
      }),
    });
  } catch {
    throw new Error('NETWORK_ERROR');
  }

  const payload = await parseJsonResponse<LoginSuccessResponse & { code?: string; message?: string }>(response);

  if (!response.ok) {
    if (response.status === 0) {
      throw new Error('NETWORK_ERROR');
    }

    if (payload?.code === 'AUTH_INVALID_CREDENTIALS') {
      throw new Error('INVALID_CREDENTIALS');
    }

    if (payload?.code === 'AUTH_RATE_LIMITED') {
      throw new Error('NETWORK_ERROR');
    }

    throw new Error(payload?.message || 'INVALID_CREDENTIALS');
  }

  const setCookieHeader = response.headers.get('set-cookie');

  if (!setCookieHeader) {
    throw new Error('AUTH_COOKIE_MISSING');
  }

  await persistAuthCookie(setCookieHeader);

  const profile = await loadMobileUserProfile();

  if (!profile) {
    await clearStoredAuthState();
    throw new Error('PROFILE_LOAD_FAILED');
  }

  notifyAuthListeners(profile);

  return profile;
}

async function clearServerSession(): Promise<void> {
  const cookie = await readAuthCookieHeader();

  if (!cookie) {
    return;
  }

  const baseUrl = await getApiBaseUrl();

  await fetch(`${baseUrl}/api/auth/session`, {
    method: 'DELETE',
    headers: {
      Cookie: cookie,
    },
  }).catch(() => undefined);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<AuthenticatedUserResponse | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const unsubscribe = subscribeAuth((nextProfile) => {
      setProfile(nextProfile);
      setReady(true);
    });

    let isMounted = true;

    async function hydrateAuth(): Promise<void> {
      const hasCookie = await hasStoredAuthCookie();

      if (!hasCookie) {
        if (isMounted) {
          setProfile(null);
          setReady(true);
        }
        return;
      }

      try {
        const nextProfile = await loadMobileUserProfile();

        if (!nextProfile) {
          await clearStoredAuthState();

          if (isMounted) {
            setProfile(null);
          }
          return;
        }

        if (isMounted) {
          setProfile(nextProfile);
        }
      } catch {
        await clearStoredAuthState();

        if (isMounted) {
          setProfile(null);
        }
      } finally {
        if (isMounted) {
          setReady(true);
        }
      }
    }

    void hydrateAuth();

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      currentUser: profile ? { profile } : null,
      ready,
    }),
    [profile, ready],
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
  await clearServerSession();
  await clearStoredAuthState();
  notifyAuthListeners(null);
}
