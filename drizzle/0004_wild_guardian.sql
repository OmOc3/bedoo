CREATE TABLE `attendance_sessions` (
	`attendance_id` text PRIMARY KEY NOT NULL,
	`technician_uid` text NOT NULL,
	`technician_name` text NOT NULL,
	`clock_in_at` integer NOT NULL,
	`clock_out_at` integer,
	`notes` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`technician_uid`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE INDEX `attendance_sessions_technician_uid_idx` ON `attendance_sessions` (`technician_uid`);--> statement-breakpoint
CREATE INDEX `attendance_sessions_clock_in_idx` ON `attendance_sessions` (`clock_in_at`);--> statement-breakpoint
CREATE INDEX `attendance_sessions_clock_out_idx` ON `attendance_sessions` (`clock_out_at`);