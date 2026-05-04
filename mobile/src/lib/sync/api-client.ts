// Typed API client for mobile-to-web sync with Better Auth cookie authentication.
import Constants from 'expo-constants';
import { Platform } from 'react-native';

import { WebBaseUrl } from '@/constants/theme';
import { readAuthCookieHeader } from '@/lib/auth-client';
import type { MobileWebSessionResponse } from '@/lib/sync/types';

type ApiMethod = 'DELETE' | 'GET' | 'PATCH' | 'POST' | 'PUT';

export interface ApiClientOptions<TBody = unknown> {
  authenticated?: boolean;
  authRequiredMessage?: string;
  body?: TBody;
  fallbackErrorMessage?: string;
  headers?: Record<string, string>;
  method?: ApiMethod;
  networkErrorMessage?: string;
}

export class ApiClientError extends Error {
  code: string;
  status: number;

  constructor(message: string, status: number, code = 'api_error') {
    super(message);
    this.name = 'ApiClientError';
    this.status = status;
    this.code = code;
  }
}

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, '');
}

function normalizePath(path: string): string {
  return path.startsWith('/') ? path : `/${path}`;
}

function isFormData(value: unknown): value is FormData {
  return typeof FormData !== 'undefined' && value instanceof FormData;
}

async function readResponseBody(response: Response): Promise<unknown> {
  const text = await response.text();

  if (!text) {
    return undefined;
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

const defaultFallbackErrorMessage = 'Could not complete the request. Check your connection and try again.';
const defaultAuthRequiredMessage = 'Sign in before syncing data.';
const defaultNetworkErrorMessage = 'Could not reach the server. Check your connection and try again.';
const androidEmulatorHost = '10.0.2.2';
const arabicTextPattern = /[\u0600-\u06FF]/u;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function stringProperty(value: unknown, key: string): string | null {
  if (!isRecord(value)) {
    return null;
  }

  const property = value[key];

  return typeof property === 'string' && property.trim().length > 0 ? property : null;
}

function isLoopbackHost(hostname: string): boolean {
  const normalized = hostname.toLowerCase();

  return normalized === 'localhost' || normalized === '127.0.0.1' || normalized === '::1' || normalized === '[::1]';
}

function hostFromUri(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }

  try {
    const url = new URL(value.includes('://') ? value : `http://${value}`);

    return url.hostname || null;
  } catch {
    return null;
  }
}

function getExpoDevelopmentHost(): string | null {
  const hostCandidates = [
    Constants.expoConfig?.hostUri,
    stringProperty(Constants.manifest, 'hostUri'),
    stringProperty(Constants.manifest, 'debuggerHost'),
  ];

  for (const candidate of hostCandidates) {
    const host = hostFromUri(candidate);

    if (host && !isLoopbackHost(host)) {
      return host;
    }
  }

  return null;
}

function resolveReachableBaseUrl(baseUrl: string): string {
  try {
    const url = new URL(baseUrl);

    if (Platform.OS === 'web' || !isLoopbackHost(url.hostname)) {
      return trimTrailingSlash(url.toString());
    }

    const developmentHost = getExpoDevelopmentHost();

    if (developmentHost) {
      url.hostname = developmentHost;
      return trimTrailingSlash(url.toString());
    }

    if (Platform.OS === 'android') {
      url.hostname = androidEmulatorHost;
      return trimTrailingSlash(url.toString());
    }

    return trimTrailingSlash(url.toString());
  } catch {
    return trimTrailingSlash(baseUrl);
  }
}

function errorMessageFromBody(body: unknown, fallbackMessage: string): string {
  if (typeof body === 'object' && body !== null && 'message' in body && typeof body.message === 'string') {
    if (arabicTextPattern.test(body.message) && !arabicTextPattern.test(fallbackMessage)) {
      return fallbackMessage;
    }

    return body.message;
  }

  return fallbackMessage;
}

function errorCodeFromBody(body: unknown): string {
  if (typeof body === 'object' && body !== null && 'code' in body && typeof body.code === 'string') {
    return body.code;
  }

  return 'api_error';
}

export async function getApiBaseUrl(): Promise<string> {
  return resolveReachableBaseUrl(WebBaseUrl);
}

export async function setApiBaseUrl(_baseUrl: string): Promise<void> {
  return undefined;
}

async function buildHeaders(headers: Record<string, string>, authenticated: boolean, authRequiredMessage: string): Promise<Headers> {
  const requestHeaders = new Headers(headers);

  if (authenticated) {
    const cookie = await readAuthCookieHeader();

    if (!cookie) {
      throw new ApiClientError(authRequiredMessage, 401, 'auth_required');
    }

    requestHeaders.set('Cookie', cookie);
  }

  return requestHeaders;
}

async function sendRequest<TBody>(path: string, options: ApiClientOptions<TBody>): Promise<{ body: unknown; response: Response }> {
  const baseUrl = await getApiBaseUrl();
  const method = options.method ?? 'GET';
  const hasBody = options.body !== undefined;
  const headers = await buildHeaders(
    options.headers ?? {},
    options.authenticated ?? true,
    options.authRequiredMessage ?? options.fallbackErrorMessage ?? defaultAuthRequiredMessage,
  );
  let body: BodyInit | undefined;

  if (hasBody && isFormData(options.body)) {
    body = options.body;
  } else if (hasBody) {
    headers.set('Content-Type', 'application/json');
    body = JSON.stringify(options.body);
  }

  let response: Response;

  try {
    response = await fetch(`${baseUrl}${normalizePath(path)}`, {
      body,
      headers,
      method,
    });
  } catch {
    throw new ApiClientError(options.networkErrorMessage ?? options.fallbackErrorMessage ?? defaultNetworkErrorMessage, 0, 'NETWORK_ERROR');
  }

  const responseBody = await readResponseBody(response);

  return { body: responseBody, response };
}

export async function apiRequest<TResponse, TBody = unknown>(
  path: string,
  options: ApiClientOptions<TBody> = {},
): Promise<TResponse> {
  const result = await sendRequest(path, options);

  if (!result.response.ok) {
    throw new ApiClientError(
      errorMessageFromBody(result.body, options.fallbackErrorMessage ?? defaultFallbackErrorMessage),
      result.response.status,
      errorCodeFromBody(result.body),
    );
  }

  return result.body as TResponse;
}

export function apiGet<TResponse>(path: string, options: Omit<ApiClientOptions, 'body' | 'method'> = {}): Promise<TResponse> {
  return apiRequest<TResponse>(path, { ...options, method: 'GET' });
}

export function apiPost<TResponse, TBody = unknown>(
  path: string,
  body: TBody,
  options: Omit<ApiClientOptions<TBody>, 'body' | 'method'> = {},
): Promise<TResponse> {
  return apiRequest<TResponse, TBody>(path, { ...options, body, method: 'POST' });
}

export function apiPatch<TResponse, TBody = unknown>(
  path: string,
  body: TBody,
  options: Omit<ApiClientOptions<TBody>, 'body' | 'method'> = {},
): Promise<TResponse> {
  return apiRequest<TResponse, TBody>(path, { ...options, body, method: 'PATCH' });
}

export function createMobileWebSession(options: Omit<ApiClientOptions, 'body' | 'method'> = {}): Promise<MobileWebSessionResponse> {
  return apiRequest<MobileWebSessionResponse>('/api/mobile/web-session', { ...options, method: 'POST' });
}
