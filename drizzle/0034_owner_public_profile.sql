CREATE TABLE `owner_history_claims` (
	`id` text PRIMARY KEY NOT NULL,
	`profile_slug` text NOT NULL,
	`code_hash` text NOT NULL,
	`source_subject` text NOT NULL,
	`source_session` text NOT NULL,
	`evidence` text NOT NULL,
	`created_at` integer NOT NULL,
	`expires_at` integer NOT NULL,
	`completed_at` integer,
	FOREIGN KEY (`profile_slug`) REFERENCES `owner_public_profiles`(`slug`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "owner_history_evidence_json" CHECK(json_valid("owner_history_claims"."evidence"))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `owner_history_claims_code_hash_unique` ON `owner_history_claims` (`code_hash`);--> statement-breakpoint
CREATE TABLE `owner_history_transfer_scope` (
	`batch_id` text NOT NULL,
	`record_kind` text NOT NULL,
	`record_id` text NOT NULL,
	`new_record_id` text NOT NULL,
	`from_subject` text NOT NULL,
	`to_subject` text NOT NULL,
	PRIMARY KEY(`batch_id`, `record_kind`, `record_id`)
);
--> statement-breakpoint
CREATE TABLE `owner_profile_devices` (
	`id` text PRIMARY KEY NOT NULL,
	`profile_slug` text NOT NULL,
	`session_hash` text,
	`label` text NOT NULL,
	`created_at` integer NOT NULL,
	`revoked_at` integer,
	FOREIGN KEY (`profile_slug`) REFERENCES `owner_public_profiles`(`slug`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `owner_profile_devices_session_hash_unique` ON `owner_profile_devices` (`session_hash`);--> statement-breakpoint
CREATE TABLE `owner_profile_entries` (
	`id` text PRIMARY KEY NOT NULL,
	`profile_slug` text NOT NULL,
	`record_kind` text NOT NULL,
	`record_id` text NOT NULL,
	`state` text DEFAULT 'draft' NOT NULL,
	`payload` text NOT NULL,
	`source_hash` text NOT NULL,
	`created_at` integer NOT NULL,
	`published_at` integer,
	FOREIGN KEY (`profile_slug`) REFERENCES `owner_public_profiles`(`slug`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "owner_entry_state" CHECK("owner_profile_entries"."state" IN ('draft','published','hidden')),
	CONSTRAINT "owner_entry_json" CHECK(json_valid("owner_profile_entries"."payload"))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `owner_profile_record_unique` ON `owner_profile_entries` (`profile_slug`,`record_kind`,`record_id`);--> statement-breakpoint
CREATE TABLE `owner_profile_events` (
	`id` text PRIMARY KEY NOT NULL,
	`profile_slug` text NOT NULL,
	`record_kind` text NOT NULL,
	`record_id` text NOT NULL,
	`action` text NOT NULL,
	`payload` text DEFAULT '{}' NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`profile_slug`) REFERENCES `owner_public_profiles`(`slug`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "owner_event_json" CHECK(json_valid("owner_profile_events"."payload"))
);
--> statement-breakpoint
CREATE INDEX `owner_events_source_idx` ON `owner_profile_events` (`profile_slug`,`record_kind`,`record_id`);--> statement-breakpoint
CREATE INDEX `owner_events_time_idx` ON `owner_profile_events` (`profile_slug`,`created_at`);--> statement-breakpoint
CREATE TABLE `owner_profile_grants` (
	`id` text PRIMARY KEY NOT NULL,
	`profile_slug` text NOT NULL,
	`token_hash` text NOT NULL,
	`label` text NOT NULL,
	`snapshot_id` text,
	`claim_hash` text,
	`device_id` text,
	`completed_at` integer,
	`activation_nonce` text,
	`created_at` integer NOT NULL,
	`expires_at` integer NOT NULL,
	`used_at` integer,
	`cancelled_at` integer,
	FOREIGN KEY (`profile_slug`) REFERENCES `owner_public_profiles`(`slug`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`snapshot_id`) REFERENCES `owner_profile_snapshots`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `owner_profile_grants_token_hash_unique` ON `owner_profile_grants` (`token_hash`);--> statement-breakpoint
CREATE UNIQUE INDEX `owner_profile_grants_claim_hash_unique` ON `owner_profile_grants` (`claim_hash`);--> statement-breakpoint
CREATE TABLE `owner_profile_snapshots` (
	`id` text PRIMARY KEY NOT NULL,
	`profile_slug` text NOT NULL,
	`label` text NOT NULL,
	`payload` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`profile_slug`) REFERENCES `owner_public_profiles`(`slug`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "owner_snapshot_json" CHECK(json_valid("owner_profile_snapshots"."payload"))
);
--> statement-breakpoint
CREATE TABLE `owner_public_profiles` (
	`slug` text PRIMARY KEY NOT NULL,
	`subject_id` text NOT NULL,
	`invite_id` text NOT NULL,
	`policy_at` integer NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`subject_id`) REFERENCES `privacy_accounts`(`subject_id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "owner_profile_reserved_slug" CHECK("owner_public_profiles"."slug"='yinyangeq')
);
--> statement-breakpoint
CREATE UNIQUE INDEX `owner_public_profiles_subject_id_unique` ON `owner_public_profiles` (`subject_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `owner_public_profiles_invite_id_unique` ON `owner_public_profiles` (`invite_id`);
--> statement-breakpoint
CREATE TRIGGER owner_profile_identity_immutable BEFORE UPDATE ON owner_public_profiles
WHEN OLD.slug!=NEW.slug OR OLD.subject_id!=NEW.subject_id OR OLD.invite_id!=NEW.invite_id OR OLD.policy_at!=NEW.policy_at
BEGIN SELECT RAISE(ABORT,'The reserved participant identity cannot be reassigned'); END;
--> statement-breakpoint
CREATE TRIGGER owner_transfer_scope_guard BEFORE INSERT ON owner_history_transfer_scope
WHEN NOT EXISTS(SELECT 1 FROM owner_history_claims c JOIN owner_public_profiles p ON p.slug=c.profile_slug WHERE c.id=NEW.batch_id AND c.source_subject=NEW.from_subject AND c.source_subject!='pending' AND c.completed_at IS NULL AND c.expires_at>unixepoch()*1000 AND p.subject_id=NEW.to_subject AND NEW.to_subject!='owner')
 OR NEW.record_kind NOT IN ('vote','run','open','trial','feedback','measurement','export','target','suggestion','music','personal')
 OR (NEW.record_kind!='music' AND NEW.new_record_id!=NEW.record_id)
 OR (NEW.record_kind='music' AND (json_array_length(CASE WHEN json_valid(NEW.record_id) THEN NEW.record_id ELSE '[]' END)!=2 OR json_array_length(CASE WHEN json_valid(NEW.new_record_id) THEN NEW.new_record_id ELSE '[]' END)!=2 OR json_extract(CASE WHEN json_valid(NEW.record_id) THEN NEW.record_id ELSE '[]' END,'$[0]') IS NOT NEW.from_subject OR json_extract(CASE WHEN json_valid(NEW.new_record_id) THEN NEW.new_record_id ELSE '[]' END,'$[0]') IS NOT NEW.to_subject OR json_extract(CASE WHEN json_valid(NEW.record_id) THEN NEW.record_id ELSE '[]' END,'$[1]') IS NOT json_extract(CASE WHEN json_valid(NEW.new_record_id) THEN NEW.new_record_id ELSE '[]' END,'$[1]')))
 OR NOT EXISTS(SELECT 1 FROM privacy_accounts a JOIN privacy_sessions p ON p.subject_id=a.subject_id WHERE a.subject_id=NEW.to_subject AND a.submissions_enabled=1 AND a.agreement_version='2026-10-18-v7' AND p.expires_at>unixepoch()*1000)
 OR NOT (
  EXISTS(SELECT 1 FROM submission_owners o WHERE o.record_kind=NEW.record_kind AND o.record_id=NEW.record_id AND o.subject_id=NEW.from_subject)
  OR NEW.record_kind='music' AND EXISTS(SELECT 1 FROM music_votes m WHERE m.user_id=NEW.from_subject AND m.track_url=json_extract(NEW.record_id,'$[1]'))
  OR EXISTS(SELECT 1 FROM legacy_record_verifications v JOIN legacy_review_requests r ON r.id=v.request_id WHERE v.record_kind=NEW.record_kind AND v.record_id=NEW.record_id AND v.subject_id=NEW.to_subject AND r.subject_id=NEW.to_subject AND r.status='approved' AND r.message='YinYangEQ Brave capture '||NEW.batch_id)
 )
BEGIN SELECT RAISE(ABORT,'Historical transfer scope is not authorized'); END;
--> statement-breakpoint
DROP TRIGGER ownership_update_guard;
--> statement-breakpoint
CREATE TRIGGER ownership_update_guard BEFORE UPDATE ON submission_owners
WHEN ((OLD.subject_id!=NEW.subject_id OR OLD.record_kind!=NEW.record_kind OR OLD.record_id!=NEW.record_id) AND NOT EXISTS(SELECT 1 FROM owner_history_transfer_scope s JOIN owner_history_claims c ON c.id=s.batch_id JOIN owner_public_profiles p ON p.slug=c.profile_slug WHERE s.record_kind=OLD.record_kind AND s.record_id=OLD.record_id AND s.new_record_id=NEW.record_id AND NEW.record_kind=OLD.record_kind AND s.from_subject=OLD.subject_id AND s.to_subject=NEW.subject_id AND p.subject_id=NEW.subject_id AND c.completed_at IS NULL AND c.expires_at>unixepoch()*1000))
 OR (OLD.subject_id=NEW.subject_id AND OLD.record_kind=NEW.record_kind AND OLD.record_id=NEW.record_id AND NOT EXISTS(SELECT 1 FROM privacy_sessions WHERE token_hash=NEW.session_hash AND subject_id=NEW.subject_id AND expires_at>unixepoch()*1000))
BEGIN SELECT RAISE(ABORT,'Ownership cannot be transferred'); END;
--> statement-breakpoint
CREATE TRIGGER owner_transfer_complete_guard BEFORE UPDATE OF completed_at ON owner_history_claims
WHEN NEW.completed_at IS NOT NULL AND OLD.completed_at IS NULL AND (
 NOT EXISTS(SELECT 1 FROM owner_history_transfer_scope s WHERE s.batch_id=OLD.id)
 OR EXISTS(SELECT 1 FROM owner_history_transfer_scope s WHERE s.batch_id=OLD.id AND NOT EXISTS(SELECT 1 FROM submission_owners o WHERE o.record_kind=s.record_kind AND o.record_id=s.new_record_id AND o.subject_id=s.to_subject))
 OR EXISTS(SELECT 1 FROM owner_history_transfer_scope s WHERE s.batch_id=OLD.id AND s.record_kind='music' AND NOT EXISTS(SELECT 1 FROM music_votes m WHERE m.user_id=s.to_subject AND m.track_url=json_extract(s.new_record_id,'$[1]')))
 OR EXISTS(SELECT 1 FROM comparison_records a JOIN submission_owners oa ON oa.record_kind=a.record_kind AND oa.record_id=a.record_id JOIN comparison_records b ON b.comparison_id=a.comparison_id JOIN submission_owners ob ON ob.record_kind=b.record_kind AND ob.record_id=b.record_id WHERE oa.subject_id!=ob.subject_id AND EXISTS(SELECT 1 FROM owner_history_transfer_scope s WHERE s.batch_id=OLD.id AND s.record_kind=a.record_kind AND s.new_record_id=a.record_id)))
BEGIN SELECT RAISE(ABORT,'Historical comparison transfer is incomplete'); END;
--> statement-breakpoint
CREATE TRIGGER owner_profile_events_immutable BEFORE UPDATE ON owner_profile_events BEGIN SELECT RAISE(ABORT,'Private history events cannot be rewritten'); END;
--> statement-breakpoint
CREATE TRIGGER owner_history_event_erasure AFTER DELETE ON owner_profile_events BEGIN
 DELETE FROM owner_profile_entries WHERE record_kind='history' AND record_id=OLD.id AND profile_slug=OLD.profile_slug;
END;
--> statement-breakpoint
CREATE TRIGGER owner_history_contribution_insert AFTER INSERT ON submission_owners
WHEN NEW.record_kind IN ('vote','run','open','feedback','measurement','export','target','suggestion','personal') AND EXISTS(SELECT 1 FROM owner_public_profiles WHERE subject_id=NEW.subject_id)
BEGIN INSERT INTO owner_profile_events(id,profile_slug,record_kind,record_id,action,payload,created_at) SELECT lower(hex(randomblob(16))),slug,NEW.record_kind,NEW.record_id,CASE WHEN EXISTS(SELECT 1 FROM owner_history_transfer_scope s WHERE s.record_kind=NEW.record_kind AND s.new_record_id=NEW.record_id AND s.to_subject=NEW.subject_id) THEN 'historical-import' ELSE 'contributed' END,'{}',unixepoch()*1000 FROM owner_public_profiles WHERE subject_id=NEW.subject_id; END;
--> statement-breakpoint
CREATE TRIGGER owner_history_contribution_transfer AFTER UPDATE OF subject_id ON submission_owners
WHEN OLD.subject_id!=NEW.subject_id AND NEW.record_kind IN ('vote','run','open','feedback','measurement','export','target','suggestion','personal') AND EXISTS(SELECT 1 FROM owner_public_profiles WHERE subject_id=NEW.subject_id)
BEGIN INSERT INTO owner_profile_events(id,profile_slug,record_kind,record_id,action,payload,created_at) SELECT lower(hex(randomblob(16))),slug,NEW.record_kind,NEW.record_id,'historical-import','{}',unixepoch()*1000 FROM owner_public_profiles WHERE subject_id=NEW.subject_id; END;
--> statement-breakpoint
CREATE TRIGGER owner_history_music_insert AFTER INSERT ON music_votes WHEN EXISTS(SELECT 1 FROM owner_public_profiles WHERE subject_id=NEW.user_id)
BEGIN INSERT INTO owner_profile_events(id,profile_slug,record_kind,record_id,action,payload,created_at) SELECT lower(hex(randomblob(16))),slug,'music',NEW.track_url,'rated',json_object('recording',NEW.track_url,'choice',NEW.choice,'at',NEW.updated_at),NEW.updated_at FROM owner_public_profiles WHERE subject_id=NEW.user_id; END;
--> statement-breakpoint
CREATE TRIGGER owner_history_music_change AFTER UPDATE ON music_votes WHEN (OLD.choice!=NEW.choice OR OLD.user_id!=NEW.user_id) AND EXISTS(SELECT 1 FROM owner_public_profiles WHERE subject_id=NEW.user_id)
BEGIN INSERT INTO owner_profile_events(id,profile_slug,record_kind,record_id,action,payload,created_at) SELECT lower(hex(randomblob(16))),slug,'music',NEW.track_url,CASE WHEN OLD.user_id!=NEW.user_id THEN 'historical-import' ELSE 'rating-changed' END,json_object('recording',NEW.track_url,'choice',NEW.choice,'at',NEW.updated_at),NEW.updated_at FROM owner_public_profiles WHERE subject_id=NEW.user_id; END;
--> statement-breakpoint
CREATE TRIGGER owner_history_music_undo AFTER DELETE ON music_votes WHEN EXISTS(SELECT 1 FROM owner_public_profiles WHERE subject_id=OLD.user_id)
BEGIN INSERT INTO owner_profile_events(id,profile_slug,record_kind,record_id,action,payload,created_at) SELECT lower(hex(randomblob(16))),slug,'music',OLD.track_url,'rating-withdrawn',json_object('recording',OLD.track_url,'choice',NULL,'at',unixepoch()*1000),unixepoch()*1000 FROM owner_public_profiles WHERE subject_id=OLD.user_id; END;

--> statement-breakpoint
CREATE TRIGGER owner_profile_vote_erasure AFTER DELETE ON votes BEGIN
 DELETE FROM owner_profile_entries WHERE record_kind='vote' AND record_id=OLD.id;
 DELETE FROM owner_profile_events WHERE record_kind='vote' AND record_id=OLD.id;
END;

--> statement-breakpoint
CREATE TRIGGER owner_profile_run_erasure AFTER DELETE ON listening_runs BEGIN
 DELETE FROM owner_profile_entries WHERE record_kind='run' AND record_id=OLD.id;
 DELETE FROM owner_profile_events WHERE record_kind='run' AND record_id=OLD.id;
END;

--> statement-breakpoint
CREATE TRIGGER owner_profile_open_erasure AFTER DELETE ON comparison_choices BEGIN
 DELETE FROM owner_profile_entries WHERE record_kind='open' AND record_id=OLD.id;
 DELETE FROM owner_profile_events WHERE record_kind='open' AND record_id=OLD.id;
END;

--> statement-breakpoint
CREATE TRIGGER owner_profile_feedback_erasure AFTER DELETE ON feedback_submissions BEGIN
 DELETE FROM owner_profile_entries WHERE record_kind='feedback' AND record_id=OLD.id;
 DELETE FROM owner_profile_events WHERE record_kind='feedback' AND record_id=OLD.id;
END;

--> statement-breakpoint
CREATE TRIGGER owner_profile_measurement_erasure AFTER DELETE ON research_measurements BEGIN
 DELETE FROM owner_profile_entries WHERE record_kind='measurement' AND record_id=OLD.id;
 DELETE FROM owner_profile_events WHERE record_kind='measurement' AND record_id=OLD.id;
END;

--> statement-breakpoint
CREATE TRIGGER owner_profile_export_erasure AFTER DELETE ON preference_exports BEGIN
 DELETE FROM owner_profile_entries WHERE record_kind='export' AND record_id=OLD.id;
 DELETE FROM owner_profile_events WHERE record_kind='export' AND record_id=OLD.id;
END;

--> statement-breakpoint
CREATE TRIGGER owner_profile_target_erasure AFTER DELETE ON targets BEGIN
 DELETE FROM owner_profile_entries WHERE record_kind='target' AND record_id=OLD.id;
 DELETE FROM owner_profile_events WHERE record_kind='target' AND record_id=OLD.id;
END;

--> statement-breakpoint
CREATE TRIGGER owner_profile_suggestion_erasure AFTER DELETE ON suggestions BEGIN
 DELETE FROM owner_profile_entries WHERE record_kind='suggestion' AND record_id=OLD.id;
 DELETE FROM owner_profile_events WHERE record_kind='suggestion' AND record_id=OLD.id;
END;

--> statement-breakpoint
CREATE TRIGGER owner_profile_personal_erasure AFTER DELETE ON personal_research_choices BEGIN
 DELETE FROM owner_profile_entries WHERE record_kind='personal' AND record_id=OLD.id;
 DELETE FROM owner_profile_events WHERE record_kind='personal' AND record_id=OLD.id;
END;

--> statement-breakpoint
CREATE TRIGGER owner_music_publication_changed AFTER UPDATE ON music_votes
WHEN EXISTS(SELECT 1 FROM owner_public_profiles WHERE subject_id=NEW.user_id)
BEGIN UPDATE owner_profile_entries SET state='hidden',published_at=NULL WHERE record_kind='music' AND record_id=NEW.track_url AND profile_slug IN(SELECT slug FROM owner_public_profiles WHERE subject_id=NEW.user_id); END;
--> statement-breakpoint
CREATE TRIGGER owner_music_publication_undone AFTER DELETE ON music_votes
WHEN EXISTS(SELECT 1 FROM owner_public_profiles WHERE subject_id=OLD.user_id)
BEGIN DELETE FROM owner_profile_entries WHERE record_kind='music' AND record_id=OLD.track_url AND profile_slug IN(SELECT slug FROM owner_public_profiles WHERE subject_id=OLD.user_id); END;
