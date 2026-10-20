-- Private daily totals only: no requester or erased-record linkage.
CREATE TABLE deletion_daily_totals (
 day TEXT NOT NULL,
 record_kind TEXT NOT NULL CONSTRAINT deletion_totals_kind CHECK(record_kind IN ('vote','open','run','feedback','measurement','export','target','suggestion','trial','music','measurement_file_chunk','admin_note')),
 deleted_count INTEGER NOT NULL CONSTRAINT deletion_totals_positive CHECK(deleted_count > 0),
 PRIMARY KEY(day,record_kind)
);
--> statement-breakpoint
DROP TRIGGER ownership_session_guard;
--> statement-breakpoint
CREATE TRIGGER ownership_session_guard BEFORE INSERT ON submission_owners
WHEN NOT EXISTS (
 SELECT 1 FROM privacy_sessions s JOIN privacy_accounts a ON a.subject_id=s.subject_id
 WHERE s.token_hash=NEW.session_hash AND s.subject_id=NEW.subject_id AND s.expires_at>unixepoch()*1000
 AND a.submissions_enabled=1 AND a.agreement_version='2026-10-18-v4'
) OR EXISTS (SELECT 1 FROM submission_owners WHERE record_kind=NEW.record_kind AND record_id=NEW.record_id AND subject_id != NEW.subject_id)
BEGIN SELECT RAISE(ABORT, 'Active participation agreement required'); END;
