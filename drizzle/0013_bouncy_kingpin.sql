CREATE TABLE `music_votes` (
	`user_id` text NOT NULL,
	`track_url` text NOT NULL,
	`choice` text NOT NULL,
	`user_email` text NOT NULL,
	`user_name` text NOT NULL,
	`updated_at` integer NOT NULL,
	PRIMARY KEY(`user_id`, `track_url`)
);
--> statement-breakpoint
CREATE INDEX `music_votes_track_idx` ON `music_votes` (`track_url`);