-- Owner-controlled operational configuration only; contains no listener data.
CREATE TABLE IF NOT EXISTS site_service_status (
 id INTEGER PRIMARY KEY CHECK(id=1),
 revision TEXT NOT NULL,
 message TEXT NOT NULL CHECK(length(message)<=500),
 pause_submissions INTEGER NOT NULL CHECK(pause_submissions IN (0,1)),
 expires_at INTEGER NOT NULL
);
