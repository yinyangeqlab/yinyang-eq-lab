ALTER TABLE privacy_accounts ADD COLUMN agreement_version TEXT;
--> statement-breakpoint
ALTER TABLE privacy_accounts ADD COLUMN agreed_at INTEGER;
--> statement-breakpoint
ALTER TABLE privacy_accounts ADD COLUMN withdrawn_at INTEGER;
--> statement-breakpoint
DROP TRIGGER ownership_session_guard;
--> statement-breakpoint
CREATE TRIGGER ownership_session_guard BEFORE INSERT ON submission_owners
WHEN NOT EXISTS (
 SELECT 1 FROM privacy_sessions s JOIN privacy_accounts a ON a.subject_id=s.subject_id
 WHERE s.token_hash=NEW.session_hash AND s.subject_id=NEW.subject_id AND s.expires_at>unixepoch()*1000
 AND a.submissions_enabled=1 AND a.agreement_version='2026-10-18-v3'
) OR EXISTS (SELECT 1 FROM submission_owners WHERE record_kind=NEW.record_kind AND record_id=NEW.record_id AND subject_id != NEW.subject_id)
BEGIN SELECT RAISE(ABORT, 'Active participation agreement required'); END;
