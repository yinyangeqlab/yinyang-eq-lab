#!/usr/bin/env python3
"""Verify the real SQL chain, journal, current snapshot and attachment isolation."""
from pathlib import Path
import json
import sqlite3

root = Path(__file__).resolve().parents[1]
paths = sorted((root / "drizzle").glob("*.sql"))
journal = json.loads((root / "drizzle/meta/_journal.json").read_text())
assert [e["tag"] for e in journal["entries"]] == [p.stem for p in paths]
assert [e["idx"] for e in journal["entries"]] == list(range(len(paths)))
db = sqlite3.connect(":memory:")
db.execute("PRAGMA foreign_keys = ON")
for path in paths:
    db.executescript(path.read_text())
snapshot = json.loads((root / "drizzle/meta/0017_snapshot.json").read_text())
tables = {r[0] for r in db.execute("SELECT name FROM sqlite_master WHERE type = 'table'")}
assert tables == set(snapshot["tables"]), (tables, set(snapshot["tables"]))
for name, table in snapshot["tables"].items():
    assert {r[1] for r in db.execute(f'PRAGMA table_info("{name}")')} == set(table["columns"]), name
db.execute("INSERT INTO research_measurements (id,contributor_id,local_id,name,device,type,rig,files,created_at) VALUES (?,?,?,?,?,?,?,?,?)",
           ("sample", "browser", "local", "Example", "Example", "ie", "Example", "[]", 0))
db.execute("INSERT INTO research_measurement_chunks VALUES (?,?,?,?)", ("sample", "single", 0, "YWJj"))
try:
    db.execute("INSERT INTO research_measurement_chunks VALUES (?,?,?,?)", ("missing", "single", 0, "YWJj"))
    raise AssertionError("Orphaned original-file bytes must be rejected")
except sqlite3.IntegrityError:
    pass
db.execute("DELETE FROM research_measurements WHERE id = ?", ("sample",))
assert db.execute("SELECT COUNT(*) FROM research_measurement_chunks").fetchone()[0] == 0
print(f"All {len(paths)} migrations apply; journal and schema snapshot match; attachment ownership and cascade cleanup pass.")
