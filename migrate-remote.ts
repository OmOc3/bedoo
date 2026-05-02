import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";
import nextEnv from "@next/env";

const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd());

async function runMigrate() {
  try {
    console.log("Running migrations...");
    const url = process.env.DATABASE_URL;
    const authToken = process.env.DATABASE_AUTH_TOKEN;
    if (!url) throw new Error("No URL");
    const client = createClient({ url, authToken });
    const db = drizzle(client);
    await migrate(db, { migrationsFolder: "./drizzle" });
    console.log("Migrations complete!");
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  }
}

runMigrate();
