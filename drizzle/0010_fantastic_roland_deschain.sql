CREATE TABLE `app_settings` (
	`setting_id` text PRIMARY KEY NOT NULL,
	`maintenance_mode_enabled` integer DEFAULT false NOT NULL,
	`client_daily_order_limit` integer DEFAULT 5 NOT NULL,
	`maintenance_message` text,
	`updated_at` integer,
	`updated_by` text
);
--> statement-breakpoint
CREATE TABLE `technician_shifts` (
	`shift_id` text PRIMARY KEY NOT NULL,
	`technician_uid` text NOT NULL,
	`technician_name` text NOT NULL,
	`started_at` integer NOT NULL,
	`start_lat` real,
	`start_lng` real,
	`ended_at` integer,
	`end_lat` real,
	`end_lng` real,
	`status` text DEFAULT 'active' NOT NULL,
	`total_hours` real,
	`base_salary` real,
	`salary_amount` real,
	`salary_status` text DEFAULT 'pending' NOT NULL,
	`notes` text,
	`created_at` integer NOT NULL,
	`updated_at` integer,
	FOREIGN KEY (`technician_uid`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE INDEX `technician_shifts_technician_uid_idx` ON `technician_shifts` (`technician_uid`);--> statement-breakpoint
CREATE INDEX `technician_shifts_started_at_idx` ON `technician_shifts` (`started_at`);--> statement-breakpoint
CREATE INDEX `technician_shifts_status_idx` ON `technician_shifts` (`status`);--> statement-breakpoint
ALTER TABLE `attendance_sessions` ADD `shift_id` text REFERENCES technician_shifts(shift_id);