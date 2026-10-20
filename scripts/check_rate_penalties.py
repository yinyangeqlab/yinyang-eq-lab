"""Exercise the actual cooldown SQL with SQLite, including concurrent guards."""
from pathlib import Path
import re, sqlite3
root=Path(__file__).resolve().parent.parent
source=(root/'lib/rate-penalty.ts').read_text()
def sql(name):
    return re.search(r'export const '+name+r' = [`"](.*?)[`"];', source, re.S).group(1)
db=sqlite3.connect(':memory:'); db.row_factory=sqlite3.Row
db.execute('CREATE TABLE votes (id TEXT PRIMARY KEY)')
db.execute("INSERT INTO votes VALUES ('historical-vote')")
db.executescript((root/'drizzle/0014_research_records.sql').read_text().split('--> statement-breakpoint')[0])
for statement in (root/'drizzle/0015_ranked_repeats_uncertainty.sql').read_text().split('--> statement-breakpoint'):
    if statement.strip(): db.executescript(statement)
assert db.execute("SELECT reliability_weight FROM votes WHERE id = 'historical-vote'").fetchone()[0] == 0.5
# Historical unlinked runs remain allowed; new assigned trials are one-use.
run_columns = ['id','voter_id','test_mode','headphone_type','target_a_id','target_b_id','target_a_name','target_b_name','result','intervals','heard_a','heard_b','overlap_seconds','created_at','trial_id']
run_values = ['run-one','voter','blind','ie','a','b','Alpha','Beta','a','[]',6,6,0,1000,'trial-one']
insert = 'INSERT INTO listening_runs ('+','.join(run_columns)+') VALUES ('+','.join('?' for _ in run_columns)+')'
db.execute(insert,run_values)
try:
    db.execute(insert,['run-two']+run_values[1:])
    raise AssertionError('Replayed check was accepted')
except sqlite3.IntegrityError:
    pass
def start(now,until=None):
    until=until or now+60000
    return db.execute(sql('START_PENALTY_SQL'),('hashed-ip',until,now,now+172800000,now)).fetchone()
def hit(now):
    return db.execute(sql('BLOCKED_HIT_SQL'),('hashed-ip',now)).fetchone()
def escalate(now):
    return db.execute(sql('ESCALATE_PENALTY_SQL'),(now,now,now+172800000,'hashed-ip',now-60000,now)).fetchone()
now=1000000
row=start(now); assert row['level']==1 and row['blocked_until']==now+60000
assert start(now) is None, 'Concurrent over-limit requests must not stack penalties'
for _ in range(9): hit(now+1000)
assert escalate(now+1000) is None
hit(now+1000); row=escalate(now+1000)
assert row['level']==2 and row['blocked_until']==now+901000
assert escalate(now+1000) is None
for expected,delay in [(3,3600000),(4,21600000),(5,86400000),(5,86400000)]:
    now+=61000
    for _ in range(10): hit(now)
    row=escalate(now)
    assert row['level']==expected and row['blocked_until']==now+delay
assert hit(row['blocked_until']+1) is None
# A request arriving at/after expiry cannot escalate an old cooldown, even
# with old blocked-hit history. Respecting the wait starts the next incident fresh.
expired=row['blocked_until']
for _ in range(10): hit(expired-1)
assert escalate(expired) is None, 'Escalation must never extend an expired cooldown'
row=start(expired); assert row['level']==1 and row['hits']==0 and row['blocked_until']==expired+60000
# This also applies after a partial incident, before 48-hour retention expires.
hit(expired+1000)
row=start(expired+60000); assert row['level']==1 and row['hits']==0
assert row['blocked_until']==expired+120000
# Old records are harmless after retention as well.
now=row['expires_at']+1
row=start(now); assert row['level']==1
print('Cooldowns: ten blocked-hit threshold, concurrent guards, active-only escalation through 24 hours, and a fresh normal wait after every completed cooldown pass.')
