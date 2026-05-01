CREATE TABLE `app_settings` (
  `setting_id` text PRIMARY KEY NOT NULL,
  `maintenance_mode_enabled` integer DEFAULT 0 NOT NULL,
  `maintenance_message` text,
  `client_daily_order_limit` integer DEFAULT 5 NOT NULL,
  `updated_at` integer,
  `updated_by` text
);

