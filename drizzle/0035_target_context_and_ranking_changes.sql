ALTER TABLE targets ADD COLUMN headphone_type TEXT CHECK(headphone_type IN ('ie','oe'));
ALTER TABLE targets ADD COLUMN reference_system TEXT NOT NULL DEFAULT 'Unknown';
ALTER TABLE targets ADD COLUMN submission_kind TEXT NOT NULL DEFAULT 'target' CHECK(submission_kind IN ('target','device-eq'));
-- Coarse, site-wide causes only: no target, participant, submission, actor or exact time.
CREATE TABLE ranking_change_days(day TEXT NOT NULL,reason TEXT NOT NULL CHECK(reason IN ('records-removed','moderation','target-revision','eligibility','method-update')),method_version TEXT NOT NULL,PRIMARY KEY(day,reason,method_version));
CREATE TRIGGER ranking_change_vote_delete AFTER DELETE ON votes BEGIN INSERT OR IGNORE INTO ranking_change_days VALUES(date('now'),'records-removed','participant-balanced-fractional-bt-v2'); END;
CREATE TRIGGER ranking_change_run_delete AFTER DELETE ON listening_runs BEGIN INSERT OR IGNORE INTO ranking_change_days VALUES(date('now'),'records-removed','participant-balanced-fractional-bt-v2'); END;
CREATE TRIGGER ranking_change_moderation AFTER INSERT ON moderation_events BEGIN INSERT OR IGNORE INTO ranking_change_days VALUES(date('now'),'moderation','participant-balanced-fractional-bt-v2'); END;
CREATE TRIGGER ranking_change_target AFTER UPDATE OF points,measurement ON targets BEGIN INSERT OR IGNORE INTO ranking_change_days VALUES(date('now'),'target-revision','participant-balanced-fractional-bt-v2'); END;
CREATE TRIGGER ranking_change_target_status AFTER UPDATE OF status ON targets WHEN OLD.status!=NEW.status BEGIN INSERT OR IGNORE INTO ranking_change_days VALUES(date('now'),'eligibility','participant-balanced-fractional-bt-v2'); END;
CREATE TRIGGER ranking_change_participation AFTER UPDATE OF submissions_enabled ON privacy_accounts WHEN OLD.submissions_enabled!=NEW.submissions_enabled BEGIN INSERT OR IGNORE INTO ranking_change_days VALUES(date('now'),'eligibility','participant-balanced-fractional-bt-v2'); END;
CREATE TRIGGER ranking_revision_target_context AFTER UPDATE OF headphone_type,reference_system,submission_kind ON targets BEGIN UPDATE ranking_revision SET revision=revision+1 WHERE id=1; INSERT OR IGNORE INTO ranking_change_days VALUES(date('now'),'eligibility','participant-balanced-fractional-bt-v2'); END;
CREATE TRIGGER ranking_change_target_delete AFTER DELETE ON targets BEGIN INSERT OR IGNORE INTO ranking_change_days VALUES(date('now'),'records-removed','participant-balanced-fractional-bt-v2'); END;
