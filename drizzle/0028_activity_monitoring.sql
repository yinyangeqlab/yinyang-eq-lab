CREATE TABLE `activity_events` (
	`id` text PRIMARY KEY NOT NULL,
	`subject_id` text NOT NULL,
	`session_id` text NOT NULL,
	`event_type` text NOT NULL,
	`route` text NOT NULL,
	`shootout_tab` text,
	`test_mode` text,
	`test_active` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `activity_events_subject_created_idx` ON `activity_events` (`subject_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `activity_events_session_created_idx` ON `activity_events` (`session_id`,`created_at`);--> statement-breakpoint
ALTER TABLE `privacy_accounts` ADD `activity_monitoring_enabled` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `privacy_accounts` ADD `activity_monitoring_version` text;--> statement-breakpoint
ALTER TABLE `privacy_accounts` ADD `activity_monitoring_agreed_at` integer;--> statement-breakpoint
ALTER TABLE `privacy_accounts` ADD `activity_monitoring_withdrawn_at` integer;