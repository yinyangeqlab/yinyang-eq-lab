CREATE TABLE companion_library_grants (
  challenge TEXT PRIMARY KEY,
  subject_id TEXT NOT NULL,
  access_hash TEXT NOT NULL,
  session_hash TEXT NOT NULL,
  device_id TEXT NOT NULL REFERENCES account_device_status(id) ON DELETE CASCADE,
  expires_at INTEGER NOT NULL
);
CREATE INDEX companion_grants_subject ON companion_library_grants(subject_id,expires_at);
