CREATE TABLE `account` (
	`id` text PRIMARY KEY NOT NULL,
	`account_id` text NOT NULL,
	`provider_id` text NOT NULL,
	`user_id` text NOT NULL,
	`access_token` text,
	`refresh_token` text,
	`id_token` text,
	`access_token_expires_at` integer,
	`refresh_token_expires_at` integer,
	`scope` text,
	`password` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `account_user_id_idx` ON `account` (`user_id`);--> statement-breakpoint
CREATE INDEX `account_provider_account_idx` ON `account` (`provider_id`,`account_id`);--> statement-breakpoint
CREATE TABLE `audit_logs` (
	`log_id` text PRIMARY KEY NOT NULL,
	`actor_uid` text NOT NULL,
	`actor_role` text NOT NULL,
	`action` text NOT NULL,
	`entity_type` text NOT NULL,
	`entity_id` text NOT NULL,
	`created_at` integer NOT NULL,
	`metadata` text
);
--> statement-breakpoint
CREATE INDEX `audit_logs_created_at_idx` ON `audit_logs` (`created_at`);--> statement-breakpoint
CREATE INDEX `audit_logs_action_idx` ON `audit_logs` (`action`);--> statement-breakpoint
CREATE INDEX `audit_logs_actor_uid_idx` ON `audit_logs` (`actor_uid`);--> statement-breakpoint
CREATE INDEX `audit_logs_entity_idx` ON `audit_logs` (`entity_type`,`entity_id`);--> statement-breakpoint
CREATE TABLE `login_rate_limit` (
	`key` text PRIMARY KEY NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL,
	`window_start_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`locked_until` integer
);
--> statement-breakpoint
CREATE TABLE `mobile_web_sessions` (
	`token_hash` text PRIMARY KEY NOT NULL,
	`uid` text NOT NULL,
	`role` text NOT NULL,
	`redirect_to` text NOT NULL,
	`cookie_header` text NOT NULL,
	`created_at` integer NOT NULL,
	`expires_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `rateLimit` (
	`key` text PRIMARY KEY NOT NULL,
	`count` integer NOT NULL,
	`last_request` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `report_statuses` (
	`report_id` text NOT NULL,
	`status` text NOT NULL,
	FOREIGN KEY (`report_id`) REFERENCES `reports`(`report_id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `report_statuses_report_id_idx` ON `report_statuses` (`report_id`);--> statement-breakpoint
CREATE INDEX `report_statuses_status_idx` ON `report_statuses` (`status`);--> statement-breakpoint
CREATE TABLE `reports` (
	`report_id` text PRIMARY KEY NOT NULL,
	`station_id` text NOT NULL,
	`station_label` text NOT NULL,
	`technician_uid` text NOT NULL,
	`technician_name` text NOT NULL,
	`client_report_id` text,
	`notes` text,
	`photo_paths` text,
	`submitted_at` integer NOT NULL,
	`review_status` text DEFAULT 'pending' NOT NULL,
	`edited_at` integer,
	`edited_by` text,
	`reviewed_at` integer,
	`reviewed_by` text,
	`review_notes` text,
	FOREIGN KEY (`station_id`) REFERENCES `stations`(`station_id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE INDEX `reports_station_id_idx` ON `reports` (`station_id`);--> statement-breakpoint
CREATE INDEX `reports_technician_uid_idx` ON `reports` (`technician_uid`);--> statement-breakpoint
CREATE INDEX `reports_review_status_idx` ON `reports` (`review_status`);--> statement-breakpoint
CREATE INDEX `reports_submitted_at_idx` ON `reports` (`submitted_at`);--> statement-breakpoint
CREATE UNIQUE INDEX `reports_client_report_id_unique` ON `reports` (`technician_uid`,`client_report_id`);--> statement-breakpoint
CREATE TABLE `session` (
	`id` text PRIMARY KEY NOT NULL,
	`token` text NOT NULL,
	`user_id` text NOT NULL,
	`expires_at` integer NOT NULL,
	`ip_address` text,
	`user_agent` text,
	`impersonated_by` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `session_token_unique` ON `session` (`token`);--> statement-breakpoint
CREATE INDEX `session_user_id_idx` ON `session` (`user_id`);--> statement-breakpoint
CREATE TABLE `stations` (
	`station_id` text PRIMARY KEY NOT NULL,
	`label` text NOT NULL,
	`location` text NOT NULL,
	`zone` text,
	`lat` real,
	`lng` real,
	`qr_code_value` text NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`total_reports` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	`created_by` text NOT NULL,
	`updated_at` integer,
	`updated_by` text,
	`last_visited_at` integer
);
--> statement-breakpoint
CREATE INDEX `stations_created_at_idx` ON `stations` (`created_at`);--> statement-breakpoint
CREATE INDEX `stations_active_idx` ON `stations` (`is_active`);--> statement-breakpoint
CREATE INDEX `stations_zone_idx` ON `stations` (`zone`);--> statement-breakpoint
CREATE TABLE `user` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`email_verified` integer DEFAULT true NOT NULL,
	`image` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`role` text DEFAULT 'technician' NOT NULL,
	`banned` integer DEFAULT false NOT NULL,
	`ban_reason` text,
	`ban_expires` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `user_email_unique` ON `user` (`email`);--> statement-breakpoint
CREATE INDEX `user_role_idx` ON `user` (`role`);--> statement-breakpoint
CREATE TABLE `verification` (
	`id` text PRIMARY KEY NOT NULL,
	`identifier` text NOT NULL,
	`value` text NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `verification_identifier_idx` ON `verification` (`identifier`);