CREATE TABLE `app_settings` (
  `id` text PRIMARY KEY NOT NULL,
  `maintenance_enabled` integer DEFAULT false NOT NULL,
  `client_daily_station_order_limit` integer DEFAULT 0 NOT NULL,
  `updated_at` integer,
  `updated_by` text
);

