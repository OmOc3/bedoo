import "server-only";

import { expo } from "@better-auth/expo";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { bearer, admin } from "better-auth/plugins";
import { defaultRoles } from "better-auth/plugins/admin/access";
import { nextCookies } from "better-auth/next-js";
import { db } from "@/lib/db/client";
import * as schema from "@/lib/db/schema";
import { getSessionMaxAgeSeconds } from "@/lib/auth/session-config";

function getAuthSecret(): string {
  return process.env.BETTER_AUTH_SECRET || process.env.AUTH_SESSION_SECRET || "development-only-better-auth-secret-32";
}

function getBaseUrl(): string | undefined {
  if (process.env.BETTER_AUTH_URL) {
    return process.env.BETTER_AUTH_URL;
  }

  if (process.env.NEXT_PUBLIC_BASE_URL) {
    return process.env.NEXT_PUBLIC_BASE_URL;
  }

  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }

  return undefined;
}

function trustedOrigins(): string[] {
  const origins = ["ecopest://", "ecopest://*"];

  if (process.env.NODE_ENV !== "production") {
    origins.push("exp://", "exp://**", "http://localhost:3000", "http://localhost:3001", "http://localhost:3002");
  }

  const baseUrl = getBaseUrl();

  if (baseUrl) {
    origins.push(baseUrl);
  }

  return origins;
}

const appRoles = {
  technician: defaultRoles.user,
  supervisor: defaultRoles.user,
  manager: defaultRoles.admin,
};

export const auth = betterAuth({
  appName: "EcoPest",
  baseURL: getBaseUrl(),
  secret: getAuthSecret(),
  database: drizzleAdapter(db, {
    provider: "sqlite",
    schema,
    transaction: true,
  }),
  emailAndPassword: {
    enabled: true,
    disableSignUp: true,
    minPasswordLength: 8,
    maxPasswordLength: 32,
  },
  session: {
    expiresIn: getSessionMaxAgeSeconds(),
    updateAge: 24 * 60 * 60,
  },
  trustedOrigins: trustedOrigins(),
  advanced: {
    database: {
      generateId: () => crypto.randomUUID(),
    },
  },
  plugins: [
    admin({
      defaultRole: "technician",
      adminRoles: ["manager"],
      roles: appRoles,
    }),
    bearer(),
    expo(),
    nextCookies(),
  ],
});

export type BetterAuthSession = typeof auth.$Infer.Session;
