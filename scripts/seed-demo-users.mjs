import { randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { FieldValue, Timestamp, getFirestore } from "firebase-admin/firestore";

function loadEnvFile(filePath) {
  try {
    const content = readFileSync(filePath, "utf8");

    for (const line of content.split(/\r?\n/)) {
      const trimmed = line.trim();

      if (!trimmed || trimmed.startsWith("#")) {
        continue;
      }

      const separatorIndex = trimmed.indexOf("=");

      if (separatorIndex === -1) {
        continue;
      }

      const key = trimmed.slice(0, separatorIndex).trim();
      let value = trimmed.slice(separatorIndex + 1).trim();

      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }

      if (!process.env[key]) {
        process.env[key] = value;
      }
    }
  } catch (_error) {
    return;
  }
}

loadEnvFile(resolve(process.cwd(), ".env.local"));

if (process.env.ALLOW_DEMO_SEED !== "true") {
  throw new Error("Refusing to seed demo users. Set ALLOW_DEMO_SEED=true explicitly.");
}

if (process.env.NODE_ENV === "production") {
  throw new Error("Refusing to seed demo users when NODE_ENV=production.");
}

for (const key of ["FIREBASE_ADMIN_PROJECT_ID", "FIREBASE_ADMIN_CLIENT_EMAIL", "FIREBASE_ADMIN_PRIVATE_KEY"]) {
  if (!process.env[key]) {
    throw new Error(`Missing environment variable: ${key}`);
  }
}

const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
const looksProductionLike = /prod|production|live/i.test(projectId);

if (looksProductionLike && process.env.ALLOW_PRODUCTION_LIKE_DEMO_SEED !== "true") {
  throw new Error(
    `Refusing to seed demo users into production-like Firebase project "${projectId}". Set ALLOW_PRODUCTION_LIKE_DEMO_SEED=true only for a deliberate non-production demo restore.`,
  );
}

process.stdout.write(`Target Firebase project: ${projectId}\n`);
process.stdout.write("Demo user passwords are generated randomly and printed once below.\n");

const app =
  getApps()[0] ??
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
      clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY.replace(/\\n/g, "\n"),
    }),
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  });

const auth = getAuth(app);
const db = getFirestore(app);
const users = [
  {
    displayName: "مدير موقعي",
    email: "manager@mawqi3.example.com",
    role: "manager",
  },
  {
    displayName: "مشرف موقعي",
    email: "supervisor@mawqi3.example.com",
    role: "supervisor",
  },
  {
    displayName: "فني موقعي 1",
    email: "technician1@mawqi3.example.com",
    role: "technician",
  },
  {
    displayName: "فني موقعي 2",
    email: "technician2@mawqi3.example.com",
    role: "technician",
  },
];

function generateDemoPassword() {
  return `${randomBytes(18).toString("base64url")}Aa1!`;
}

for (const user of users) {
  let authUser;
  const password = generateDemoPassword();

  try {
    authUser = await auth.getUserByEmail(user.email);
    await auth.updateUser(authUser.uid, {
      displayName: user.displayName,
      disabled: false,
      password,
    });
  } catch (error) {
    if (error?.code !== "auth/user-not-found") {
      throw error;
    }

    authUser = await auth.createUser({
      email: user.email,
      password,
      displayName: user.displayName,
      emailVerified: true,
      disabled: false,
    });
  }

  const docRef = db.collection("users").doc(authUser.uid);
  const snapshot = await docRef.get();
  const existingCreatedAt = snapshot.exists ? snapshot.data()?.createdAt ?? Timestamp.now() : FieldValue.serverTimestamp();

  await docRef.set(
    {
      uid: authUser.uid,
      email: user.email,
      displayName: user.displayName,
      role: user.role,
      createdAt: existingCreatedAt,
      isActive: true,
      updatedAt: FieldValue.serverTimestamp(),
      updatedBy: "system-seed",
    },
    { merge: true },
  );

  process.stdout.write(`seeded ${user.role}: ${user.email} (${authUser.uid}) password=${password}\n`);
}
