-- Extend the existing atomic trial and completed-run checks to the 20-band protocol.
DROP TRIGGER completed_run_trial_guard;
DROP TRIGGER completed_vote_run_guard;
CREATE TRIGGER completed_run_trial_guard BEFORE INSERT ON listening_runs
WHEN NEW.protocol_version IN ('matched-passage-v2','joint-20-passage-level-v1') AND NEW.test_mode IN ('blind','bring') AND NOT EXISTS(
 SELECT 1 FROM ranked_trials t JOIN submission_owners o ON o.record_kind='trial' AND o.record_id=t.id
 WHERE t.id=NEW.trial_id AND t.protocol_version=NEW.protocol_version AND t.voter_id=NEW.voter_id AND t.test_mode=NEW.test_mode
 AND t.headphone_type=NEW.headphone_type AND t.side_a=NEW.target_a_id AND t.side_b=NEW.target_b_id)
BEGIN SELECT RAISE(ABORT,'Assigned trial was erased or changed'); END;
CREATE TRIGGER completed_vote_run_guard BEFORE INSERT ON votes
WHEN NEW.protocol_version IN ('matched-passage-v2','joint-20-passage-level-v1') AND NOT EXISTS(
 SELECT 1 FROM listening_runs r JOIN ranked_trials t ON t.id=r.trial_id
 JOIN submission_owners a ON a.record_kind='run' AND a.record_id=r.id
 JOIN submission_owners b ON b.record_kind='trial' AND b.record_id=t.id AND b.subject_id=a.subject_id
 WHERE t.id=NEW.id AND t.protocol_version=NEW.protocol_version AND r.protocol_version=NEW.protocol_version
 AND r.voter_id=NEW.voter_id AND r.test_mode=NEW.test_mode AND r.headphone_type=NEW.headphone_type
 AND r.target_a_id=t.side_a AND r.target_b_id=t.side_b
 AND ((r.result='a' AND NEW.winner_id=t.side_a AND NEW.loser_id=t.side_b) OR (r.result='b' AND NEW.winner_id=t.side_b AND NEW.loser_id=t.side_a))
 AND NEW.heard_a=r.heard_a AND NEW.heard_b=r.heard_b AND NEW.overlap_seconds=r.overlap_seconds
 AND r.heard_a>=5 AND r.heard_b>=5 AND r.overlap_seconds>=5)
BEGIN SELECT RAISE(ABORT,'Completed comparison was erased or changed'); END;
