CREATE TABLE IF NOT EXISTS private_tester_invites (
  id TEXT PRIMARY KEY NOT NULL,
  label TEXT NOT NULL,
  code_hash TEXT NOT NULL UNIQUE,
  created_at INTEGER NOT NULL,
  code_expires_at INTEGER NOT NULL,
  redeemed_at INTEGER,
  session_hash TEXT UNIQUE,
  session_expires_at INTEGER,
  revoked_at INTEGER
);
CREATE INDEX IF NOT EXISTS private_tester_invites_session_idx ON private_tester_invites(session_hash);
