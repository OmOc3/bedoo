import "server-only";

import { db } from "@/lib/db/client";

interface ColumnDefinition {
  name: string;
  sql: string;
}

let ensureRuntimeSchemaPromise: Promise<void> | null = null;

function quoteSqlIdentifier(identifier: string): string {
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(identifier)) {
    throw new Error(`Invalid SQL identifier: ${identifier}`);
  }

  return `"${identifier}"`;
}

function columnNameFromPragmaRow(row: unknown): string | null {
  if (!row || typeof row !== "object" || !("name" in row)) {
    return null;
  }

  const value = row.name;

  return typeof value === "string" ? value : null;
}

function columnNotNullFromPragmaRow(row: unknown): boolean {
  if (!row || typeof row !== "object" || !("notnull" in row)) {
    return false;
  }

  const value = row.notnull;

  return value === true || value === 1 || value === "1";
}

async function tableExists(table: string): Promise<boolean> {
  const result = await db.$client.execute({
    sql: "SELECT name FROM sqlite_master WHERE type = 'table' AND name = ? LIMIT 1",
    args: [table],
  });

  return result.rows.length > 0;
}

async function existingColumns(table: string): Promise<Set<string>> {
  const tableInfo = await db.$client.execute({
    sql: `PRAGMA table_info(${quoteSqlIdentifier(table)})`,
    args: [],
  });

  return new Set(tableInfo.rows.map(columnNameFromPragmaRow).filter((name): name is string => Boolean(name)));
}

async function addMissingColumns(table: string, columns: ColumnDefinition[]): Promise<void> {
  if (!(await tableExists(table))) {
    return;
  }

  const columnsInTable = await existingColumns(table);

  for (const column of columns) {
    if (columnsInTable.has(column.name)) {
      continue;
    }

    await db.$client.execute({ sql: column.sql, args: [] });
    columnsInTable.add(column.name);
  }
}

async function execute(sql: string): Promise<void> {
  await db.$client.execute({ sql, args: [] });
}

async function createClientOrdersTable(): Promise<void> {
  await execute(`
    CREATE TABLE IF NOT EXISTS client_orders (
      order_id text PRIMARY KEY NOT NULL,
      client_uid text NOT NULL REFERENCES user(id) ON DELETE restrict,
      client_name text NOT NULL,
      station_id text REFERENCES stations(station_id) ON DELETE restrict,
      station_label text NOT NULL,
      proposal_location text,
      proposal_description text,
      proposal_lat real,
      proposal_lng real,
      note text,
      photo_url text,
      status text DEFAULT 'pending' NOT NULL,
      created_at integer NOT NULL,
      reviewed_at integer,
      reviewed_by text,
      decision_note text
    )
  `);
}

