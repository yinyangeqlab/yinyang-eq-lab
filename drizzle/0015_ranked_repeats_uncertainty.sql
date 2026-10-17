-- Additive: preserves every existing vote, run, and pair claim for rollback.
ALTER TABLE votes ADD COLUMN reliability_weight REAL NOT NULL DEFAULT 0.5;
--> statement-breakpoint
ALTER TABLE listening_runs ADD COLUMN trial_id TEXT;
--> statement-breakpoint
CREATE UNIQUE INDEX listening_runs_trial_idx ON listening_runs (trial_id);
--> statement-breakpoint
CREATE TABLE public_write_penalties (
  key TEXT PRIMARY KEY NOT NULL,
  level INTEGER NOT NULL,
  hits INTEGER NOT NULL,
  blocked_until INTEGER NOT NULL,
  last_escalated_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);
