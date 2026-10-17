CREATE TABLE ranked_trials (
  id TEXT PRIMARY KEY NOT NULL,
  voter_id TEXT NOT NULL,
  test_mode TEXT NOT NULL,
  side_a TEXT NOT NULL,
  side_b TEXT NOT NULL,
  issued_at INTEGER NOT NULL
);
--> statement-breakpoint
CREATE INDEX ranked_trials_voter_issued_idx ON ranked_trials (voter_id, issued_at);
--> statement-breakpoint
CREATE TABLE ranked_pair_claims (
  voter_id TEXT NOT NULL,
  test_mode TEXT NOT NULL,
  first_id TEXT NOT NULL,
  second_id TEXT NOT NULL,
  trial_id TEXT NOT NULL,
  PRIMARY KEY (voter_id, test_mode, first_id, second_id)
);
--> statement-breakpoint
INSERT OR IGNORE INTO ranked_pair_claims (voter_id, test_mode, first_id, second_id, trial_id)
SELECT voter_id, test_mode, min(winner_id, loser_id), max(winner_id, loser_id), id
FROM votes WHERE test_mode IN ('blind', 'bring') AND eligible = 1;
