CREATE TABLE target_removal_requests (
 id TEXT PRIMARY KEY NOT NULL,
 target_id TEXT NOT NULL,
 subject_id TEXT NOT NULL,
 message TEXT NOT NULL DEFAULT '' CHECK(length(message) <= 500),
 status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','done','declined')),
 admin_note TEXT,
 created_at INTEGER NOT NULL,
 resolved_at INTEGER
);
--> statement-breakpoint
CREATE UNIQUE INDEX target_removal_open_idx ON target_removal_requests(target_id) WHERE status = 'pending';
--> statement-breakpoint
CREATE INDEX target_removal_subject_idx ON target_removal_requests(subject_id);
