-- Explicit, ownership-checked links. Never infer ownership from a browser ID.
CREATE TABLE comparison_records (
 record_kind TEXT NOT NULL CHECK(record_kind IN ('run','vote','open','trial','feedback')),
 record_id TEXT NOT NULL,
 comparison_id TEXT NOT NULL,
 PRIMARY KEY(record_kind,record_id)
);
CREATE INDEX comparison_records_group_idx ON comparison_records(comparison_id);
CREATE TRIGGER comparison_link_owner_guard BEFORE INSERT ON comparison_records
WHEN NOT EXISTS(SELECT 1 FROM submission_owners WHERE record_kind=NEW.record_kind AND record_id=NEW.record_id)
 OR EXISTS(SELECT 1 FROM comparison_records c JOIN submission_owners o ON o.record_kind=c.record_kind AND o.record_id=c.record_id
 WHERE c.comparison_id=NEW.comparison_id AND o.subject_id!=(SELECT subject_id FROM submission_owners WHERE record_kind=NEW.record_kind AND record_id=NEW.record_id))
BEGIN SELECT RAISE(ABORT,'Verified common ownership required for comparison links'); END;
INSERT INTO comparison_records SELECT o.record_kind,o.record_id,
 CASE WHEN o.record_kind='run' THEN COALESCE((SELECT trial_id FROM listening_runs WHERE id=o.record_id),o.record_id) ELSE o.record_id END
 FROM submission_owners o WHERE o.record_kind IN ('run','vote','open','trial');
-- Deployment-specific ownership repairs are omitted from public source.
ALTER TABLE ranked_trials ADD COLUMN protocol_version TEXT NOT NULL DEFAULT 'legacy-v1';
ALTER TABLE listening_runs ADD COLUMN protocol_version TEXT NOT NULL DEFAULT 'legacy-v1';
ALTER TABLE listening_runs ADD COLUMN research_context TEXT;
ALTER TABLE votes ADD COLUMN protocol_version TEXT NOT NULL DEFAULT 'legacy-v1';
-- Retire the incremental Elo cache: the API derives ratings from retained evidence.
-- Physical counters are rebuilt below and maintained on all source changes.
CREATE VIEW retained_decisive_votes AS SELECT v.* FROM votes v
 JOIN targets a ON a.id=v.winner_id AND a.status='approved'
 JOIN targets b ON b.id=v.loser_id AND b.status='approved'
 WHERE v.eligible=1 AND v.test_mode IN ('blind','bring') AND v.heard_a>=5 AND v.heard_b>=5
 AND v.winner_id!=v.loser_id
 AND COALESCE((SELECT action FROM moderation_events WHERE record_kind='vote' AND record_id=v.id ORDER BY sequence DESC LIMIT 1),'restore')!='remove'
 AND NOT EXISTS(SELECT 1 FROM listening_runs run WHERE run.trial_id=v.id AND COALESCE((SELECT action FROM moderation_events WHERE record_kind='run' AND record_id=run.id ORDER BY sequence DESC LIMIT 1),'restore')='remove');
