ALTER TABLE `browser_pairings` ADD `transfer_payload` text;--> statement-breakpoint
ALTER TABLE `browser_pairings` ADD `payload_hash` text;--> statement-breakpoint
ALTER TABLE `browser_pairings` ADD `replacement_accepted` integer DEFAULT 0 NOT NULL;