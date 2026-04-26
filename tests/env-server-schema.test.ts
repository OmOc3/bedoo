import test from "node:test";
import assert from "node:assert/strict";
import { parseServerEnv } from "../lib/env/server-schema.ts";

const baseEnv: NodeJS.ProcessEnv = {
  AUTH_ROLE_COOKIE_SECRET: "b".repeat(32),
  AUTH_SESSION_SECRET: "a".repeat(32),
  BETTER_AUTH_SECRET: "c".repeat(32),
  DATABASE_URL: "file:./data/test.db",
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

test("parseServerEnv requires a strong auth role cookie secret", () => {
  assert.throws(
    () => parseServerEnv({ ...baseEnv, AUTH_ROLE_COOKIE_SECRET: "short" }),
    /AUTH_ROLE_COOKIE_SECRET/,
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
