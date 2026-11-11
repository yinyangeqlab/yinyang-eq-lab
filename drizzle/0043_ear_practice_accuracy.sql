ALTER TABLE ear_practice_scores ADD COLUMN accuracy_sum REAL NOT NULL DEFAULT 0
  CHECK (accuracy_sum >= 0 AND accuracy_sum <= 100 * attempts);
