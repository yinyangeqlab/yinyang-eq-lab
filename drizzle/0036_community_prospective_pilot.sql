CREATE TABLE `community_personal_choices` (
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
	CONSTRAINT "community_result" CHECK("community_personal_choices"."result" IN ('a','b','tie')),
	CONSTRAINT "community_category" CHECK("community_personal_choices"."headphone_type" IN ('ie','oe')),
	CONSTRAINT "community_phase" CHECK("community_personal_choices"."phase" IN ('explore','confirm')),
	CONSTRAINT "community_pair_distinct" CHECK("community_personal_choices"."target_a_id" != "community_personal_choices"."target_b_id")
);
--> statement-breakpoint
CREATE INDEX `community_personal_subject_created` ON `community_personal_choices` (`subject_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `community_personal_deletion_totals` (
	`day` text PRIMARY KEY NOT NULL,
	`deleted_count` integer NOT NULL,
	CONSTRAINT "personal_deletion_positive" CHECK("community_personal_deletion_totals"."deleted_count">0)
);
--> statement-breakpoint
CREATE TABLE `community_personal_permissions` (
	`subject_id` text PRIMARY KEY NOT NULL,
	`enabled` integer DEFAULT 0 NOT NULL,
	`notice_version` text NOT NULL,
	`consent_token` text NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`subject_id`) REFERENCES `privacy_accounts`(`subject_id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "community_permission_enabled" CHECK("community_personal_permissions"."enabled" IN (0,1))
);

--> statement-breakpoint
CREATE TRIGGER community_personal_consent_guard BEFORE INSERT ON community_personal_choices
WHEN NOT EXISTS (SELECT 1 FROM community_personal_permissions p JOIN privacy_accounts a ON a.subject_id=p.subject_id
 WHERE p.subject_id=NEW.subject_id AND p.enabled=1 AND p.notice_version=NEW.notice_version
 AND p.consent_token=NEW.consent_token AND a.submissions_enabled=1)
BEGIN SELECT RAISE(ABORT,'Community research permission changed'); END;
--> statement-breakpoint
CREATE TRIGGER community_personal_withdrawal AFTER UPDATE OF submissions_enabled ON privacy_accounts
WHEN NEW.submissions_enabled=0
BEGIN UPDATE community_personal_permissions SET enabled=0,consent_token=lower(hex(randomblob(16))) WHERE subject_id=NEW.subject_id; END;
--> statement-breakpoint
CREATE TRIGGER community_permission_insert_guard BEFORE INSERT ON community_personal_permissions
WHEN NEW.enabled=1 AND NOT EXISTS(SELECT 1 FROM privacy_accounts WHERE subject_id=NEW.subject_id AND submissions_enabled=1)
BEGIN SELECT RAISE(ABORT,'Active participation required for personal research'); END;
--> statement-breakpoint
CREATE TRIGGER community_permission_update_guard BEFORE UPDATE ON community_personal_permissions
WHEN NEW.enabled=1 AND NOT EXISTS(SELECT 1 FROM privacy_accounts WHERE subject_id=NEW.subject_id AND submissions_enabled=1)
BEGIN SELECT RAISE(ABORT,'Active participation required for personal research'); END;

