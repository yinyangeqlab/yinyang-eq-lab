CREATE TABLE `listening_runs` (
	`id` text PRIMARY KEY NOT NULL,
	`voter_id` text NOT NULL,
	`test_mode` text NOT NULL,
	`headphone_type` text NOT NULL,
	`target_a_id` text NOT NULL,
	`target_b_id` text NOT NULL,
	`target_a_name` text NOT NULL,
	`target_b_name` text NOT NULL,
	`measurement_id` text,
	`result` text NOT NULL,
	`intervals` text NOT NULL,
	`heard_a` real NOT NULL,
	`heard_b` real NOT NULL,
	`overlap_seconds` real NOT NULL,
	`song_title` text,
	`song_artist` text,
	`song_album` text,
	`recording_id` text,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `listening_runs_voter_created_idx` ON `listening_runs` (`voter_id`,`created_at`);
--> statement-breakpoint
CREATE TABLE `research_measurements` (
	`id` text PRIMARY KEY NOT NULL,
	`contributor_id` text NOT NULL,
	`local_id` text NOT NULL,
	`name` text NOT NULL,
	`device` text NOT NULL,
	`type` text NOT NULL,
	`rig` text NOT NULL,
	`fit` text DEFAULT '' NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	`source` text DEFAULT '' NOT NULL,
	`driver_type` text,
	`nozzle_diameter_mm` real,
	`files` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `research_measurements_contributor_idx` ON `research_measurements` (`contributor_id`);
