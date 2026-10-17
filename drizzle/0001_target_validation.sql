ALTER TABLE targets ADD COLUMN status TEXT NOT NULL DEFAULT 'pending';
--> statement-breakpoint
ALTER TABLE targets ADD COLUMN review_reason TEXT NOT NULL DEFAULT '';
--> statement-breakpoint
ALTER TABLE votes ADD COLUMN eligible INTEGER NOT NULL DEFAULT 0;
--> statement-breakpoint
-- Existing user targets remain pending. Old votes are ineligible.
--> statement-breakpoint
--> statement-breakpoint
--> statement-breakpoint
