CREATE TABLE `client_orders` (
	`order_id` text PRIMARY KEY NOT NULL,
	`client_uid` text NOT NULL,
	`client_name` text NOT NULL,
	`station_id` text NOT NULL,
	`station_label` text NOT NULL,
	`note` text,
	`photo_url` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`created_at` integer NOT NULL,
	`reviewed_at` integer,
	`reviewed_by` text,
	FOREIGN KEY (`client_uid`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`station_id`) REFERENCES `stations`(`station_id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE INDEX `client_orders_client_uid_idx` ON `client_orders` (`client_uid`);--> statement-breakpoint
CREATE INDEX `client_orders_station_id_idx` ON `client_orders` (`station_id`);--> statement-breakpoint
CREATE INDEX `client_orders_status_idx` ON `client_orders` (`status`);--> statement-breakpoint
CREATE INDEX `client_orders_created_at_idx` ON `client_orders` (`created_at`);