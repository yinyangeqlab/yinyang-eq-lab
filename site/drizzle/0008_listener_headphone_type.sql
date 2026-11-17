ALTER TABLE votes ADD COLUMN headphone_type TEXT;
CREATE INDEX votes_headphone_type_idx ON votes(headphone_type);