async function rebuildLegacyClientOrdersTable(): Promise<void> {
  if (!(await tableExists("client_orders"))) {
    return;
  }

  const tableInfo = await db.$client.execute({
    sql: "PRAGMA table_info(\"client_orders\")",
    args: [],
  });
  const columnsInTable = new Set(tableInfo.rows.map(columnNameFromPragmaRow).filter((name): name is string => Boolean(name)));
  const stationIdColumn = tableInfo.rows.find((row) => columnNameFromPragmaRow(row) === "station_id");
  const expectedColumns = [
    "proposal_location",
    "proposal_description",
    "proposal_lat",
    "proposal_lng",
    "decision_note",
  ];
  const needsRebuild =
    columnNotNullFromPragmaRow(stationIdColumn) ||
    expectedColumns.some((column) => !columnsInTable.has(column));

  if (!needsRebuild) {
    return;
  }

  const sourceOrFallback = (column: string, fallback: string): string =>
    columnsInTable.has(column) ? quoteSqlIdentifier(column) : fallback;

  await execute("PRAGMA foreign_keys = OFF");

  try {
    await execute("DROP TABLE IF EXISTS __new_client_orders");
    await execute(`
      CREATE TABLE __new_client_orders (
        order_id text PRIMARY KEY NOT NULL,
        client_uid text NOT NULL REFERENCES user(id) ON DELETE restrict,
        client_name text NOT NULL,
        station_id text REFERENCES stations(station_id) ON DELETE restrict,
        station_label text NOT NULL,
        proposal_location text,
        proposal_description text,
        proposal_lat real,
        proposal_lng real,
        note text,
        photo_url text,
        status text DEFAULT 'pending' NOT NULL,
        created_at integer NOT NULL,
        reviewed_at integer,
        reviewed_by text,
        decision_note text
      )
    `);
    await execute(`
      INSERT INTO __new_client_orders (
        order_id,
        client_uid,
        client_name,
        station_id,
        station_label,
        proposal_location,
        proposal_description,
        proposal_lat,
        proposal_lng,
        note,
        photo_url,
        status,
        created_at,
        reviewed_at,
        reviewed_by,
        decision_note
      )
      SELECT
        ${sourceOrFallback("order_id", "lower(hex(randomblob(16)))")},
        ${sourceOrFallback("client_uid", "''")},
        ${sourceOrFallback("client_name", "''")},
        ${sourceOrFallback("station_id", "NULL")},
        ${sourceOrFallback("station_label", "''")},
        ${sourceOrFallback("proposal_location", "NULL")},
        ${sourceOrFallback("proposal_description", "NULL")},
        ${sourceOrFallback("proposal_lat", "NULL")},
        ${sourceOrFallback("proposal_lng", "NULL")},
        ${sourceOrFallback("note", "NULL")},
        ${sourceOrFallback("photo_url", "NULL")},
        ${sourceOrFallback("status", "'pending'")},
        ${sourceOrFallback("created_at", "CAST(strftime('%s', 'now') AS INTEGER) * 1000")},
        ${sourceOrFallback("reviewed_at", "NULL")},
        ${sourceOrFallback("reviewed_by", "NULL")},
        ${sourceOrFallback("decision_note", "NULL")}
      FROM client_orders
    `);
    await execute("DROP TABLE client_orders");
    await execute("ALTER TABLE __new_client_orders RENAME TO client_orders");
  } finally {
    await execute("PRAGMA foreign_keys = ON");
  }
}

async function ensureClientOrdersSchema(): Promise<void> {
  await createClientOrdersTable();
  await rebuildLegacyClientOrdersTable();
  await execute("CREATE INDEX IF NOT EXISTS client_orders_client_uid_idx ON client_orders (client_uid)");
  await execute("CREATE INDEX IF NOT EXISTS client_orders_station_id_idx ON client_orders (station_id)");
  await execute("CREATE INDEX IF NOT EXISTS client_orders_status_idx ON client_orders (status)");
  await execute("CREATE INDEX IF NOT EXISTS client_orders_created_at_idx ON client_orders (created_at)");
}

async function createIndexIfColumnsExist(index: string, table: string, columns: string[]): Promise<void> {
  if (!(await tableExists(table))) {
    return;
  }

  const columnsInTable = await existingColumns(table);

  if (!columns.every((column) => columnsInTable.has(column))) {
    return;
  }

  const indexedColumns = columns.map(quoteSqlIdentifier).join(", ");
  await execute(`CREATE INDEX IF NOT EXISTS ${quoteSqlIdentifier(index)} ON ${quoteSqlIdentifier(table)} (${indexedColumns})`);
}

