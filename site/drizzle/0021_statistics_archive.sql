-- Fixed three-release budget: one immutable annual release in 2026, 2027, 2028.
CREATE TABLE statistics_archive (
 year INTEGER PRIMARY KEY NOT NULL CONSTRAINT archive_supported_year CHECK(year IN (2026,2027,2028)),
 methodology TEXT NOT NULL CONSTRAINT archive_method CHECK(methodology='bounded-geometric-v1'),
 payload TEXT NOT NULL CONSTRAINT archive_payload_json CHECK(json_valid(payload))
);
--> statement-breakpoint
CREATE TRIGGER statistics_archive_no_update BEFORE UPDATE ON statistics_archive BEGIN SELECT RAISE(ABORT,'Archive releases cannot be regenerated'); END;
--> statement-breakpoint
CREATE TRIGGER statistics_archive_no_delete BEFORE DELETE ON statistics_archive BEGIN SELECT RAISE(ABORT,'Archive privacy budget cannot be reset'); END;
--> statement-breakpoint
CREATE TABLE archive_source_revision (id INTEGER PRIMARY KEY NOT NULL CONSTRAINT archive_revision_singleton CHECK(id=1), revision INTEGER NOT NULL);
--> statement-breakpoint
INSERT INTO archive_source_revision VALUES (1,0);
--> statement-breakpoint
CREATE TRIGGER archive_revision_votes_insert AFTER INSERT ON votes BEGIN UPDATE archive_source_revision SET revision=revision+1 WHERE id=1; END;
--> statement-breakpoint
CREATE TRIGGER archive_revision_votes_update AFTER UPDATE ON votes BEGIN UPDATE archive_source_revision SET revision=revision+1 WHERE id=1; END;
--> statement-breakpoint
CREATE TRIGGER archive_revision_votes_delete AFTER DELETE ON votes BEGIN UPDATE archive_source_revision SET revision=revision+1 WHERE id=1; END;
--> statement-breakpoint
CREATE TRIGGER archive_revision_submission_owners_insert AFTER INSERT ON submission_owners BEGIN UPDATE archive_source_revision SET revision=revision+1 WHERE id=1; END;
--> statement-breakpoint
CREATE TRIGGER archive_revision_submission_owners_update AFTER UPDATE ON submission_owners BEGIN UPDATE archive_source_revision SET revision=revision+1 WHERE id=1; END;
--> statement-breakpoint
CREATE TRIGGER archive_revision_submission_owners_delete AFTER DELETE ON submission_owners BEGIN UPDATE archive_source_revision SET revision=revision+1 WHERE id=1; END;
--> statement-breakpoint
CREATE TRIGGER archive_revision_privacy_accounts_insert AFTER INSERT ON privacy_accounts BEGIN UPDATE archive_source_revision SET revision=revision+1 WHERE id=1; END;
--> statement-breakpoint
CREATE TRIGGER archive_revision_privacy_accounts_update AFTER UPDATE ON privacy_accounts BEGIN UPDATE archive_source_revision SET revision=revision+1 WHERE id=1; END;
--> statement-breakpoint
CREATE TRIGGER archive_revision_privacy_accounts_delete AFTER DELETE ON privacy_accounts BEGIN UPDATE archive_source_revision SET revision=revision+1 WHERE id=1; END;
--> statement-breakpoint
CREATE TRIGGER archive_revision_moderation_events_insert AFTER INSERT ON moderation_events BEGIN UPDATE archive_source_revision SET revision=revision+1 WHERE id=1; END;
--> statement-breakpoint
CREATE TRIGGER archive_revision_moderation_events_update AFTER UPDATE ON moderation_events BEGIN UPDATE archive_source_revision SET revision=revision+1 WHERE id=1; END;
--> statement-breakpoint
CREATE TRIGGER archive_revision_moderation_events_delete AFTER DELETE ON moderation_events BEGIN UPDATE archive_source_revision SET revision=revision+1 WHERE id=1; END;
--> statement-breakpoint
DROP TRIGGER ownership_session_guard;
--> statement-breakpoint
CREATE TRIGGER ownership_session_guard BEFORE INSERT ON submission_owners
WHEN NOT EXISTS (
 SELECT 1 FROM privacy_sessions s JOIN privacy_accounts a ON a.subject_id=s.subject_id
 WHERE s.token_hash=NEW.session_hash AND s.subject_id=NEW.subject_id AND s.expires_at>unixepoch()*1000
 AND a.submissions_enabled=1 AND a.agreement_version='2026-10-18-v5'
) OR EXISTS (SELECT 1 FROM submission_owners WHERE record_kind=NEW.record_kind AND record_id=NEW.record_id AND subject_id != NEW.subject_id)
BEGIN SELECT RAISE(ABORT, 'Active participation agreement required'); END;
