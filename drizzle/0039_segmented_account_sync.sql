-- Versioned saved-data pieces, scoped to the existing private account.
-- No existing payload, permission, epoch, revision or history is rewritten.
CREATE TABLE account_sync_versions (
 id TEXT PRIMARY KEY NOT NULL,
 subject_id TEXT NOT NULL REFERENCES privacy_accounts(subject_id) ON DELETE CASCADE,
 device_id TEXT NOT NULL,
 epoch TEXT NOT NULL,
 base_revision INTEGER NOT NULL,
 manifest TEXT NOT NULL CHECK(json_valid(manifest)),
 created_at INTEGER NOT NULL,
 committed_at INTEGER
);
--> statement-breakpoint
CREATE INDEX account_sync_versions_subject ON account_sync_versions(subject_id);
--> statement-breakpoint
CREATE TABLE account_sync_entries (
 version_id TEXT NOT NULL REFERENCES account_sync_versions(id) ON DELETE CASCADE,
 storage_key TEXT NOT NULL,
 entry_index INTEGER NOT NULL CHECK(entry_index>=0),
 part_count INTEGER NOT NULL CHECK(part_count>0),
 content_hash TEXT,
 source_ids TEXT NOT NULL DEFAULT '[]' CHECK(json_valid(source_ids)),
 owner_kind TEXT,
 owner_id TEXT,
 PRIMARY KEY(version_id,storage_key,entry_index)
);
--> statement-breakpoint
CREATE TABLE account_sync_parts (
 version_id TEXT NOT NULL,
 storage_key TEXT NOT NULL,
 entry_index INTEGER NOT NULL,
 part_index INTEGER NOT NULL CHECK(part_index>=0),
 payload TEXT NOT NULL,
 PRIMARY KEY(version_id,storage_key,entry_index,part_index),
 FOREIGN KEY(version_id,storage_key,entry_index) REFERENCES account_sync_entries(version_id,storage_key,entry_index) ON DELETE CASCADE
);
