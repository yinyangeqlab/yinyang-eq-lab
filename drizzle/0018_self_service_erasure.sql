CREATE TABLE privacy_accounts (subject_id TEXT PRIMARY KEY NOT NULL, submissions_enabled INTEGER NOT NULL DEFAULT 0, share_music INTEGER NOT NULL DEFAULT 0);
--> statement-breakpoint
CREATE TABLE privacy_sessions (token_hash TEXT PRIMARY KEY NOT NULL, subject_id TEXT NOT NULL, expires_at INTEGER NOT NULL);
--> statement-breakpoint
CREATE TABLE submission_owners (record_kind TEXT NOT NULL, record_id TEXT NOT NULL, subject_id TEXT NOT NULL, session_hash TEXT NOT NULL, PRIMARY KEY(record_kind, record_id));
--> statement-breakpoint
CREATE INDEX submission_owner_subject_idx ON submission_owners(subject_id);
--> statement-breakpoint
CREATE TABLE privacy_erasure_scope (record_kind TEXT NOT NULL, record_id TEXT NOT NULL, PRIMARY KEY(record_kind, record_id));
--> statement-breakpoint
CREATE TRIGGER ownership_session_guard BEFORE INSERT ON submission_owners
WHEN NOT EXISTS (SELECT 1 FROM privacy_sessions WHERE token_hash=NEW.session_hash AND subject_id=NEW.subject_id AND expires_at > unixepoch()*1000)
OR EXISTS (SELECT 1 FROM submission_owners WHERE record_kind=NEW.record_kind AND record_id=NEW.record_id AND subject_id != NEW.subject_id)
BEGIN SELECT RAISE(ABORT, 'Data session expired'); END;
--> statement-breakpoint
CREATE TRIGGER ownership_update_guard BEFORE UPDATE ON submission_owners
WHEN OLD.subject_id != NEW.subject_id OR NOT EXISTS (SELECT 1 FROM privacy_sessions WHERE token_hash=NEW.session_hash AND subject_id=NEW.subject_id AND expires_at > unixepoch()*1000)
BEGIN SELECT RAISE(ABORT, 'Ownership cannot be transferred'); END;
--> statement-breakpoint
DROP TRIGGER moderation_no_delete;
--> statement-breakpoint
CREATE TRIGGER moderation_no_delete BEFORE DELETE ON moderation_events
WHEN NOT EXISTS (SELECT 1 FROM privacy_erasure_scope WHERE record_kind=OLD.record_kind AND record_id=OLD.record_id)
BEGIN SELECT RAISE(ABORT, 'Review history can only be deleted during privacy erasure'); END;
--> statement-breakpoint
CREATE TRIGGER moderation_record_guard BEFORE INSERT ON moderation_events
WHEN NOT (
 (NEW.record_kind='vote' AND EXISTS(SELECT 1 FROM votes WHERE id=NEW.record_id)) OR
 (NEW.record_kind='open' AND EXISTS(SELECT 1 FROM comparison_choices WHERE id=NEW.record_id)) OR
 (NEW.record_kind='run' AND EXISTS(SELECT 1 FROM listening_runs WHERE id=NEW.record_id)) OR
 (NEW.record_kind='feedback' AND EXISTS(SELECT 1 FROM feedback_submissions WHERE id=NEW.record_id)) OR
 (NEW.record_kind='measurement' AND EXISTS(SELECT 1 FROM research_measurements WHERE id=NEW.record_id)) OR
 (NEW.record_kind='export' AND EXISTS(SELECT 1 FROM preference_exports WHERE id=NEW.record_id)))
BEGIN SELECT RAISE(ABORT, 'Submission no longer exists'); END;