CREATE INDEX votes_winner_idx ON votes(winner_id);
CREATE INDEX votes_loser_idx ON votes(loser_id);
UPDATE targets SET rating=1500,wins=(SELECT COUNT(*) FROM retained_decisive_votes v WHERE v.winner_id=targets.id),losses=(SELECT COUNT(*) FROM retained_decisive_votes v WHERE v.loser_id=targets.id);
CREATE TRIGGER rebuild_counts_votes_insert AFTER INSERT ON votes BEGIN UPDATE targets SET rating=1500,wins=(SELECT COUNT(*) FROM retained_decisive_votes v WHERE v.winner_id=targets.id),losses=(SELECT COUNT(*) FROM retained_decisive_votes v WHERE v.loser_id=targets.id) WHERE id IN (NEW.winner_id,NEW.loser_id); END;
CREATE TRIGGER rebuild_counts_votes_update AFTER UPDATE ON votes BEGIN UPDATE targets SET rating=1500,wins=(SELECT COUNT(*) FROM retained_decisive_votes v WHERE v.winner_id=targets.id),losses=(SELECT COUNT(*) FROM retained_decisive_votes v WHERE v.loser_id=targets.id) WHERE id IN (OLD.winner_id,OLD.loser_id,NEW.winner_id,NEW.loser_id); END;
CREATE TRIGGER rebuild_counts_votes_delete AFTER DELETE ON votes BEGIN UPDATE targets SET rating=1500,wins=(SELECT COUNT(*) FROM retained_decisive_votes v WHERE v.winner_id=targets.id),losses=(SELECT COUNT(*) FROM retained_decisive_votes v WHERE v.loser_id=targets.id) WHERE id IN (OLD.winner_id,OLD.loser_id); END;
CREATE TRIGGER rebuild_counts_moderation_events_insert AFTER INSERT ON moderation_events BEGIN UPDATE targets SET rating=1500,wins=(SELECT COUNT(*) FROM retained_decisive_votes v WHERE v.winner_id=targets.id),losses=(SELECT COUNT(*) FROM retained_decisive_votes v WHERE v.loser_id=targets.id) WHERE EXISTS(SELECT 1 FROM votes v WHERE ((NEW.record_kind='vote' AND v.id=NEW.record_id)) AND targets.id IN (v.winner_id,v.loser_id)) OR EXISTS(SELECT 1 FROM listening_runs r WHERE ((NEW.record_kind='run' AND r.id=NEW.record_id)) AND targets.id IN (r.target_a_id,r.target_b_id)); END;
CREATE TRIGGER rebuild_counts_moderation_events_update AFTER UPDATE ON moderation_events BEGIN UPDATE targets SET rating=1500,wins=(SELECT COUNT(*) FROM retained_decisive_votes v WHERE v.winner_id=targets.id),losses=(SELECT COUNT(*) FROM retained_decisive_votes v WHERE v.loser_id=targets.id) WHERE EXISTS(SELECT 1 FROM votes v WHERE ((OLD.record_kind='vote' AND v.id=OLD.record_id) OR (NEW.record_kind='vote' AND v.id=NEW.record_id)) AND targets.id IN (v.winner_id,v.loser_id)) OR EXISTS(SELECT 1 FROM listening_runs r WHERE ((OLD.record_kind='run' AND r.id=OLD.record_id) OR (NEW.record_kind='run' AND r.id=NEW.record_id)) AND targets.id IN (r.target_a_id,r.target_b_id)); END;
CREATE TRIGGER rebuild_counts_moderation_events_delete AFTER DELETE ON moderation_events BEGIN UPDATE targets SET rating=1500,wins=(SELECT COUNT(*) FROM retained_decisive_votes v WHERE v.winner_id=targets.id),losses=(SELECT COUNT(*) FROM retained_decisive_votes v WHERE v.loser_id=targets.id) WHERE EXISTS(SELECT 1 FROM votes v WHERE ((OLD.record_kind='vote' AND v.id=OLD.record_id)) AND targets.id IN (v.winner_id,v.loser_id)) OR EXISTS(SELECT 1 FROM listening_runs r WHERE ((OLD.record_kind='run' AND r.id=OLD.record_id)) AND targets.id IN (r.target_a_id,r.target_b_id)); END;
CREATE TRIGGER rebuild_counts_listening_runs_insert AFTER INSERT ON listening_runs BEGIN UPDATE targets SET rating=1500,wins=(SELECT COUNT(*) FROM retained_decisive_votes v WHERE v.winner_id=targets.id),losses=(SELECT COUNT(*) FROM retained_decisive_votes v WHERE v.loser_id=targets.id) WHERE id IN (NEW.target_a_id,NEW.target_b_id); END;
CREATE TRIGGER rebuild_counts_listening_runs_update AFTER UPDATE ON listening_runs BEGIN UPDATE targets SET rating=1500,wins=(SELECT COUNT(*) FROM retained_decisive_votes v WHERE v.winner_id=targets.id),losses=(SELECT COUNT(*) FROM retained_decisive_votes v WHERE v.loser_id=targets.id) WHERE id IN (OLD.target_a_id,OLD.target_b_id,NEW.target_a_id,NEW.target_b_id); END;
CREATE TRIGGER rebuild_counts_listening_runs_delete AFTER DELETE ON listening_runs BEGIN UPDATE targets SET rating=1500,wins=(SELECT COUNT(*) FROM retained_decisive_votes v WHERE v.winner_id=targets.id),losses=(SELECT COUNT(*) FROM retained_decisive_votes v WHERE v.loser_id=targets.id) WHERE id IN (OLD.target_a_id,OLD.target_b_id); END;
CREATE TRIGGER rebuild_counts_target_status AFTER UPDATE OF status ON targets BEGIN UPDATE targets SET rating=1500,wins=(SELECT COUNT(*) FROM retained_decisive_votes v WHERE v.winner_id=targets.id),losses=(SELECT COUNT(*) FROM retained_decisive_votes v WHERE v.loser_id=targets.id); END;

ALTER TABLE ranked_trials ADD COLUMN target_versions TEXT;
ALTER TABLE ranked_trials ADD COLUMN headphone_type TEXT;
CREATE TRIGGER comparison_link_update_guard BEFORE UPDATE ON comparison_records
WHEN EXISTS(SELECT 1 FROM comparison_records c JOIN submission_owners o ON o.record_kind=c.record_kind AND o.record_id=c.record_id WHERE c.comparison_id=NEW.comparison_id AND o.subject_id!=(SELECT subject_id FROM submission_owners WHERE record_kind=NEW.record_kind AND record_id=NEW.record_id))
BEGIN SELECT RAISE(ABORT,'Comparison links cannot cross verified owners'); END;

