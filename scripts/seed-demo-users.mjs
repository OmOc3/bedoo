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

for (const key of ["FIREBASE_ADMIN_PROJECT_ID", "FIREBASE_ADMIN_CLIENT_EMAIL", "FIREBASE_ADMIN_PRIVATE_KEY"]) {
  if (!process.env[key]) {
    throw new Error(`Missing environment variable: ${key}`);
  }
}

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
    displayName: "مدير بيدو",
    email: "manager@bedoo.example.com",
    password: "BedooManager123!",
    role: "manager",
  },
  {
    displayName: "مشرف بيدو",
    email: "supervisor@bedoo.example.com",
    password: "BedooSupervisor123!",
    role: "supervisor",
  },
  {
    displayName: "فني بيدو 1",
    email: "technician1@bedoo.example.com",
    password: "BedooTech123!",
    role: "technician",
  },
  {
    displayName: "فني بيدو 2",
    email: "technician2@bedoo.example.com",
    password: "BedooTech123!",
    role: "technician",
  },
];

for (const user of users) {
  let authUser;

  try {
    authUser = await auth.getUserByEmail(user.email);
    await auth.updateUser(authUser.uid, {
      displayName: user.displayName,
      disabled: false,
      password: user.password,
    });
  } catch (error) {
    if (error?.code !== "auth/user-not-found") {
      throw error;
    }

    authUser = await auth.createUser({
      email: user.email,
      password: user.password,
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

  process.stdout.write(`seeded ${user.role}: ${user.email} (${authUser.uid})\n`);
}
