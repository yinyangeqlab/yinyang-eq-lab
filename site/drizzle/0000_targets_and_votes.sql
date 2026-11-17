CREATE TABLE `targets` (
  `id` text PRIMARY KEY NOT NULL,
  `name` text NOT NULL,
  `creator` text NOT NULL,
  `description` text DEFAULT '' NOT NULL,
  `points` text NOT NULL,
  `rating` real DEFAULT 1500 NOT NULL,
  `wins` integer DEFAULT 0 NOT NULL,
  `losses` integer DEFAULT 0 NOT NULL,
  `created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `votes` (
  `id` text PRIMARY KEY NOT NULL,
  `winner_id` text NOT NULL,
  `loser_id` text NOT NULL,
  `voter_id` text NOT NULL,
  `created_at` integer NOT NULL,
  `song_title` text,
  `song_artist` text,
  `song_album` text,
  `recording_id` text,
  `sha256` text,
  `intervals` text,
  `heard_a` real,
  `heard_b` real,
  `overlap_seconds` real,
  `audio_format` text,
  `sample_rate` integer,
  `bitrate` integer,
  `duration` real
);
--> statement-breakpoint
CREATE INDEX `votes_voter_id_idx` ON `votes` (`voter_id`);
--> statement-breakpoint
CREATE TABLE `suggestions` (
  `id` text PRIMARY KEY NOT NULL,
  `title` text NOT NULL,
  `artist` text NOT NULL,
  `note` text DEFAULT '' NOT NULL,
  `created_at` integer NOT NULL
);