CREATE TABLE ranking_revision(id INTEGER PRIMARY KEY CHECK(id=1), revision INTEGER NOT NULL);
INSERT INTO ranking_revision VALUES (1,1);
CREATE TRIGGER ranking_revision_votes_insert AFTER INSERT ON votes BEGIN UPDATE ranking_revision SET revision=revision+1 WHERE id=1; END;
CREATE TRIGGER ranking_revision_votes_update AFTER UPDATE ON votes BEGIN UPDATE ranking_revision SET revision=revision+1 WHERE id=1; END;
CREATE TRIGGER ranking_revision_votes_delete AFTER DELETE ON votes BEGIN UPDATE ranking_revision SET revision=revision+1 WHERE id=1; END;
CREATE TRIGGER ranking_revision_listening_runs_insert AFTER INSERT ON listening_runs BEGIN UPDATE ranking_revision SET revision=revision+1 WHERE id=1; END;
CREATE TRIGGER ranking_revision_listening_runs_update AFTER UPDATE ON listening_runs BEGIN UPDATE ranking_revision SET revision=revision+1 WHERE id=1; END;
CREATE TRIGGER ranking_revision_listening_runs_delete AFTER DELETE ON listening_runs BEGIN UPDATE ranking_revision SET revision=revision+1 WHERE id=1; END;
CREATE TRIGGER ranking_revision_moderation_events_insert AFTER INSERT ON moderation_events BEGIN UPDATE ranking_revision SET revision=revision+1 WHERE id=1; END;
CREATE TRIGGER ranking_revision_moderation_events_update AFTER UPDATE ON moderation_events BEGIN UPDATE ranking_revision SET revision=revision+1 WHERE id=1; END;
CREATE TRIGGER ranking_revision_moderation_events_delete AFTER DELETE ON moderation_events BEGIN UPDATE ranking_revision SET revision=revision+1 WHERE id=1; END;
CREATE TRIGGER ranking_revision_submission_owners_insert AFTER INSERT ON submission_owners BEGIN UPDATE ranking_revision SET revision=revision+1 WHERE id=1; END;
CREATE TRIGGER ranking_revision_submission_owners_update AFTER UPDATE ON submission_owners BEGIN UPDATE ranking_revision SET revision=revision+1 WHERE id=1; END;
CREATE TRIGGER ranking_revision_submission_owners_delete AFTER DELETE ON submission_owners BEGIN UPDATE ranking_revision SET revision=revision+1 WHERE id=1; END;
CREATE TRIGGER ranking_revision_targets AFTER UPDATE OF status,points,measurement ON targets BEGIN UPDATE ranking_revision SET revision=revision+1 WHERE id=1; END;

ALTER TABLE comparison_choices ADD COLUMN protocol_version TEXT NOT NULL DEFAULT 'legacy-v1';
CREATE TRIGGER completed_run_trial_guard BEFORE INSERT ON listening_runs
WHEN NEW.protocol_version='matched-passage-v2' AND NEW.test_mode IN ('blind','bring') AND NOT EXISTS(
 SELECT 1 FROM ranked_trials t JOIN submission_owners o ON o.record_kind='trial' AND o.record_id=t.id
 WHERE t.id=NEW.trial_id AND t.protocol_version=NEW.protocol_version AND t.voter_id=NEW.voter_id AND t.test_mode=NEW.test_mode
 AND t.headphone_type=NEW.headphone_type AND t.side_a=NEW.target_a_id AND t.side_b=NEW.target_b_id)
BEGIN SELECT RAISE(ABORT,'Assigned trial was erased or changed'); END;
CREATE TRIGGER completed_vote_run_guard BEFORE INSERT ON votes
WHEN NEW.protocol_version='matched-passage-v2' AND NOT EXISTS(
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
CREATE TRIGGER completed_open_run_guard BEFORE INSERT ON comparison_choices
WHEN NEW.protocol_version='matched-passage-v2' AND NOT EXISTS(
 SELECT 1 FROM listening_runs r JOIN submission_owners o ON o.record_kind='run' AND o.record_id=r.id
 WHERE r.id=NEW.id AND r.protocol_version=NEW.protocol_version AND r.test_mode='open' AND r.voter_id=NEW.participant_id
 AND r.target_a_id=NEW.target_a_id AND r.target_b_id=NEW.target_b_id AND r.result=NEW.result AND r.headphone_type=NEW.headphone_type)
BEGIN SELECT RAISE(ABORT,'Completed Open comparison was erased or changed'); END;
