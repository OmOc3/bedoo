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

  const tables = await client.execute({
    sql: "select count(*) as c from sqlite_master where type = 'table'",
    args: [],
  });
  const firstRow = tables.rows[0];
  const count =
    firstRow && typeof firstRow === "object"
      ? (firstRow.c ?? firstRow.C ?? Object.values(firstRow)[0])
      : "?";
  console.log("table count:", count);

  const appSettings = await client.execute({
    sql: "select name from sqlite_master where type = 'table' and name = 'app_settings' limit 1",
    args: [],
  });
  if (appSettings.rows.length > 0) {
    const columns = await client.execute({ sql: "pragma table_info('app_settings')", args: [] });
    console.log(
      "app_settings columns:",
      columns.rows.map((r) => (r && typeof r === "object" ? r.name ?? r.NAME : null)).filter(Boolean),
    );
  } else {
    console.log("app_settings: (table not present — run migrations if expected)");
  }
} finally {
  client.close();
}
