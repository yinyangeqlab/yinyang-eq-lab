CREATE TABLE account_sync_permissions (
 subject_id TEXT PRIMARY KEY NOT NULL REFERENCES privacy_accounts(subject_id) ON DELETE CASCADE,
 enabled INTEGER NOT NULL DEFAULT 0 CHECK(enabled IN (0,1)),
 notice_version TEXT NOT NULL,
 consent_source TEXT NOT NULL,
 agreed_at INTEGER,
 updated_at INTEGER NOT NULL
);
--> statement-breakpoint
CREATE TABLE account_browser_sync (
 subject_id TEXT PRIMARY KEY NOT NULL REFERENCES privacy_accounts(subject_id) ON DELETE CASCADE,
 epoch TEXT NOT NULL,
 revision INTEGER NOT NULL DEFAULT 0,
 initialized INTEGER NOT NULL DEFAULT 0,
 payload TEXT NOT NULL DEFAULT '{}' CHECK(json_valid(payload)),
 updated_at INTEGER NOT NULL
);
--> statement-breakpoint
CREATE TABLE account_device_status (
 id TEXT PRIMARY KEY NOT NULL,
 session_hash TEXT NOT NULL UNIQUE REFERENCES private_tester_devices(session_hash) ON DELETE CASCADE,
 label TEXT NOT NULL DEFAULT 'Unnamed device',
 browser_name TEXT NOT NULL DEFAULT '',
 notes TEXT NOT NULL DEFAULT '',
 sync_enabled INTEGER NOT NULL DEFAULT 1 CHECK(sync_enabled IN (0,1)),
 epoch TEXT,
 revision INTEGER,
 data_digest TEXT,
 consent_stamp TEXT,
 state TEXT CHECK(state IN ('synced','pending','conflict','paused')),
 checked_at INTEGER
);
--> statement-breakpoint
INSERT INTO account_sync_permissions(subject_id,enabled,notice_version,consent_source,agreed_at,updated_at)
 SELECT p.subject_id,1,'account-sync-2026-10-19-v1','existing-owner-automatic-sync',NULL,unixepoch()*1000
 FROM owner_public_profiles p JOIN owner_account_sync s ON s.profile_slug=p.slug WHERE s.initialized=1;
--> statement-breakpoint
INSERT INTO account_device_status(id,session_hash,label)
 SELECT COALESCE(p.id,lower(hex(randomblob(16)))),d.session_hash,COALESCE(p.label,'Unnamed device')
 FROM private_tester_devices d LEFT JOIN owner_profile_devices p ON p.session_hash=d.session_hash;
--> statement-breakpoint
ALTER TABLE browser_pairings ADD COLUMN sync_mode TEXT NOT NULL DEFAULT 'legacy';
--> statement-breakpoint
ALTER TABLE browser_pairings ADD COLUMN device_label TEXT;
--> statement-breakpoint
ALTER TABLE browser_pairings ADD COLUMN browser_name TEXT;
--> statement-breakpoint
ALTER TABLE browser_pairings ADD COLUMN approval_version TEXT;
