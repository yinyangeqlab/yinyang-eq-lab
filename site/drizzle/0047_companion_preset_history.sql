CREATE TABLE companion_preset_history (
 id TEXT PRIMARY KEY,
 subject_id TEXT NOT NULL REFERENCES privacy_accounts(subject_id) ON DELETE CASCADE,
 model TEXT NOT NULL, name TEXT NOT NULL, kind TEXT NOT NULL,
 main_name TEXT NOT NULL, match_name TEXT NOT NULL,
 main_eq TEXT NOT NULL, channel_match TEXT NOT NULL, saved_at INTEGER NOT NULL
);
CREATE INDEX companion_history_account ON companion_preset_history(subject_id,saved_at,id);
