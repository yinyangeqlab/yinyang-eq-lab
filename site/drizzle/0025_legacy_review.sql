CREATE TABLE `legacy_record_verifications` (
	`record_kind` text NOT NULL,
	`record_id` text NOT NULL,
	`subject_id` text NOT NULL,
	`request_id` text NOT NULL,
	PRIMARY KEY(`record_kind`, `record_id`),
	FOREIGN KEY (`request_id`) REFERENCES `legacy_review_requests`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `legacy_verified_subject_idx` ON `legacy_record_verifications` (`subject_id`);--> statement-breakpoint
CREATE TABLE `legacy_review_requests` (
	`id` text PRIMARY KEY NOT NULL,
	`subject_id` text NOT NULL,
	`record_kind` text NOT NULL,
	`record_id` text NOT NULL,
	`message` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`admin_reason` text,
	`created_at` integer NOT NULL,
	`reviewed_at` integer,
	CONSTRAINT "legacy_request_status" CHECK("legacy_review_requests"."status" IN ('pending','approved','rejected')),
	CONSTRAINT "legacy_request_kind" CHECK("legacy_review_requests"."record_kind" IN ('vote','open','run'))
);
--> statement-breakpoint
CREATE INDEX `legacy_requests_subject_idx` ON `legacy_review_requests` (`subject_id`);--> statement-breakpoint
CREATE TABLE `retrospective_permissions` (
	`study_id` text NOT NULL,
	`subject_id` text NOT NULL,
	`enabled` integer DEFAULT 0 NOT NULL,
	`notice_version` text NOT NULL,
	`agreed_at` integer NOT NULL,
	`withdrawn_at` integer,
	PRIMARY KEY(`study_id`, `subject_id`),
	FOREIGN KEY (`study_id`) REFERENCES `archive_studies`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "retrospective_permission_enabled" CHECK("retrospective_permissions"."enabled" IN (0,1))
);
--> statement-breakpoint
ALTER TABLE `archive_studies` ADD `source_mode` text DEFAULT 'prospective' NOT NULL;--> statement-breakpoint
ALTER TABLE `archive_studies` ADD `seal_after` integer;--> statement-breakpoint
CREATE UNIQUE INDEX `archive_releases_study_id_unique` ON `archive_releases` (`study_id`);
--> statement-breakpoint
DROP TRIGGER ownership_session_guard;
--> statement-breakpoint
CREATE TRIGGER ownership_session_guard BEFORE INSERT ON submission_owners
WHEN NOT EXISTS (
 SELECT 1 FROM privacy_sessions s JOIN privacy_accounts a ON a.subject_id=s.subject_id
 WHERE s.token_hash=NEW.session_hash AND s.subject_id=NEW.subject_id AND s.expires_at>unixepoch()*1000
 AND ((a.submissions_enabled=1 AND a.agreement_version='2026-10-18-v7') OR EXISTS (
 SELECT 1 FROM legacy_record_verifications l JOIN legacy_review_requests r ON r.id=l.request_id
 WHERE l.record_kind=NEW.record_kind AND l.record_id=NEW.record_id AND l.subject_id=NEW.subject_id AND r.subject_id=NEW.subject_id AND r.status='approved'))
) OR EXISTS (SELECT 1 FROM submission_owners WHERE record_kind=NEW.record_kind AND record_id=NEW.record_id AND subject_id!=NEW.subject_id)
BEGIN SELECT RAISE(ABORT,'Active participation or independently verified legacy ownership required'); END;
--> statement-breakpoint
CREATE TRIGGER legacy_verification_source_guard BEFORE INSERT ON legacy_record_verifications
WHEN NOT EXISTS (SELECT 1 FROM legacy_review_requests WHERE id=NEW.request_id AND subject_id=NEW.subject_id AND status='approved')
OR EXISTS (SELECT 1 FROM submission_owners WHERE record_kind=NEW.record_kind AND record_id=NEW.record_id AND subject_id!=NEW.subject_id)
OR NOT (
 (NEW.record_kind='vote' AND EXISTS(SELECT 1 FROM votes WHERE id=NEW.record_id)) OR
 (NEW.record_kind='trial' AND EXISTS(SELECT 1 FROM ranked_trials WHERE id=NEW.record_id)) OR
 (NEW.record_kind='open' AND EXISTS(SELECT 1 FROM comparison_choices WHERE id=NEW.record_id)) OR
 (NEW.record_kind='run' AND EXISTS(SELECT 1 FROM listening_runs WHERE id=NEW.record_id)) OR
 (NEW.record_kind='feedback' AND EXISTS(SELECT 1 FROM feedback_submissions WHERE id=NEW.record_id)))
BEGIN SELECT RAISE(ABORT,'Legacy verification is stale or conflicts with verified ownership'); END;
--> statement-breakpoint
CREATE TRIGGER legacy_revision_insert AFTER INSERT ON legacy_record_verifications BEGIN UPDATE archive_source_revision SET revision=revision+1 WHERE id=1; END;
--> statement-breakpoint
CREATE TRIGGER legacy_revision_delete AFTER DELETE ON legacy_record_verifications BEGIN UPDATE archive_source_revision SET revision=revision+1 WHERE id=1; END;
--> statement-breakpoint
CREATE TRIGGER legacy_revision_update AFTER UPDATE ON legacy_record_verifications BEGIN UPDATE archive_source_revision SET revision=revision+1 WHERE id=1; END;
--> statement-breakpoint
CREATE TRIGGER retrospective_revision_insert AFTER INSERT ON retrospective_permissions BEGIN UPDATE archive_source_revision SET revision=revision+1 WHERE id=1; END;
--> statement-breakpoint
CREATE TRIGGER retrospective_revision_update AFTER UPDATE ON retrospective_permissions BEGIN UPDATE archive_source_revision SET revision=revision+1 WHERE id=1; END;
--> statement-breakpoint
CREATE TRIGGER retrospective_revision_delete AFTER DELETE ON retrospective_permissions BEGIN UPDATE archive_source_revision SET revision=revision+1 WHERE id=1; END;
