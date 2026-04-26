import test from "node:test";
import assert from "node:assert/strict";
import { parseServerEnv } from "../lib/env/server-schema.ts";

const baseEnv: NodeJS.ProcessEnv = {
  AUTH_SESSION_SECRET: "a".repeat(32),
  FIREBASE_ADMIN_CLIENT_EMAIL: "firebase-admin@example.iam.gserviceaccount.com",
  FIREBASE_ADMIN_PRIVATE_KEY: "-----BEGIN PRIVATE KEY-----\\nkey\\n-----END PRIVATE KEY-----\\n",
  FIREBASE_ADMIN_PROJECT_ID: "mawqi3-demo",
  NODE_ENV: "development",
  SESSION_MAX_AGE_SECONDS: "3600",
};

test("parseServerEnv parses numeric session age", () => {
  const env = parseServerEnv(baseEnv);

  assert.equal(env.SESSION_MAX_AGE_SECONDS, 3600);
});

test("parseServerEnv requires a strong auth session secret", () => {
  assert.throws(
    () => parseServerEnv({ ...baseEnv, AUTH_SESSION_SECRET: "short" }),
    /AUTH_SESSION_SECRET/,
  );
});

test("parseServerEnv requires https base URL in production", () => {
  assert.throws(
    () => parseServerEnv({ ...baseEnv, NODE_ENV: "production", NEXT_PUBLIC_BASE_URL: "http://example.com" }),
    /https/,
  );
  assert.doesNotThrow(() =>
    parseServerEnv({ ...baseEnv, NODE_ENV: "production", NEXT_PUBLIC_BASE_URL: "https://example.com" }),
  );
});
