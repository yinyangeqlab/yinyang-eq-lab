CREATE TABLE `personal_research_choices` (
	`id` text PRIMARY KEY NOT NULL,
	`subject_id` text NOT NULL,
	`consent_token` text NOT NULL,
	`notice_version` text NOT NULL,
	`target_a_id` text NOT NULL,
	`target_b_id` text NOT NULL,
	`result` text NOT NULL,
	`headphone_type` text NOT NULL,
	`setup_fingerprint` text NOT NULL,
	`recording_id` text NOT NULL,
	`playback_json` text NOT NULL,
	`selection_json` text NOT NULL,
	`phase` text NOT NULL,
	`round_number` integer NOT NULL,
	`protocol_version` text NOT NULL,
	`scheduler_version` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`subject_id`) REFERENCES `privacy_accounts`(`subject_id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "personal_result" CHECK("personal_research_choices"."result" IN ('a','b','tie')),
	CONSTRAINT "personal_category" CHECK("personal_research_choices"."headphone_type" IN ('ie','oe')),
	CONSTRAINT "personal_phase" CHECK("personal_research_choices"."phase" IN ('explore','confirm')),
	CONSTRAINT "personal_pair_distinct" CHECK("personal_research_choices"."target_a_id" != "personal_research_choices"."target_b_id")
);
--> statement-breakpoint
CREATE INDEX `personal_research_subject_created` ON `personal_research_choices` (`subject_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `personal_research_deletion_totals` (
	`day` text PRIMARY KEY NOT NULL,
	`deleted_count` integer NOT NULL,
	CONSTRAINT "personal_deletion_positive" CHECK("personal_research_deletion_totals"."deleted_count">0)
);
--> statement-breakpoint
CREATE TABLE `personal_research_permissions` (
	`subject_id` text PRIMARY KEY NOT NULL,
	`enabled` integer DEFAULT 0 NOT NULL,
	`notice_version` text NOT NULL,
	`consent_token` text NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`subject_id`) REFERENCES `privacy_accounts`(`subject_id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "personal_permission_enabled" CHECK("personal_research_permissions"."enabled" IN (0,1))
);

--> statement-breakpoint
CREATE TRIGGER personal_research_consent_guard BEFORE INSERT ON personal_research_choices
WHEN NOT EXISTS (SELECT 1 FROM personal_research_permissions p JOIN privacy_accounts a ON a.subject_id=p.subject_id
 WHERE p.subject_id=NEW.subject_id AND p.enabled=1 AND p.notice_version=NEW.notice_version
 AND p.consent_token=NEW.consent_token AND a.submissions_enabled=1)
BEGIN SELECT RAISE(ABORT,'Personal research permission changed'); END;
--> statement-breakpoint
CREATE TRIGGER personal_research_withdrawal AFTER UPDATE OF submissions_enabled ON privacy_accounts
WHEN NEW.submissions_enabled=0
BEGIN UPDATE personal_research_permissions SET enabled=0,consent_token=lower(hex(randomblob(16))) WHERE subject_id=NEW.subject_id; END;
--> statement-breakpoint
CREATE TRIGGER personal_permission_insert_guard BEFORE INSERT ON personal_research_permissions
WHEN NEW.enabled=1 AND NOT EXISTS(SELECT 1 FROM privacy_accounts WHERE subject_id=NEW.subject_id AND submissions_enabled=1)
BEGIN SELECT RAISE(ABORT,'Active participation required for personal research'); END;
--> statement-breakpoint
CREATE TRIGGER personal_permission_update_guard BEFORE UPDATE ON personal_research_permissions
WHEN NEW.enabled=1 AND NOT EXISTS(SELECT 1 FROM privacy_accounts WHERE subject_id=NEW.subject_id AND submissions_enabled=1)
BEGIN SELECT RAISE(ABORT,'Active participation required for personal research'); END;
