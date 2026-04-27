import { resolve } from "node:path";
import { loadEnvConfig } from "@next/env";
import { createClient } from "@libsql/client";

loadEnvConfig(resolve("."));

const databaseUrl = process.env.DATABASE_URL || "file:./data/ecopest.db";

const client = createClient({
  url: databaseUrl,
  authToken: process.env.DATABASE_AUTH_TOKEN,
});

await client.execute("delete from login_rate_limit");
await client.execute("delete from rateLimit");
client.close();

console.warn("Cleared login rate limits.");
