ALTER TABLE `app_settings` ADD `support_phone` text;--> statement-breakpoint
ALTER TABLE `app_settings` ADD `support_email` text;--> statement-breakpoint
ALTER TABLE `app_settings` ADD `support_hours` text;--> statement-breakpoint
CREATE TABLE `client_signup_devices` (
  `device_hash` text PRIMARY KEY NOT NULL,
  `client_uid` text,
  `created_at` integer NOT NULL,
  FOREIGN KEY (`client_uid`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE restrict
);
