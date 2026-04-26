import "server-only";

import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import { getStorage, type Storage } from "firebase-admin/storage";
import { getServerEnv } from "@/lib/env/server";

function assertServerOnly(): void {
  if (typeof window !== "undefined") {
    throw new Error("Firebase Admin SDK cannot be used on the client.");
  }
}

function normalizePrivateKey(privateKey: string): string {
  const normalized = privateKey.replace(/\\n/g, "\n");

  if (
    (normalized.startsWith('"') && normalized.endsWith('"')) ||
    (normalized.startsWith("'") && normalized.endsWith("'"))
  ) {
    return normalized.slice(1, -1);
  }

  return normalized;
}

export function adminApp(): App {
  assertServerOnly();

  if (getApps().length > 0) {
    return getApps()[0];
  }

  const env = getServerEnv();

  return initializeApp({
    credential: cert({
      projectId: env.FIREBASE_ADMIN_PROJECT_ID,
      clientEmail: env.FIREBASE_ADMIN_CLIENT_EMAIL,
      privateKey: normalizePrivateKey(env.FIREBASE_ADMIN_PRIVATE_KEY),
    }),
    storageBucket: env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  });
}

export function adminAuth(): Auth {
  return getAuth(adminApp());
}

export function adminDb(): Firestore {
  return getFirestore(adminApp());
}

export function adminStorage(): Storage {
  return getStorage(adminApp());
}
