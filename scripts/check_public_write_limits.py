#!/usr/bin/env python3
"""Check the hosted write-limit migration and its atomic counter statement."""
import sqlite3
from pathlib import Path

root = Path(__file__).resolve().parents[1]
db = sqlite3.connect(':memory:')
db.executescript((root / 'drizzle' / '0011_public_write_limits.sql').read_text())
statement = '''
    INSERT INTO public_write_limits (key, window_start, count, expires_at) VALUES (?, ?, 1, ?)
    ON CONFLICT(key) DO UPDATE SET
      count = CASE WHEN window_start = excluded.window_start THEN count + 1 ELSE 1 END,
      window_start = excluded.window_start,
      expires_at = excluded.expires_at
    RETURNING count
'''
assert db.execute(statement, ('minute:client', 1, 120000)).fetchone()[0] == 1
assert db.execute(statement, ('minute:client', 1, 120000)).fetchone()[0] == 2
assert db.execute(statement, ('minute:client', 2, 180000)).fetchone()[0] == 1
assert db.execute('DELETE FROM public_write_limits WHERE expires_at < ?', (200000,)).rowcount == 1
print('Public write-limit counters increment and reset by window.')
