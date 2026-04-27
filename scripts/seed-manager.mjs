import { randomUUID } from "node:crypto";
import { mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import nextEnv from "@next/env";
const { loadEnvConfig } = nextEnv;
import { createClient } from "@libsql/client";
import { hashPassword } from "better-auth/crypto";

const projectDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");

loadEnvConfig(projectDir);

function readRequiredEnv(name) {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`${name} is required.`);
  }

  return value;
}

async function ensureLocalDatabaseDirectory(databaseUrl) {
  if (!databaseUrl.startsWith("file:")) {
    return;
  }

  const filePath = databaseUrl.slice("file:".length);
  const absolutePath = filePath.startsWith("/") ? filePath : resolve(projectDir, filePath);

  await mkdir(dirname(absolutePath), { recursive: true });
}

async function upsertCredentialAccount(client, userId, passwordHash, now) {
  const existingAccount = await client.execute({
    sql: "select id from account where user_id = ? and provider_id = 'credential' limit 1",
    args: [userId],
  });

  if (existingAccount.rows[0]) {
    await client.execute({
      sql: "update account set password = ?, updated_at = ? where id = ?",
      args: [passwordHash, now, existingAccount.rows[0].id],
    });
    return;
  }

  await client.execute({
    sql: [
      "insert into account",
      "(id, account_id, provider_id, user_id, password, created_at, updated_at)",
      "values (?, ?, 'credential', ?, ?, ?, ?)",
    ].join(" "),
    args: [randomUUID(), userId, userId, passwordHash, now, now],
  });
}

const databaseUrl = process.env.DATABASE_URL || "file:./data/ecopest.db";
const email = readRequiredEnv("SEED_MANAGER_EMAIL").toLowerCase();
const password = readRequiredEnv("SEED_MANAGER_PASSWORD");
const name = process.env.SEED_MANAGER_NAME?.trim() || "مدير النظام";
const now = Date.now();

await ensureLocalDatabaseDirectory(databaseUrl);

const client = createClient({
  url: databaseUrl,
  authToken: process.env.DATABASE_AUTH_TOKEN,
});

const passwordHash = await hashPassword(password);
const existingUser = await client.execute({
  sql: "select id from user where lower(email) = lower(?) limit 1",
  args: [email],
});

let userId = existingUser.rows[0]?.id;

if (typeof userId === "string") {
  await client.execute({
    sql: "update user set name = ?, role = 'manager', banned = 0, updated_at = ? where id = ?",
    args: [name, now, userId],
  });
} else {
  userId = randomUUID();
  await client.execute({
    sql: [
      "insert into user",
      "(id, name, email, email_verified, created_at, updated_at, role, banned)",
      "values (?, ?, ?, 1, ?, ?, 'manager', 0)",
    ].join(" "),
    args: [userId, name, email, now, now],
  });
}

await upsertCredentialAccount(client, userId, passwordHash, now);
client.close();

console.warn(`Seeded manager account: ${email}`);
