ALTER TABLE companion_library_grants ADD COLUMN personal_ranks INTEGER NOT NULL DEFAULT 0
  CONSTRAINT companion_personal_ranks_scope CHECK (personal_ranks IN (0, 1));
