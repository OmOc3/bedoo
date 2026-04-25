import { createHmac } from "node:crypto";
import type { DocumentData, FirestoreDataConverter, QueryDocumentSnapshot } from "firebase-admin/firestore";
import {
  LOGIN_RATE_LIMIT_COLLECTION,
  LOGIN_RATE_LIMIT_MAX_ATTEMPTS,
  LOGIN_RATE_LIMIT_WINDOW_MS,
} from "@/lib/auth/constants";
import { adminDb } from "@/lib/firebase-admin";

interface AuthRateLimitRecord {
  key: string;
  attempts: number;
  windowStartAt: number;
  updatedAt: number;
  lockedUntil?: number;
}

export interface RateLimitStatus {
  allowed: boolean;
  retryAfterSeconds?: number;
}

const rateLimitConverter: FirestoreDataConverter<AuthRateLimitRecord> = {
  toFirestore(record: AuthRateLimitRecord): DocumentData {
    return record;
  },
  fromFirestore(snapshot: QueryDocumentSnapshot<DocumentData>): AuthRateLimitRecord {
    const data = snapshot.data() as Partial<AuthRateLimitRecord>;

    return {
      key: typeof data.key === "string" ? data.key : snapshot.id,
      attempts: typeof data.attempts === "number" ? data.attempts : 0,
      windowStartAt: typeof data.windowStartAt === "number" ? data.windowStartAt : 0,
      updatedAt: typeof data.updatedAt === "number" ? data.updatedAt : 0,
      lockedUntil: typeof data.lockedUntil === "number" ? data.lockedUntil : undefined,
    };
  },
};

function getRateLimitSecret(): string {
  const secret = process.env.AUTH_SESSION_SECRET;

  if (!secret || secret.length < 32) {
    throw new Error("AUTH_SESSION_SECRET must be at least 32 characters.");
  }

  return secret;
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function createRateLimitKey(email: string, ipAddress: string): string {
  return createHmac("sha256", getRateLimitSecret())
    .update(`${normalizeEmail(email)}|${ipAddress}`)
    .digest("hex");
}

function getRateLimitDoc(email: string, ipAddress: string) {
  const key = createRateLimitKey(email, ipAddress);

  return adminDb().collection(LOGIN_RATE_LIMIT_COLLECTION).doc(key).withConverter(rateLimitConverter);
}

export async function checkLoginRateLimit(email: string, ipAddress: string): Promise<RateLimitStatus> {
  try {
    const now = Date.now();
    const snapshot = await getRateLimitDoc(email, ipAddress).get();

    if (!snapshot.exists) {
      return { allowed: true };
    }

    const record = snapshot.data();

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
  } catch (error: unknown) {
    throw new Error(error instanceof Error ? error.message : "Failed to check login rate limit.");
  }
}

export async function recordFailedLogin(email: string, ipAddress: string): Promise<void> {
  try {
    const docRef = getRateLimitDoc(email, ipAddress);
    const now = Date.now();

    await adminDb().runTransaction(async (transaction) => {
      try {
        const snapshot = await transaction.get(docRef);
        const existing = snapshot.exists ? snapshot.data() : undefined;
        const windowExpired = !existing || existing.windowStartAt + LOGIN_RATE_LIMIT_WINDOW_MS <= now;
        const nextAttempts = windowExpired ? 1 : existing.attempts + 1;
        const nextWindowStartAt = windowExpired ? now : existing.windowStartAt;
        const lockedUntil =
          nextAttempts >= LOGIN_RATE_LIMIT_MAX_ATTEMPTS ? nextWindowStartAt + LOGIN_RATE_LIMIT_WINDOW_MS : undefined;
        const nextRecord: AuthRateLimitRecord = {
          key: docRef.id,
          attempts: nextAttempts,
          windowStartAt: nextWindowStartAt,
          updatedAt: now,
        };

        transaction.set(docRef, lockedUntil ? { ...nextRecord, lockedUntil } : nextRecord);
      } catch (error: unknown) {
        throw new Error(error instanceof Error ? error.message : "Failed to update login rate limit.");
      }
    });
  } catch (error: unknown) {
    throw new Error(error instanceof Error ? error.message : "Failed to record failed login.");
  }
}

export async function resetLoginRateLimit(email: string, ipAddress: string): Promise<void> {
  try {
    await getRateLimitDoc(email, ipAddress).delete();
  } catch (error: unknown) {
    throw new Error(error instanceof Error ? error.message : "Failed to reset login rate limit.");
  }
}
