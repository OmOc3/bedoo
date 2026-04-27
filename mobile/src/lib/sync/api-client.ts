// Typed API client for mobile-to-web sync with Better Auth cookie authentication.
import AsyncStorage from '@react-native-async-storage/async-storage';

import { WebBaseUrl } from '@/constants/theme';
import { readAuthCookieHeader } from '@/lib/auth-client';

type ApiMethod = 'DELETE' | 'GET' | 'PATCH' | 'POST' | 'PUT';

export interface ApiClientOptions<TBody = unknown> {
  authenticated?: boolean;
  body?: TBody;
  headers?: Record<string, string>;
  method?: ApiMethod;
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

const apiBaseUrlStorageKey = 'ecopest-api-base-url';

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

function errorMessageFromBody(body: unknown): string {
  if (typeof body === 'object' && body !== null && 'message' in body && typeof body.message === 'string') {
    return body.message;
  }

  return 'تعذر إكمال الطلب. تحقق من الاتصال وحاول مرة أخرى.';
}

function errorCodeFromBody(body: unknown): string {
  if (typeof body === 'object' && body !== null && 'code' in body && typeof body.code === 'string') {
    return body.code;
  }

  return 'api_error';
}

export async function getApiBaseUrl(): Promise<string> {
  const storedBaseUrl = await AsyncStorage.getItem(apiBaseUrlStorageKey);

  return trimTrailingSlash(storedBaseUrl || WebBaseUrl);
}

export async function setApiBaseUrl(baseUrl: string): Promise<void> {
  await AsyncStorage.setItem(apiBaseUrlStorageKey, trimTrailingSlash(baseUrl));
}

async function buildHeaders(headers: Record<string, string>, authenticated: boolean): Promise<Headers> {
  const requestHeaders = new Headers(headers);

  if (authenticated) {
    const cookie = await readAuthCookieHeader();

    if (!cookie) {
      throw new ApiClientError('سجل الدخول قبل مزامنة البيانات.', 401, 'auth_required');
    }

    requestHeaders.set('Cookie', cookie);
  }

  return requestHeaders;
}

async function sendRequest<TBody>(path: string, options: ApiClientOptions<TBody>): Promise<{ body: unknown; response: Response }> {
  const baseUrl = await getApiBaseUrl();
  const method = options.method ?? 'GET';
  const hasBody = options.body !== undefined;
  const headers = await buildHeaders(options.headers ?? {}, options.authenticated ?? true);
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
    throw new ApiClientError('تعذر الوصول إلى الخادم. تحقق من الاتصال وحاول مرة أخرى.', 0, 'NETWORK_ERROR');
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
    throw new ApiClientError(errorMessageFromBody(result.body), result.response.status, errorCodeFromBody(result.body));
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
