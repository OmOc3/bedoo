/* eslint-disable no-console */
import { createClient } from "@libsql/client";
import nextEnv from "@next/env";

const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd());

const url = process.env.DATABASE_URL;
const authToken = process.env.DATABASE_AUTH_TOKEN;

if (!url) {
  throw new Error("DATABASE_URL is missing");
}

console.log("DB URL:", url);

const client = createClient({ url, authToken });

try {
  await client.execute({ sql: "select 1 as x", args: [] });
  console.log("select ok");

  const createSql =
    "create table if not exists app_settings (id text primary key not null, maintenance_enabled integer not null default 0, client_daily_station_order_limit integer not null default 0, updated_at integer, updated_by text)";

  await client.execute({ sql: createSql, args: [] });
  console.log("create table ok");

  const result = await client.execute({
    sql: "select name from sqlite_master where type = 'table' and name = 'app_settings'",
    args: [],
  });
  console.log("sqlite_master check:", result.rows);

  const columns = await client.execute({ sql: "pragma table_info('app_settings')", args: [] });
  console.log("app_settings columns:", columns.rows);

  await client.execute({
    sql: "insert into app_settings (id, maintenance_enabled, client_daily_station_order_limit) values ('global', 0, 0) on conflict(id) do update set maintenance_enabled=excluded.maintenance_enabled",
    args: [],
  });
  console.log("upsert ok");
} finally {
  client.close();
}

