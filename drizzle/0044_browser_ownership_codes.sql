CREATE TABLE browser_ownership_codes (
  session_hash TEXT PRIMARY KEY NOT NULL REFERENCES privacy_sessions(token_hash) ON DELETE CASCADE,
  code_hash TEXT NOT NULL UNIQUE,
  expires_at INTEGER NOT NULL
);
CREATE INDEX browser_ownership_codes_expiry_idx ON browser_ownership_codes(expires_at);
