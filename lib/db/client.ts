import "server-only";

import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { createClient, type Client } from "@libsql/client";
import { drizzle, type LibSQLDatabase } from "drizzle-orm/libsql";
import * as schema from "@/lib/db/schema";

type AppDatabase = LibSQLDatabase<typeof schema> & { $client: Client };

declare global {
  var __mawqi3Db: AppDatabase | undefined;
}

export function getDatabaseUrl(): string {
  return process.env.DATABASE_URL || "file:./data/mawqi3.db";
}

function ensureLocalDatabaseDirectory(url: string): void {
  if (!url.startsWith("file:")) {
    return;
  }

  const filePath = url.replace(/^file:/, "");
  const absolutePath = resolve(process.cwd(), filePath);

  mkdirSync(dirname(absolutePath), { recursive: true });
}

function createDatabase(): AppDatabase {
  const url = getDatabaseUrl();

  ensureLocalDatabaseDirectory(url);

  const client = createClient({
    url,
    authToken: process.env.DATABASE_AUTH_TOKEN,
  });

  return drizzle(client, { schema });
}

export const db: AppDatabase = globalThis.__mawqi3Db ?? createDatabase();

if (process.env.NODE_ENV !== "production") {
  globalThis.__mawqi3Db = db;
}
