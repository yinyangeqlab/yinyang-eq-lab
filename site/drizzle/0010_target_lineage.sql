ALTER TABLE `targets` ADD COLUMN `curve_kind` text NOT NULL DEFAULT 'original';
--> statement-breakpoint
ALTER TABLE `targets` ADD COLUMN `parent_target_id` text;
