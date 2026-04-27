import { getCookie, getSetCookie } from '@better-auth/expo/client';
import * as SecureStore from 'expo-secure-store';

const storagePrefix = 'ecopest';
const cookieStorageKey = `${storagePrefix}_cookie`;
const sessionDataStorageKey = `${storagePrefix}_session_data`;
const lastLoginMethodStorageKey = `${storagePrefix}_last_login_method`;

export async function readAuthCookieHeader(): Promise<string> {
  const storedCookie = await SecureStore.getItemAsync(cookieStorageKey);

  return getCookie(storedCookie || '{}');
}

export async function hasStoredAuthCookie(): Promise<boolean> {
  const cookie = await readAuthCookieHeader();

  return cookie.trim().length > 0;
}

export async function persistAuthCookie(setCookieHeader: string): Promise<void> {
  const previousCookie = await SecureStore.getItemAsync(cookieStorageKey);
  const nextCookie = getSetCookie(setCookieHeader, previousCookie || undefined);

  await SecureStore.setItemAsync(cookieStorageKey, nextCookie);
}

export async function clearStoredAuthState(): Promise<void> {
  await Promise.all([
    SecureStore.deleteItemAsync(cookieStorageKey),
    SecureStore.deleteItemAsync(sessionDataStorageKey),
    SecureStore.deleteItemAsync(lastLoginMethodStorageKey),
  ]);
}
