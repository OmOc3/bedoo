import { defineConfig } from "drizzle-kit";
import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());

const databaseUrl = process.env.DATABASE_URL ?? "file:./data/ecopest.db";
const isHostedLibsql = databaseUrl.startsWith("libsql://") || databaseUrl.startsWith("turso://");

export default defineConfig(
  isHostedLibsql
    ? {
        schema: "./lib/db/schema.ts",
        out: "./drizzle",
        dialect: "turso",
        dbCredentials: {
          url: databaseUrl,
          authToken: process.env.DATABASE_AUTH_TOKEN,
        },
      }
    : {
        schema: "./lib/db/schema.ts",
        out: "./drizzle",
        dialect: "sqlite",
        dbCredentials: {
          url: databaseUrl,
        },
      },
);
