CREATE TABLE `technician_work_schedules` (
	`schedule_id` text PRIMARY KEY NOT NULL,
	`technician_uid` text NOT NULL,
	`work_days` text DEFAULT '0,1,2,3,4,5,6' NOT NULL,
	`shift_start_time` text DEFAULT '08:00' NOT NULL,
	`shift_end_time` text DEFAULT '17:00' NOT NULL,
	`expected_duration_minutes` integer DEFAULT 480 NOT NULL,
	`hourly_rate` real,
	`is_active` integer DEFAULT true NOT NULL,
	`notes` text,
	`created_at` integer NOT NULL,
	`updated_at` integer,
	`created_by` text NOT NULL,
	`updated_by` text,
	FOREIGN KEY (`technician_uid`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `tech_work_schedules_technician_uid_idx` ON `technician_work_schedules` (`technician_uid`);--> statement-breakpoint
CREATE INDEX `tech_work_schedules_is_active_idx` ON `technician_work_schedules` (`is_active`);--> statement-breakpoint
ALTER TABLE `technician_shifts` ADD `schedule_id` text REFERENCES technician_work_schedules(schedule_id);--> statement-breakpoint
ALTER TABLE `technician_shifts` ADD `start_station_id` text;--> statement-breakpoint
ALTER TABLE `technician_shifts` ADD `start_station_label` text;--> statement-breakpoint
ALTER TABLE `technician_shifts` ADD `end_station_id` text;--> statement-breakpoint
ALTER TABLE `technician_shifts` ADD `end_station_label` text;--> statement-breakpoint
ALTER TABLE `technician_shifts` ADD `total_minutes` integer;--> statement-breakpoint
ALTER TABLE `technician_shifts` ADD `expected_duration_minutes` integer;--> statement-breakpoint
ALTER TABLE `technician_shifts` ADD `early_exit` integer DEFAULT false NOT NULL;--> statement-breakpoint
CREATE INDEX `technician_shifts_salary_status_idx` ON `technician_shifts` (`salary_status`);