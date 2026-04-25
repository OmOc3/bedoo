import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import { getStorage, type Storage } from "firebase-admin/storage";

type AdminEnvKey =
  | "FIREBASE_ADMIN_PROJECT_ID"
  | "FIREBASE_ADMIN_CLIENT_EMAIL"
  | "FIREBASE_ADMIN_PRIVATE_KEY";

function assertServerOnly(): void {
  if (typeof window !== "undefined") {
    throw new Error("Firebase Admin SDK cannot be used on the client.");
  }
}

function getAdminEnv(key: AdminEnvKey): string {
  assertServerOnly();
  const value = process.env[key];

  if (!value) {
    throw new Error(`Missing environment variable: ${key}`);
  }

  return value;
}

export function adminApp(): App {
  assertServerOnly();

  if (getApps().length > 0) {
    return getApps()[0];
  }

  return initializeApp({
    credential: cert({
      projectId: getAdminEnv("FIREBASE_ADMIN_PROJECT_ID"),
      clientEmail: getAdminEnv("FIREBASE_ADMIN_CLIENT_EMAIL"),
      privateKey: getAdminEnv("FIREBASE_ADMIN_PRIVATE_KEY").replace(/\\n/g, "\n"),
    }),
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
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