async function rebuildLegacyTechnicianShiftsTable(): Promise<void> {
  if (!(await tableExists("technician_shifts"))) {
    return;
  }

  const columnsInTable = await existingColumns("technician_shifts");

  if (!columnsInTable.has("check_in_at")) {
    return;
  }

  await execute("PRAGMA foreign_keys = OFF");

  try {
    await execute("DROP TABLE IF EXISTS technician_shifts_rebuilt");
    await execute(`
      CREATE TABLE technician_shifts_rebuilt (
        shift_id text PRIMARY KEY NOT NULL,
        technician_uid text NOT NULL REFERENCES user(id) ON DELETE restrict,
        technician_name text NOT NULL,
        schedule_id text REFERENCES technician_work_schedules(schedule_id) ON DELETE set null,
        started_at integer NOT NULL,
        start_lat real,
        start_lng real,
        start_station_id text,
        start_station_label text,
        ended_at integer,
        end_lat real,
        end_lng real,
        end_station_id text,
        end_station_label text,
        status text DEFAULT 'active' NOT NULL,
        total_hours real,
        total_minutes integer,
        expected_duration_minutes integer,
        early_exit integer DEFAULT false NOT NULL,
        base_salary real,
        salary_amount real,
        salary_status text DEFAULT 'pending' NOT NULL,
        notes text,
        created_at integer NOT NULL,
        updated_at integer
      )
    `);
    await execute(`
      INSERT INTO technician_shifts_rebuilt (
        shift_id,
        technician_uid,
        technician_name,
        schedule_id,
        started_at,
        start_lat,
        start_lng,
        start_station_id,
        start_station_label,
        ended_at,
        end_lat,
        end_lng,
        end_station_id,
        end_station_label,
        status,
        total_hours,
        total_minutes,
        expected_duration_minutes,
        early_exit,
        base_salary,
        salary_amount,
        salary_status,
        notes,
        created_at,
        updated_at
      )
      SELECT
        shift_id,
        technician_uid,
        technician_name,
        schedule_id,
        COALESCE(started_at, check_in_at),
        COALESCE(start_lat, check_in_lat),
        COALESCE(start_lng, check_in_lng),
        start_station_id,
        start_station_label,
        COALESCE(ended_at, check_out_at),
        COALESCE(end_lat, check_out_lat),
        COALESCE(end_lng, check_out_lng),
        end_station_id,
        end_station_label,
        CASE
          WHEN COALESCE(ended_at, check_out_at) IS NOT NULL THEN 'completed'
          ELSE COALESCE(status, 'active')
        END,
        total_hours,
        COALESCE(
          total_minutes,
          CASE
            WHEN COALESCE(ended_at, check_out_at) IS NOT NULL
              THEN CAST(ROUND((COALESCE(ended_at, check_out_at) - COALESCE(started_at, check_in_at)) / 60000.0) AS INTEGER)
            ELSE NULL
          END
        ),
        expected_duration_minutes,
        COALESCE(early_exit, false),
        base_salary,
        salary_amount,
        COALESCE(salary_status, 'pending'),
        notes,
        COALESCE(created_at, started_at, check_in_at, CAST(strftime('%s', 'now') AS INTEGER) * 1000),
        updated_at
      FROM technician_shifts
    `);
    await execute("DROP TABLE technician_shifts");
    await execute("ALTER TABLE technician_shifts_rebuilt RENAME TO technician_shifts");
  } finally {
    await execute("PRAGMA foreign_keys = ON");
  }
}

export async function ensureAuthUserColumns(): Promise<void> {
  await addMissingColumns("user", [
    { name: "password_changed_at", sql: "ALTER TABLE `user` ADD `password_changed_at` integer" },
    { name: "deactivated_at", sql: "ALTER TABLE `user` ADD `deactivated_at` integer" },
    { name: "deactivated_by", sql: "ALTER TABLE `user` ADD `deactivated_by` text" },
    { name: "reactivated_at", sql: "ALTER TABLE `user` ADD `reactivated_at` integer" },
    { name: "reactivated_by", sql: "ALTER TABLE `user` ADD `reactivated_by` text" },
  ]);
}

