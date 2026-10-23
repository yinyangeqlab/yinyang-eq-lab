-- Anonymous, shareable shootouts. Additive only: no existing table, row, consent
-- or ranking is read or rewritten. A run stores only A/B choices, a coarse hour,
-- an optional self-described listening setup and whether curves were peeked at.
-- No IP address, cookie, user agent, account or exact timestamp is stored.
CREATE TABLE embed_shootouts (
 id TEXT PRIMARY KEY NOT NULL,
 manage_hash TEXT NOT NULL,
 title TEXT NOT NULL,
 target_ids TEXT NOT NULL CHECK(json_valid(target_ids)),
 created_at INTEGER NOT NULL,
 expires_at INTEGER NOT NULL,
 owner_share INTEGER NOT NULL DEFAULT 0 CHECK(owner_share IN (0,1)),
 owner_share_at INTEGER,
 owner_share_notice TEXT
);
--> statement-breakpoint
CREATE INDEX embed_shootouts_expires ON embed_shootouts(expires_at);
--> statement-breakpoint
CREATE TABLE embed_shootout_runs (
 id TEXT PRIMARY KEY NOT NULL,
 shootout_id TEXT NOT NULL REFERENCES embed_shootouts(id) ON DELETE CASCADE,
 hour INTEGER NOT NULL,
 listener_kind TEXT NOT NULL CHECK(listener_kind IN ('headphones','iem','speakers','other','unknown')),
 sighted INTEGER NOT NULL DEFAULT 0 CHECK(sighted IN (0,1)),
 picks TEXT NOT NULL CHECK(json_valid(picks))
);
--> statement-breakpoint
CREATE INDEX embed_shootout_runs_shootout ON embed_shootout_runs(shootout_id, hour);
