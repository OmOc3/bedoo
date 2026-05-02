import "server-only";

import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { createClient, type Client } from "@libsql/client";
import { drizzle, type LibSQLDatabase } from "drizzle-orm/libsql";
import * as schema from "@/lib/db/schema";

type AppDatabase = LibSQLDatabase<typeof schema> & { $client: Client };

declare global {
  var __ecopestDb: AppDatabase | undefined;
}

export function getDatabaseUrl(): string {
  const url = process.env.DATABASE_URL || "file:./data/ecopest.db";
  const isProductionRuntime = process.env.NODE_ENV === "production" && process.env.NEXT_PHASE !== "phase-production-build";

  if (isProductionRuntime && url.startsWith("file:")) {
    throw new Error("DATABASE_URL must use hosted libSQL/Turso in production; file: SQLite is local-only.");
  }

  return url;
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

export function getDb(): AppDatabase {
  if (!globalThis.__ecopestDb) {
    globalThis.__ecopestDb = createDatabase();
  }

  return globalThis.__ecopestDb;
}

export const db: AppDatabase = new Proxy({} as AppDatabase, {
  get(_target, property, receiver) {
    const database = getDb();
    const value = Reflect.get(database, property, receiver);

    return typeof value === "function" ? value.bind(database) : value;
  },
});
