CREATE TABLE `client_station_import_batches` (
	`batch_id` text PRIMARY KEY NOT NULL,
	`client_uid` text NOT NULL,
	`source_document_id` text,
	`source_name` text NOT NULL,
	`status` text DEFAULT 'applied' NOT NULL,
	`row_count` integer DEFAULT 0 NOT NULL,
	`ready_count` integer DEFAULT 0 NOT NULL,
	`blocked_count` integer DEFAULT 0 NOT NULL,
	`warning_count` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	`created_by` text NOT NULL,
	`applied_at` integer,
	`applied_by` text,
	`summary` text,
	FOREIGN KEY (`client_uid`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`source_document_id`) REFERENCES `client_analysis_documents`(`document_id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `client_station_import_batches_client_uid_idx` ON `client_station_import_batches` (`client_uid`);--> statement-breakpoint
CREATE INDEX `client_station_import_batches_status_idx` ON `client_station_import_batches` (`status`);--> statement-breakpoint
CREATE INDEX `client_station_import_batches_created_at_idx` ON `client_station_import_batches` (`created_at`);--> statement-breakpoint
CREATE TABLE `client_station_import_rows` (
	`row_id` text PRIMARY KEY NOT NULL,
	`batch_id` text NOT NULL,
	`row_number` integer NOT NULL,
	`client_uid` text NOT NULL,
	`source_file` text NOT NULL,
	`source_release_date` text,
	`zone` text,
	`station_type` text NOT NULL,
	`external_code` text,
	`label` text NOT NULL,
	`location` text NOT NULL,
	`description` text,
	`installation_status` text NOT NULL,
	`notes` text,
	`lat` real,
	`lng` real,
	`source_document_id` text,
	`duplicate_station_id` text,
	`station_id` text,
	`status` text NOT NULL,
	`issues` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`batch_id`) REFERENCES `client_station_import_batches`(`batch_id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`station_id`) REFERENCES `stations`(`station_id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `client_station_import_rows_batch_id_idx` ON `client_station_import_rows` (`batch_id`);--> statement-breakpoint
CREATE INDEX `client_station_import_rows_status_idx` ON `client_station_import_rows` (`status`);--> statement-breakpoint
CREATE INDEX `client_station_import_rows_station_id_idx` ON `client_station_import_rows` (`station_id`);--> statement-breakpoint
ALTER TABLE `client_analysis_documents` ADD `document_category` text DEFAULT 'import_source' NOT NULL;--> statement-breakpoint
CREATE INDEX `client_analysis_documents_category_idx` ON `client_analysis_documents` (`document_category`);--> statement-breakpoint
ALTER TABLE `stations` ADD `station_type` text DEFAULT 'bait_station' NOT NULL;--> statement-breakpoint
ALTER TABLE `stations` ADD `external_code` text;--> statement-breakpoint
ALTER TABLE `stations` ADD `installation_status` text DEFAULT 'installed' NOT NULL;--> statement-breakpoint
ALTER TABLE `stations` ADD `verified_at` integer;--> statement-breakpoint
ALTER TABLE `stations` ADD `verified_by` text;--> statement-breakpoint
ALTER TABLE `stations` ADD `source_document_id` text REFERENCES client_analysis_documents(document_id);--> statement-breakpoint
CREATE INDEX `stations_type_idx` ON `stations` (`station_type`);--> statement-breakpoint
CREATE INDEX `stations_external_code_idx` ON `stations` (`external_code`);--> statement-breakpoint
CREATE INDEX `stations_installation_status_idx` ON `stations` (`installation_status`);--> statement-breakpoint
CREATE INDEX `stations_source_document_idx` ON `stations` (`source_document_id`);