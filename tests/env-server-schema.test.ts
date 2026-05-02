import test from "node:test";
import assert from "node:assert/strict";
import { parseServerEnv } from "../lib/env/server-schema.ts";

const baseEnv: NodeJS.ProcessEnv = {
  AUTH_ROLE_COOKIE_SECRET: "b".repeat(32),
  AUTH_SESSION_SECRET: "a".repeat(32),
  BETTER_AUTH_SECRET: "c".repeat(32),
  BETTER_AUTH_URL: "https://example.com",
  DATABASE_URL: "file:./data/test.db",
  NODE_ENV: "development",
  NEXT_PUBLIC_BASE_URL: "http://localhost:3000",
  SESSION_MAX_AGE_SECONDS: "3600",
};

const productionEnv: NodeJS.ProcessEnv = {
  ...baseEnv,
  DATABASE_AUTH_TOKEN: "database-token",
  DATABASE_URL: "libsql://ecopest-example.turso.io",
  NEXT_PUBLIC_BASE_URL: "https://example.com",
  NODE_ENV: "production",
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
  assert.doesNotThrow(() => parseServerEnv(productionEnv));
});

test("parseServerEnv rejects local SQLite in production", () => {
  assert.throws(() => parseServerEnv({ ...productionEnv, DATABASE_URL: "file:./data/prod.db" }), /local-only/);
});

test("parseServerEnv requires hosted database token in production", () => {
  assert.throws(() => parseServerEnv({ ...productionEnv, DATABASE_AUTH_TOKEN: "" }), /DATABASE_AUTH_TOKEN/);
});
