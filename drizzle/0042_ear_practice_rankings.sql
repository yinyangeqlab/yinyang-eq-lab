CREATE TABLE ear_practice_profiles (
  subject_id TEXT PRIMARY KEY NOT NULL REFERENCES privacy_accounts(subject_id) ON DELETE CASCADE,
  username TEXT,
  cleared_at INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE ear_practice_scores (
  subject_id TEXT NOT NULL REFERENCES ear_practice_profiles(subject_id) ON DELETE CASCADE,
  protocol TEXT NOT NULL,
  furthest INTEGER NOT NULL DEFAULT 0 CHECK (furthest BETWEEN 0 AND 100),
  correct INTEGER NOT NULL CHECK (correct >= 0 AND correct <= attempts),
  attempts INTEGER NOT NULL CHECK (attempts > 0),
  consent_version TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (subject_id, protocol)
);

CREATE UNIQUE INDEX ear_practice_username_idx ON ear_practice_profiles (lower(username));
CREATE INDEX ear_practice_rank_idx ON ear_practice_scores (protocol, furthest DESC);

CREATE TABLE ear_practice_sets (
  subject_id TEXT PRIMARY KEY NOT NULL REFERENCES ear_practice_profiles(subject_id) ON DELETE CASCADE,
  id TEXT NOT NULL,
  protocol TEXT NOT NULL,
  stage INTEGER NOT NULL CHECK (stage BETWEEN 1 AND 100),
  bands TEXT NOT NULL,
  answer TEXT,
  created_at INTEGER NOT NULL
);
