#!/usr/bin/env python3
"""Verify journaled and explicitly reviewed manual SQL without rewriting history."""
from pathlib import Path
import hashlib
import json
import sqlite3
import subprocess

root = Path(__file__).resolve().parents[1]
paths = sorted((root / "drizzle").glob("*.sql"))
journal = json.loads((root / "drizzle/meta/_journal.json").read_text())
journaled = len(journal["entries"])
assert [e["tag"] for e in journal["entries"]] == [p.stem for p in paths[:journaled]]
assert [e["idx"] for e in journal["entries"]] == list(range(journaled))
# Updates100/101 shipped these manual, additive migrations after snapshot0037.
# Preserve their exact original SQL and journal provenance. Never accept an
# unknown suffix or silently treat snapshot0037 as the current full schema.
manual = {
    "0038_participant_account_sync.sql": "d01407c4ed627052b3dd77058e967533374aecca9f4e93b293fbf20ba54d49e8",
    "0039_segmented_account_sync.sql": "38560d2630fe43bddf6899e34c32bd2df1c3ae48770b6f61f26a42b0876b7417",
}
assert [p.name for p in paths[journaled:]] == list(manual), "Unreviewed manual migration suffix"
for path in paths[journaled:]:
    assert hashlib.sha256(path.read_bytes()).hexdigest() == manual[path.name], path.name
snapshot = json.loads((root / "drizzle/meta" / (journal["entries"][-1]["tag"].split("_")[0] + "_snapshot.json")).read_text())

def check_columns(expected):
    tables = {r[0] for r in db.execute("SELECT name FROM sqlite_master WHERE type = 'table'")}
    assert tables - {"sqlite_sequence"} == set(expected), (tables, set(expected))
    for name, columns in expected.items():
        assert {r[1] for r in db.execute(f'PRAGMA table_info("{name}")')} == set(columns), name

db = sqlite3.connect(":memory:")
db.execute("PRAGMA foreign_keys = ON")
legacy_payload = json.dumps({"year": 2026, "methodology": "bounded-geometric-v1", "pairs": []})
for path in paths:
    if path.name == "0022_small_study_retention.sql":
        db.execute("INSERT INTO statistics_archive VALUES (?,?,?)", (2026,"bounded-geometric-v1",legacy_payload))
    db.executescript(path.read_text())
    if path.stem == journal["entries"][-1]["tag"]:
        check_columns({name: table["columns"] for name, table in snapshot["tables"].items()})
assert db.execute("SELECT payload FROM statistics_archive WHERE year=2026").fetchone()[0] == legacy_payload
try:
    db.execute("INSERT INTO statistics_archive VALUES (2027,'bounded-geometric-v1','{}')")
    raise AssertionError("Retired generator must not create new archive releases")
except sqlite3.IntegrityError:
    pass
current = json.loads(subprocess.check_output(["node", str(root / "scripts/read-schema-columns.mjs")], cwd=root, text=True))
check_columns({table["name"]: [column["name"] for column in table["columns"]] for table in current})
for table in current:
    actual = {row[1]: row[2].upper() for row in db.execute(f'PRAGMA table_info("{table["name"]}")')}
    assert actual == {column["name"]: column["type"] for column in table["columns"]}, table["name"]
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
db.executescript((root / "db/service-status.sql").read_text())
assert db.execute("SELECT COUNT(*) FROM sqlite_master WHERE sql IS NOT NULL AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_cf_%'").fetchone()[0] == 213
assert not db.execute("PRAGMA foreign_key_check").fetchall()
print(f"All {len(paths)} migrations apply: {journaled} journaled and {len(manual)} explicitly fingerprinted manual migrations. Historical snapshot and current ORM columns/types match at their respective boundaries; operational schema213, attachment ownership and cascade cleanup pass. Historical metadata unchanged.")
