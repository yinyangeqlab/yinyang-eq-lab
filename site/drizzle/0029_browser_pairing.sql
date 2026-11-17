CREATE TABLE `browser_pairings` (
	`code_hash` text PRIMARY KEY NOT NULL,
	`invite_id` text NOT NULL,
	`source_hash` text NOT NULL,
	`claim_hash` text,
	`confirmation` text,
	`state` text DEFAULT 'waiting' NOT NULL,
	`created_at` integer NOT NULL,
	`expires_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `browser_pairings_claim_hash_unique` ON `browser_pairings` (`claim_hash`);--> statement-breakpoint
CREATE INDEX `browser_pairings_invite_idx` ON `browser_pairings` (`invite_id`);--> statement-breakpoint
CREATE TABLE `private_tester_devices` (
	`session_hash` text PRIMARY KEY NOT NULL,
	`invite_id` text NOT NULL,
	`data_token_hash` text NOT NULL,
	`created_at` integer NOT NULL,
	`expires_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `tester_devices_invite_idx` ON `private_tester_devices` (`invite_id`);