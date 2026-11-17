CREATE TABLE archive_studies (
 id TEXT PRIMARY KEY NOT NULL,
 target_a TEXT NOT NULL,
 target_b TEXT NOT NULL,
 mode TEXT NOT NULL CONSTRAINT archive_study_mode CHECK(mode IN ('blind','bring')),
 headphone_type TEXT NOT NULL CONSTRAINT archive_study_headphone CHECK(headphone_type IN ('ie','oe')),
 start_at INTEGER NOT NULL,
 end_at INTEGER NOT NULL CONSTRAINT archive_study_window CHECK(end_at>start_at),
 notice_version TEXT NOT NULL,
 methodology TEXT NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX archive_studies_query_unique ON archive_studies(target_a,target_b,mode,headphone_type,start_at,end_at);
--> statement-breakpoint
CREATE TABLE archive_releases (
 sequence INTEGER PRIMARY KEY NOT NULL CONSTRAINT archive_release_nonnegative CHECK(sequence>=0),
 study_id TEXT NOT NULL CONSTRAINT archive_releases_study_id_unique UNIQUE REFERENCES archive_studies(id),
 payload TEXT NOT NULL CONSTRAINT archive_release_json CHECK(json_valid(payload))
);
--> statement-breakpoint
CREATE TRIGGER archive_release_sequence BEFORE INSERT ON archive_releases WHEN NEW.sequence != COALESCE((SELECT MAX(sequence)+1 FROM archive_releases),0) BEGIN SELECT RAISE(ABORT,'Archive ledger must be contiguous'); END;
--> statement-breakpoint
CREATE TRIGGER archive_studies_no_update BEFORE UPDATE ON archive_studies BEGIN SELECT RAISE(ABORT,'Archive plans and release ledger are immutable'); END;
--> statement-breakpoint
CREATE TRIGGER archive_studies_no_delete BEFORE DELETE ON archive_studies BEGIN SELECT RAISE(ABORT,'Archive plans and release ledger are immutable'); END;
--> statement-breakpoint
CREATE TRIGGER archive_releases_no_update BEFORE UPDATE ON archive_releases BEGIN SELECT RAISE(ABORT,'Archive plans and release ledger are immutable'); END;
--> statement-breakpoint
CREATE TRIGGER archive_releases_no_delete BEFORE DELETE ON archive_releases BEGIN SELECT RAISE(ABORT,'Archive plans and release ledger are immutable'); END;
--> statement-breakpoint
DROP TRIGGER ownership_session_guard;
--> statement-breakpoint
CREATE TRIGGER ownership_session_guard BEFORE INSERT ON submission_owners
WHEN NOT EXISTS (
 SELECT 1 FROM privacy_sessions s JOIN privacy_accounts a ON a.subject_id=s.subject_id
 WHERE s.token_hash=NEW.session_hash AND s.subject_id=NEW.subject_id AND s.expires_at>unixepoch()*1000
 AND a.submissions_enabled=1 AND a.agreement_version='2026-10-18-v7'
) OR EXISTS (SELECT 1 FROM submission_owners WHERE record_kind=NEW.record_kind AND record_id=NEW.record_id AND subject_id != NEW.subject_id)
BEGIN SELECT RAISE(ABORT, 'Active participation agreement required'); END;
