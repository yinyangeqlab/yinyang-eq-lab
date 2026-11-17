CREATE TABLE `preference_exports` (
	`id` text PRIMARY KEY NOT NULL,
	`target_id` text NOT NULL,
	`target_name` text NOT NULL,
	`target_creator` text NOT NULL,
	`measurement_name` text,
	`export_kind` text NOT NULL,
	`format` text NOT NULL,
	`filename` text NOT NULL,
	`contents` text NOT NULL,
	`settings` text NOT NULL,
	`curve` text NOT NULL,
	`bands` integer,
	`method` text,
	`priority` text,
	`preamp` real,
	`rms` real,
	`filters` text,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `preference_exports_created_idx` ON `preference_exports` (`created_at`);