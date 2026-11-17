CREATE TABLE moderation_events (
 sequence INTEGER PRIMARY KEY AUTOINCREMENT,
 record_kind TEXT NOT NULL CHECK(record_kind IN ('vote','open','run','feedback','measurement','export')),
 record_id TEXT NOT NULL,
 action TEXT NOT NULL CHECK(action IN ('remove','restore')),
 reason TEXT NOT NULL CHECK(length(trim(reason)) BETWEEN 3 AND 1000),
 actor TEXT NOT NULL,
 created_at INTEGER NOT NULL
);
--> statement-breakpoint
CREATE INDEX moderation_record_idx ON moderation_events(record_kind, record_id, sequence);
--> statement-breakpoint
CREATE TRIGGER moderation_no_update BEFORE UPDATE ON moderation_events BEGIN SELECT RAISE(ABORT, 'Review history is append only'); END;
--> statement-breakpoint
CREATE TRIGGER moderation_no_delete BEFORE DELETE ON moderation_events BEGIN SELECT RAISE(ABORT, 'Review history is append only'); END;
