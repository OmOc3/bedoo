import { createHmac } from "node:crypto";
import {
  CLIENT_SIGNUP_RATE_LIMIT_MAX_ATTEMPTS,
  CLIENT_SIGNUP_RATE_LIMIT_WINDOW_MS,
  LOGIN_RATE_LIMIT_MAX_ATTEMPTS,
  LOGIN_RATE_LIMIT_WINDOW_MS,
} from "@/lib/auth/constants";
import { getAuthSecret } from "@/lib/auth/secrets";
import {
  deleteLoginRateLimitRecord,
  getLoginRateLimitRecord,
  upsertLoginRateLimitRecord,
} from "@/lib/db/repositories";

export interface RateLimitStatus {
  allowed: boolean;
  retryAfterSeconds?: number;
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function createRateLimitKey(email: string, ipAddress: string): string {
  return createHmac("sha256", getAuthSecret()).update(`${normalizeEmail(email)}|${ipAddress}`).digest("hex");
}

function createClientSignupRateLimitKey(email: string, ipAddress: string): string {
  return createHmac("sha256", getAuthSecret())
    .update(`client-signup|${normalizeEmail(email)}|${ipAddress}`)
    .digest("hex");
}

export async function checkLoginRateLimit(email: string, ipAddress: string): Promise<RateLimitStatus> {
  const now = Date.now();
  const record = await getLoginRateLimitRecord(createRateLimitKey(email, ipAddress));

  if (!record) {
    return { allowed: true };
  }

  if (record.lockedUntil && record.lockedUntil > now) {
    return {
      allowed: false,
      retryAfterSeconds: Math.ceil((record.lockedUntil - now) / 1000),
    };
  }

  if (record.windowStartAt + LOGIN_RATE_LIMIT_WINDOW_MS <= now) {
    return { allowed: true };
  }

  if (record.attempts >= LOGIN_RATE_LIMIT_MAX_ATTEMPTS) {
    const retryAfterMs = record.windowStartAt + LOGIN_RATE_LIMIT_WINDOW_MS - now;

    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil(retryAfterMs / 1000)),
    };
  }

  return { allowed: true };
}

export async function recordFailedLogin(email: string, ipAddress: string): Promise<void> {
  const key = createRateLimitKey(email, ipAddress);
  const existing = await getLoginRateLimitRecord(key);
  const now = Date.now();
  const windowExpired = !existing || existing.windowStartAt + LOGIN_RATE_LIMIT_WINDOW_MS <= now;
  const attempts = windowExpired ? 1 : existing.attempts + 1;
  const windowStartAt = windowExpired ? now : existing.windowStartAt;
  const lockedUntil = attempts >= LOGIN_RATE_LIMIT_MAX_ATTEMPTS ? windowStartAt + LOGIN_RATE_LIMIT_WINDOW_MS : undefined;

  await upsertLoginRateLimitRecord({
    key,
    attempts,
    windowStartAt,
    updatedAt: now,
    lockedUntil,
  });
}

export async function resetLoginRateLimit(email: string, ipAddress: string): Promise<void> {
  await deleteLoginRateLimitRecord(createRateLimitKey(email, ipAddress));
}

export async function checkClientSignupRateLimit(email: string, ipAddress: string): Promise<RateLimitStatus> {
  const now = Date.now();
  const normalized = normalizeEmail(email);
  const key = createClientSignupRateLimitKey(normalized.length > 0 ? normalized : `_noemail_${ipAddress}`, ipAddress);
  const record = await getLoginRateLimitRecord(key);

  if (!record) {
    return { allowed: true };
  }

  if (record.lockedUntil && record.lockedUntil > now) {
    return {
      allowed: false,
      retryAfterSeconds: Math.ceil((record.lockedUntil - now) / 1000),
    };
  }

  if (record.windowStartAt + CLIENT_SIGNUP_RATE_LIMIT_WINDOW_MS <= now) {
    return { allowed: true };
  }

  if (record.attempts >= CLIENT_SIGNUP_RATE_LIMIT_MAX_ATTEMPTS) {
    const retryAfterMs = record.windowStartAt + CLIENT_SIGNUP_RATE_LIMIT_WINDOW_MS - now;

    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil(retryAfterMs / 1000)),
    };
  }

  return { allowed: true };
}

export async function recordFailedClientSignupAttempt(email: string, ipAddress: string): Promise<void> {
  const normalized = normalizeEmail(email);
  const key = createClientSignupRateLimitKey(normalized.length > 0 ? normalized : `_noemail_${ipAddress}`, ipAddress);
  const existing = await getLoginRateLimitRecord(key);
  const now = Date.now();
  const windowExpired =
    !existing || existing.windowStartAt + CLIENT_SIGNUP_RATE_LIMIT_WINDOW_MS <= now;
  const attempts = windowExpired ? 1 : existing.attempts + 1;
  const windowStartAt = windowExpired ? now : existing.windowStartAt;
  const lockedUntil =
    attempts >= CLIENT_SIGNUP_RATE_LIMIT_MAX_ATTEMPTS
      ? windowStartAt + CLIENT_SIGNUP_RATE_LIMIT_WINDOW_MS
      : undefined;

  await upsertLoginRateLimitRecord({
    key,
    attempts,
    windowStartAt,
    updatedAt: now,
    lockedUntil,
  });
}

export async function resetClientSignupRateLimit(email: string, ipAddress: string): Promise<void> {
  const normalized = normalizeEmail(email);
  await deleteLoginRateLimitRecord(
    createClientSignupRateLimitKey(normalized.length > 0 ? normalized : `_noemail_${ipAddress}`, ipAddress),
  );
}