async function ensureRuntimeSchemaInternal(): Promise<void> {
  await ensureAuthUserColumns();

  await addMissingColumns("app_settings", [
    { name: "support_phone", sql: "ALTER TABLE `app_settings` ADD `support_phone` text" },
    { name: "support_email", sql: "ALTER TABLE `app_settings` ADD `support_email` text" },
    { name: "support_hours", sql: "ALTER TABLE `app_settings` ADD `support_hours` text" },
  ]);

  await addMissingColumns("reports", [
    { name: "station_location", sql: "ALTER TABLE `reports` ADD `station_location` text" },
    { name: "pest_types", sql: "ALTER TABLE `reports` ADD `pest_types` text" },
  ]);

  await ensureClientOrdersSchema();

  await execute(`
    CREATE TABLE IF NOT EXISTS client_profiles (
      client_uid text PRIMARY KEY NOT NULL REFERENCES user(id) ON DELETE cascade,
      phone text,
      addresses text,
      created_at integer NOT NULL,
      updated_at integer
    )
  `);
  await execute("CREATE INDEX IF NOT EXISTS client_profiles_updated_at_idx ON client_profiles (updated_at)");

  await execute(`
    CREATE TABLE IF NOT EXISTS client_signup_devices (
      device_hash text PRIMARY KEY NOT NULL,
      client_uid text REFERENCES user(id) ON DELETE restrict,
      created_at integer NOT NULL
    )
  `);

  await execute(`
    CREATE TABLE IF NOT EXISTS client_station_access (
      access_id text PRIMARY KEY NOT NULL,
      client_uid text NOT NULL REFERENCES user(id) ON DELETE cascade,
      station_id text NOT NULL REFERENCES stations(station_id) ON DELETE cascade,
      created_at integer NOT NULL,
      created_by text NOT NULL
    )
  `);
  await execute("CREATE UNIQUE INDEX IF NOT EXISTS client_station_access_unique ON client_station_access (client_uid, station_id)");
  await execute("CREATE INDEX IF NOT EXISTS client_station_access_client_uid_idx ON client_station_access (client_uid)");
  await execute("CREATE INDEX IF NOT EXISTS client_station_access_station_id_idx ON client_station_access (station_id)");

  await execute(`
    INSERT OR IGNORE INTO client_station_access (access_id, client_uid, station_id, created_at, created_by)
    SELECT 'legacy_' || client_uid || '_' || station_id, client_uid, station_id, min(created_at), client_uid
    FROM client_orders
    WHERE station_id IS NOT NULL AND station_id <> ''
    GROUP BY client_uid, station_id
  `);

  await execute(`
    CREATE TABLE IF NOT EXISTS report_photos (
      photo_id text PRIMARY KEY NOT NULL,
      report_id text NOT NULL REFERENCES reports(report_id) ON DELETE cascade,
      category text NOT NULL,
      url text NOT NULL,
      uploaded_at integer NOT NULL,
      uploaded_by text NOT NULL,
      sort_order integer DEFAULT 0 NOT NULL
    )
  `);
  await execute("CREATE INDEX IF NOT EXISTS report_photos_report_id_idx ON report_photos (report_id)");
  await execute("CREATE INDEX IF NOT EXISTS report_photos_category_idx ON report_photos (category)");
  await execute("CREATE INDEX IF NOT EXISTS report_photos_uploaded_at_idx ON report_photos (uploaded_at)");

  await execute(`
    CREATE TABLE IF NOT EXISTS daily_work_reports (
      daily_report_id text PRIMARY KEY NOT NULL,
      technician_uid text NOT NULL REFERENCES user(id) ON DELETE restrict,
      technician_name text NOT NULL,
      report_date integer NOT NULL,
      summary text NOT NULL,
      notes text,
      created_at integer NOT NULL,
      updated_at integer
    )
  `);
  await execute("CREATE INDEX IF NOT EXISTS daily_work_reports_technician_uid_idx ON daily_work_reports (technician_uid)");
  await execute("CREATE INDEX IF NOT EXISTS daily_work_reports_report_date_idx ON daily_work_reports (report_date)");
  await execute("CREATE INDEX IF NOT EXISTS daily_work_reports_created_at_idx ON daily_work_reports (created_at)");

  await execute(`
    CREATE TABLE IF NOT EXISTS daily_work_report_stations (
      daily_report_id text NOT NULL REFERENCES daily_work_reports(daily_report_id) ON DELETE cascade,
      station_id text NOT NULL REFERENCES stations(station_id) ON DELETE restrict
    )
  `);
  await execute("CREATE UNIQUE INDEX IF NOT EXISTS daily_work_report_stations_unique ON daily_work_report_stations (daily_report_id, station_id)");
  await execute("CREATE INDEX IF NOT EXISTS daily_work_report_stations_report_idx ON daily_work_report_stations (daily_report_id)");
  await execute("CREATE INDEX IF NOT EXISTS daily_work_report_stations_station_idx ON daily_work_report_stations (station_id)");

  await execute(`
    CREATE TABLE IF NOT EXISTS daily_report_photos (
      photo_id text PRIMARY KEY NOT NULL,
      daily_report_id text NOT NULL REFERENCES daily_work_reports(daily_report_id) ON DELETE cascade,
      url text NOT NULL,
      uploaded_at integer NOT NULL,
      uploaded_by text NOT NULL,
      sort_order integer DEFAULT 0 NOT NULL
    )
  `);
  await execute("CREATE INDEX IF NOT EXISTS daily_report_photos_report_idx ON daily_report_photos (daily_report_id)");
  await execute("CREATE INDEX IF NOT EXISTS daily_report_photos_uploaded_at_idx ON daily_report_photos (uploaded_at)");

  await execute(`
    CREATE TABLE IF NOT EXISTS technician_work_schedules (
      schedule_id text PRIMARY KEY NOT NULL,
      technician_uid text NOT NULL REFERENCES user(id) ON DELETE cascade,
      work_days text DEFAULT '0,1,2,3,4,5,6' NOT NULL,
      shift_start_time text DEFAULT '08:00' NOT NULL,
      shift_end_time text DEFAULT '17:00' NOT NULL,
      expected_duration_minutes integer DEFAULT 480 NOT NULL,
      hourly_rate real,
      is_active integer DEFAULT true NOT NULL,
      notes text,
      created_at integer NOT NULL,
      updated_at integer,
      created_by text NOT NULL,
      updated_by text
    )
  `);
  await execute("CREATE INDEX IF NOT EXISTS tech_work_schedules_technician_uid_idx ON technician_work_schedules (technician_uid)");
  await execute("CREATE INDEX IF NOT EXISTS tech_work_schedules_is_active_idx ON technician_work_schedules (is_active)");

  await execute(`
    CREATE TABLE IF NOT EXISTS technician_shifts (
      shift_id text PRIMARY KEY NOT NULL,
      technician_uid text NOT NULL REFERENCES user(id) ON DELETE restrict,
      technician_name text NOT NULL,
      schedule_id text REFERENCES technician_work_schedules(schedule_id) ON DELETE set null,
      started_at integer NOT NULL,
      start_lat real,
      start_lng real,
      start_station_id text,
      start_station_label text,
      ended_at integer,
      end_lat real,
      end_lng real,
      end_station_id text,
      end_station_label text,
      status text DEFAULT 'active' NOT NULL,
      total_hours real,
      total_minutes integer,
      expected_duration_minutes integer,
      early_exit integer DEFAULT false NOT NULL,
      base_salary real,
      salary_amount real,
      salary_status text DEFAULT 'pending' NOT NULL,
      notes text,
      created_at integer NOT NULL,
      updated_at integer
    )
  `);
  await addMissingColumns("technician_shifts", [
    { name: "technician_uid", sql: "ALTER TABLE `technician_shifts` ADD `technician_uid` text REFERENCES user(id)" },
    { name: "technician_name", sql: "ALTER TABLE `technician_shifts` ADD `technician_name` text" },
    { name: "schedule_id", sql: "ALTER TABLE `technician_shifts` ADD `schedule_id` text REFERENCES technician_work_schedules(schedule_id)" },
    { name: "started_at", sql: "ALTER TABLE `technician_shifts` ADD `started_at` integer" },
    { name: "start_lat", sql: "ALTER TABLE `technician_shifts` ADD `start_lat` real" },
    { name: "start_lng", sql: "ALTER TABLE `technician_shifts` ADD `start_lng` real" },
    { name: "start_station_id", sql: "ALTER TABLE `technician_shifts` ADD `start_station_id` text" },
    { name: "start_station_label", sql: "ALTER TABLE `technician_shifts` ADD `start_station_label` text" },
    { name: "ended_at", sql: "ALTER TABLE `technician_shifts` ADD `ended_at` integer" },
    { name: "end_lat", sql: "ALTER TABLE `technician_shifts` ADD `end_lat` real" },
    { name: "end_lng", sql: "ALTER TABLE `technician_shifts` ADD `end_lng` real" },
    { name: "end_station_id", sql: "ALTER TABLE `technician_shifts` ADD `end_station_id` text" },
    { name: "end_station_label", sql: "ALTER TABLE `technician_shifts` ADD `end_station_label` text" },
    { name: "status", sql: "ALTER TABLE `technician_shifts` ADD `status` text DEFAULT 'active' NOT NULL" },
    { name: "total_hours", sql: "ALTER TABLE `technician_shifts` ADD `total_hours` real" },
    { name: "total_minutes", sql: "ALTER TABLE `technician_shifts` ADD `total_minutes` integer" },
    { name: "expected_duration_minutes", sql: "ALTER TABLE `technician_shifts` ADD `expected_duration_minutes` integer" },
    { name: "early_exit", sql: "ALTER TABLE `technician_shifts` ADD `early_exit` integer DEFAULT false NOT NULL" },
    { name: "base_salary", sql: "ALTER TABLE `technician_shifts` ADD `base_salary` real" },
    { name: "salary_amount", sql: "ALTER TABLE `technician_shifts` ADD `salary_amount` real" },
    { name: "salary_status", sql: "ALTER TABLE `technician_shifts` ADD `salary_status` text DEFAULT 'pending' NOT NULL" },
    { name: "notes", sql: "ALTER TABLE `technician_shifts` ADD `notes` text" },
    { name: "created_at", sql: "ALTER TABLE `technician_shifts` ADD `created_at` integer" },
    { name: "updated_at", sql: "ALTER TABLE `technician_shifts` ADD `updated_at` integer" },
  ]);
  await rebuildLegacyTechnicianShiftsTable();
  await createIndexIfColumnsExist("technician_shifts_technician_uid_idx", "technician_shifts", ["technician_uid"]);
  await createIndexIfColumnsExist("technician_shifts_started_at_idx", "technician_shifts", ["started_at"]);
  await createIndexIfColumnsExist("technician_shifts_status_idx", "technician_shifts", ["status"]);
  await createIndexIfColumnsExist("technician_shifts_salary_status_idx", "technician_shifts", ["salary_status"]);

  await addMissingColumns("attendance_sessions", [
    { name: "shift_id", sql: "ALTER TABLE `attendance_sessions` ADD `shift_id` text REFERENCES technician_shifts(shift_id)" },
    { name: "clock_in_lat", sql: "ALTER TABLE `attendance_sessions` ADD `clock_in_lat` real" },
    { name: "clock_in_lng", sql: "ALTER TABLE `attendance_sessions` ADD `clock_in_lng` real" },
    { name: "clock_in_accuracy_meters", sql: "ALTER TABLE `attendance_sessions` ADD `clock_in_accuracy_meters` real" },
    { name: "clock_in_station_id", sql: "ALTER TABLE `attendance_sessions` ADD `clock_in_station_id` text REFERENCES stations(station_id)" },
    { name: "clock_in_station_label", sql: "ALTER TABLE `attendance_sessions` ADD `clock_in_station_label` text" },
    { name: "clock_in_client_uid", sql: "ALTER TABLE `attendance_sessions` ADD `clock_in_client_uid` text REFERENCES user(id)" },
    { name: "clock_in_client_name", sql: "ALTER TABLE `attendance_sessions` ADD `clock_in_client_name` text" },
    { name: "clock_in_distance_meters", sql: "ALTER TABLE `attendance_sessions` ADD `clock_in_distance_meters` real" },
    { name: "clock_out_lat", sql: "ALTER TABLE `attendance_sessions` ADD `clock_out_lat` real" },
    { name: "clock_out_lng", sql: "ALTER TABLE `attendance_sessions` ADD `clock_out_lng` real" },
    { name: "clock_out_accuracy_meters", sql: "ALTER TABLE `attendance_sessions` ADD `clock_out_accuracy_meters` real" },
    { name: "clock_out_station_id", sql: "ALTER TABLE `attendance_sessions` ADD `clock_out_station_id` text REFERENCES stations(station_id)" },
    { name: "clock_out_station_label", sql: "ALTER TABLE `attendance_sessions` ADD `clock_out_station_label` text" },
    { name: "clock_out_client_uid", sql: "ALTER TABLE `attendance_sessions` ADD `clock_out_client_uid` text REFERENCES user(id)" },
    { name: "clock_out_client_name", sql: "ALTER TABLE `attendance_sessions` ADD `clock_out_client_name` text" },
    { name: "clock_out_distance_meters", sql: "ALTER TABLE `attendance_sessions` ADD `clock_out_distance_meters` real" },
  ]);
  await createIndexIfColumnsExist("attendance_sessions_clock_in_client_idx", "attendance_sessions", ["clock_in_client_uid"]);
  await createIndexIfColumnsExist("attendance_sessions_clock_in_station_idx", "attendance_sessions", ["clock_in_station_id"]);
}

export async function ensureRuntimeDatabaseSchema(): Promise<void> {
  ensureRuntimeSchemaPromise ??= ensureRuntimeSchemaInternal().catch((error: unknown) => {
    ensureRuntimeSchemaPromise = null;
    throw error;
  });

  return ensureRuntimeSchemaPromise;
}