CREATE TABLE community_catalogs(id TEXT PRIMARY KEY,period TEXT NOT NULL,headphone_type TEXT NOT NULL,catalog_json TEXT NOT NULL,music_json TEXT NOT NULL,method_version TEXT NOT NULL,UNIQUE(period,headphone_type));
CREATE TABLE community_reference_blocks(id TEXT PRIMARY KEY,subject_id TEXT NOT NULL REFERENCES privacy_accounts(subject_id) ON DELETE CASCADE,catalog_id TEXT NOT NULL REFERENCES community_catalogs(id),consent_token TEXT NOT NULL,notice_version TEXT NOT NULL,setup_fingerprint TEXT NOT NULL,created_at INTEGER NOT NULL,UNIQUE(subject_id,catalog_id));
CREATE TABLE community_reference_assignments(id TEXT PRIMARY KEY,block_id TEXT NOT NULL REFERENCES community_reference_blocks(id) ON DELETE CASCADE,ordinal INTEGER NOT NULL,pair_index INTEGER NOT NULL,pair_probability REAL NOT NULL CHECK(pair_probability>0 AND pair_probability<=1),side_probability REAL NOT NULL CHECK(side_probability=0.5),target_a_id TEXT NOT NULL,target_b_id TEXT NOT NULL,recording_id TEXT NOT NULL,recording_probability REAL NOT NULL CHECK(recording_probability>0 AND recording_probability<=1),recording_version TEXT,result TEXT CHECK(result IN ('a','b','tie','skip')),playback_json TEXT,answered_at INTEGER,UNIQUE(block_id,ordinal));
CREATE TRIGGER community_reference_immutable BEFORE UPDATE OF block_id,ordinal,pair_index,pair_probability,side_probability,target_a_id,target_b_id,recording_id,recording_probability,recording_version ON community_reference_assignments BEGIN SELECT RAISE(ABORT,'Reference assignment is immutable'); END;
CREATE TRIGGER community_reference_once BEFORE UPDATE ON community_reference_assignments WHEN OLD.result IS NOT NULL BEGIN SELECT RAISE(ABORT,'Reference answer is immutable; use My data to delete its block'); END;
CREATE TRIGGER community_reference_consent BEFORE UPDATE OF result ON community_reference_assignments WHEN NOT EXISTS(SELECT 1 FROM community_reference_blocks b JOIN community_personal_permissions p ON p.subject_id=b.subject_id JOIN privacy_accounts a ON a.subject_id=p.subject_id WHERE b.id=NEW.block_id AND p.enabled=1 AND p.consent_token=b.consent_token AND p.notice_version=b.notice_version AND a.submissions_enabled=1 AND b.subject_id NOT IN ('owner','invite:layout-test-only')) BEGIN SELECT RAISE(ABORT,'Community permission changed'); END;
CREATE TRIGGER community_permission_test_insert BEFORE INSERT ON community_personal_permissions WHEN NEW.enabled=1 AND NEW.subject_id IN ('owner','invite:layout-test-only') BEGIN SELECT RAISE(ABORT,'Test accounts cannot contribute'); END;
CREATE TRIGGER community_permission_test_update BEFORE UPDATE ON community_personal_permissions WHEN NEW.enabled=1 AND NEW.subject_id IN ('owner','invite:layout-test-only') BEGIN SELECT RAISE(ABORT,'Test accounts cannot contribute'); END;
CREATE TRIGGER community_reference_block_consent BEFORE INSERT ON community_reference_blocks WHEN NOT EXISTS(SELECT 1 FROM community_personal_permissions p JOIN privacy_accounts a ON a.subject_id=p.subject_id WHERE p.subject_id=NEW.subject_id AND p.enabled=1 AND p.consent_token=NEW.consent_token AND p.notice_version=NEW.notice_version AND a.submissions_enabled=1 AND NEW.subject_id NOT IN ('owner','invite:layout-test-only')) BEGIN SELECT RAISE(ABORT,'Community permission changed'); END;
CREATE TABLE community_moderation(record_kind TEXT NOT NULL CHECK(record_kind IN ('community','community-reference')),record_id TEXT NOT NULL,excluded INTEGER NOT NULL CHECK(excluded IN (0,1)),note TEXT NOT NULL,PRIMARY KEY(record_kind,record_id));
CREATE TRIGGER community_reference_moderation_delete AFTER DELETE ON community_reference_blocks BEGIN DELETE FROM community_moderation WHERE record_kind='community-reference' AND record_id=OLD.id; END;
CREATE TRIGGER community_personal_moderation_delete AFTER DELETE ON community_personal_choices BEGIN DELETE FROM community_moderation WHERE record_kind='community' AND record_id=OLD.id; END;
CREATE TRIGGER community_moderation_change AFTER INSERT ON community_moderation BEGIN INSERT OR IGNORE INTO ranking_change_days VALUES(date('now'),'moderation','uniform-reference-fixed10-v1'); END;
CREATE TRIGGER community_moderation_update AFTER UPDATE ON community_moderation BEGIN INSERT OR IGNORE INTO ranking_change_days VALUES(date('now'),'moderation','uniform-reference-fixed10-v1'); END;
INSERT OR IGNORE INTO ranking_change_days VALUES(date('now'),'method-update','uniform-reference-fixed10-v1');
CREATE TRIGGER community_catalogs_immutable BEFORE UPDATE ON community_catalogs BEGIN SELECT RAISE(ABORT,'Reference catalog is immutable'); END;
CREATE TRIGGER community_blocks_immutable BEFORE UPDATE ON community_reference_blocks BEGIN SELECT RAISE(ABORT,'Reference block is immutable'); END;
CREATE TRIGGER community_personal_immutable BEFORE UPDATE ON community_personal_choices BEGIN SELECT RAISE(ABORT,'Community evidence is immutable; use My data to delete'); END;
