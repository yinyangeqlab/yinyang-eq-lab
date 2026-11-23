CREATE TABLE sync_recovery_accounts (
  sync_id TEXT PRIMARY KEY NOT NULL,
  subject_id TEXT NOT NULL UNIQUE REFERENCES privacy_accounts(subject_id) ON DELETE CASCADE,
  invite_id TEXT NOT NULL UNIQUE REFERENCES private_tester_invites(id) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE sync_recovery_passkeys (
  credential_id TEXT PRIMARY KEY NOT NULL,
  sync_id TEXT NOT NULL REFERENCES sync_recovery_accounts(sync_id) ON DELETE CASCADE,
  public_key TEXT NOT NULL,
  counter INTEGER NOT NULL CHECK(counter >= 0),
  label TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
--> statement-breakpoint
CREATE INDEX sync_recovery_passkeys_account ON sync_recovery_passkeys(sync_id);
--> statement-breakpoint
CREATE TABLE sync_recovery_codes (
  sync_id TEXT PRIMARY KEY NOT NULL REFERENCES sync_recovery_accounts(sync_id) ON DELETE CASCADE,
  code_hash TEXT NOT NULL
);
--> statement-breakpoint
CREATE TABLE sync_recovery_challenges (
  challenge TEXT PRIMARY KEY NOT NULL,
  purpose TEXT NOT NULL CHECK(purpose IN ('register', 'recover')),
  sync_id TEXT NOT NULL,
  browser_hash TEXT,
  expires_at INTEGER NOT NULL
);
--> statement-breakpoint
CREATE INDEX sync_recovery_challenges_expiry ON sync_recovery_challenges(expires_at);
