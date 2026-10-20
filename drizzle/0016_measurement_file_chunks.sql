CREATE TABLE research_measurement_chunks (
  measurement_id TEXT NOT NULL REFERENCES research_measurements(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,
  chunk_index INTEGER NOT NULL,
  base64 TEXT NOT NULL,
  PRIMARY KEY (measurement_id, kind, chunk_index)
);
