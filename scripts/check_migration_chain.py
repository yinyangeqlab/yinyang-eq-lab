#!/usr/bin/env python3
"""Verify journaled and explicitly reviewed manual SQL without rewriting history."""
from pathlib import Path
import hashlib
import json
import sqlite3
import subprocess

root = Path(__file__).resolve().parents[1]
paths = sorted((root / "site/drizzle").glob("*.sql"))
journal = json.loads((root / "site/drizzle/meta/_journal.json").read_text())
journaled = len(journal["entries"])
assert [e["tag"] for e in journal["entries"]] == [p.stem for p in paths[:journaled]]
assert [e["idx"] for e in journal["entries"]] == list(range(journaled))
# Additive migrations authored after snapshot0037 use a separately fingerprinted SQL chain.
# Preserve their exact original SQL and journal provenance. Never accept an
# unknown suffix or silently treat snapshot0037 as the current full schema.
manual = {
    "0038_participant_account_sync.sql": "d01407c4ed627052b3dd77058e967533374aecca9f4e93b293fbf20ba54d49e8",
    "0039_segmented_account_sync.sql": "38560d2630fe43bddf6899e34c32bd2df1c3ae48770b6f61f26a42b0876b7417",
    "0040_target_removal_requests.sql": "8c52c5b626b5e6fe5587ded958557d46b52410f541124a6620904f6d5d84d0f9",
    "0041_embed_shootouts.sql": "de9dbc88e900086caa6b3646cab07e5fcfb476da2b17c54f94f69b4e1e0a6a5f",
    "0042_ear_practice_rankings.sql": "355a9e1748ba965bf1b6f9ea6d9993122cac5ec299662d6868051facc3ad26d1",
    "0043_ear_practice_accuracy.sql": "2cd5bb97ce88dfd6eaca24d0c64711bfe99eb68164b41a74118a29a2da41b3d3",
    "0044_browser_ownership_codes.sql": "45c684b8f84f51e445bfef07d108ba7058331fe7966442c29130ef0f19d7a92a",
    "0045_eq_preset_reactions.sql": "c80ac98549609535c84cca8170c8c377025ca095633df15915e291f3c5eb5259",
    "0046_companion_library.sql": "957ed43fab698b5582602a751e37ab31ea640c31fb329829326c03ff7c9cb36f",
    "0047_companion_preset_history.sql": "710098e15bc75b112ee0dfc77e6c36bce1eb2274170af126b8374a6a50cd205b",
    "0048_companion_personal_ranks.sql": "f3691c00aa3f5311e5c2e50d96d4e63a7e369379d69fe55aa522a80f7dbd5bb9",
    "0049_sync_account_recovery.sql": "ed580183d8957794e3729701f809e52ac3ba4c83fa318b339721f9ff18e4012f",
    "0050_joint_ranked_guards.sql": "7af9c99c8cfeb75fd926a33e972543870cdad576a2d9422af07250607ab77bcc",
    "0051_privacy_session_expiry_index.sql": "1e3cec014d59341c34f14c672b863219875cbecb89a3f29caa2fb3973f2d7016",
}
assert [p.name for p in paths[journaled:]] == list(manual), "Unreviewed manual migration suffix"
for path in paths[journaled:]:
    assert hashlib.sha256(path.read_bytes()).hexdigest() == manual[path.name], path.name
snapshot = json.loads((root / "site/drizzle/meta" / (journal["entries"][-1]["tag"].split("_")[0] + "_snapshot.json")).read_text())

def check_columns(expected):
    tables = {r[0] for r in db.execute("SELECT name FROM sqlite_master WHERE type = 'table'")}
    assert tables - {"sqlite_sequence"} == set(expected), (tables, set(expected))
    for name, columns in expected.items():
        assert {r[1] for r in db.execute(f'PRAGMA table_info("{name}")')} == set(columns), name

db = sqlite3.connect(":memory:")
db.execute("PRAGMA foreign_keys = ON")
legacy_payload = json.dumps({"year": 2026, "methodology": "bounded-geometric-v1", "pairs": []})
session_fixture = [("before", "subject", 999), ("cutoff", "subject", 1000), ("active", "subject", 1001)]
for path in paths:
    if path.name == "0022_small_study_retention.sql":
        db.execute("INSERT INTO statistics_archive VALUES (?,?,?)", (2026,"bounded-geometric-v1",legacy_payload))
    if path.name == "0051_privacy_session_expiry_index.sql":
        db.executemany("INSERT INTO privacy_sessions VALUES (?,?,?)", session_fixture)
        db.executemany("INSERT INTO browser_ownership_codes VALUES (?,?,?)",
                       [("cutoff", "expired-code", 1001), ("active", "active-code", 1001)])
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
assert db.execute("SELECT * FROM privacy_sessions ORDER BY expires_at").fetchall() == session_fixture
expiry_index = "privacy_sessions_expires_at_idx"
assert [row[2] for row in db.execute(f"PRAGMA index_info('{expiry_index}')")] == ["expires_at"]
cleanup = "DELETE FROM privacy_sessions WHERE expires_at<=?"
plan = db.execute("EXPLAIN QUERY PLAN " + cleanup, (1000,)).fetchall()
assert any("SEARCH privacy_sessions" in row[3] and expiry_index in row[3] for row in plan), plan
db.execute(cleanup, (1000,))
assert db.execute("SELECT * FROM privacy_sessions").fetchall() == [session_fixture[-1]]
assert db.execute("SELECT session_hash, code_hash FROM browser_ownership_codes").fetchall() == [("active", "active-code")]
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
db.executescript((root / "site/db/service-status.sql").read_text())
assert db.execute("SELECT COUNT(*) FROM sqlite_master WHERE sql IS NOT NULL AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_cf_%'").fetchone()[0] == 241
assert not db.execute("PRAGMA foreign_key_check").fetchall()
print(f"All {len(paths)} migrations apply: {journaled} journaled and {len(manual)} explicitly fingerprinted manual migrations. Historical snapshot and current ORM columns/types match at their respective boundaries. Operational schema241, indexed session cleanup, attachment ownership and cascades pass. Historical metadata unchanged.")
