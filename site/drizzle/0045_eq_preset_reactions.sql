CREATE TABLE eq_preset_reactions (
  id TEXT PRIMARY KEY NOT NULL,
  subject_id TEXT NOT NULL REFERENCES privacy_accounts(subject_id) ON DELETE CASCADE,
  model_id TEXT NOT NULL,
  preset_id TEXT NOT NULL,
  preset_version TEXT NOT NULL,
  choice TEXT NOT NULL CHECK (choice IN ('up', 'down')),
  created_at INTEGER NOT NULL
);

CREATE UNIQUE INDEX eq_preset_reactions_version_subject_idx
  ON eq_preset_reactions(model_id, preset_id, preset_version, subject_id);
CREATE INDEX eq_preset_reactions_subject_idx ON eq_preset_reactions(subject_id);
