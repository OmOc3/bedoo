import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getStorage, type FirebaseStorage } from "firebase/storage";

type PublicFirebaseEnvKey =
  | "NEXT_PUBLIC_FIREBASE_API_KEY"
  | "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN"
  | "NEXT_PUBLIC_FIREBASE_PROJECT_ID"
  | "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET"
  | "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID"
  | "NEXT_PUBLIC_FIREBASE_APP_ID";

function getPublicEnv(key: PublicFirebaseEnvKey): string {
  const value = process.env[key];

  if (!value) {
    throw new Error(`Missing environment variable: ${key}`);
  }

  return value;
}

export function getFirebaseApp(): FirebaseApp {
  if (getApps().length > 0) {
    return getApp();
  }

  return initializeApp({
    apiKey: getPublicEnv("NEXT_PUBLIC_FIREBASE_API_KEY"),
    authDomain: getPublicEnv("NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN"),
    projectId: getPublicEnv("NEXT_PUBLIC_FIREBASE_PROJECT_ID"),
    storageBucket: getPublicEnv("NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET"),
    messagingSenderId: getPublicEnv("NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID"),
    appId: getPublicEnv("NEXT_PUBLIC_FIREBASE_APP_ID"),
  });
}

export function getFirebaseAuth(): Auth {
  return getAuth(getFirebaseApp());
}

export function getFirebaseDb(): Firestore {
  return getFirestore(getFirebaseApp());
}

export function getFirebaseStorage(): FirebaseStorage {
  return getStorage(getFirebaseApp());
}
