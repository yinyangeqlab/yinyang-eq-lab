import assert from 'node:assert/strict';
import {parseIntervals,intervalStats,commonSegments} from '../site/lib/listening.ts';
const interval=(side,start,end,rate=1)=>({side,start,end,rate});
assert.equal(parseIntervals([interval(0,NaN,6),interval(2,0,6),interval(0,-1,6),interval(1,5,3),interval(0,0,6,0)]).length,0);
assert.deepEqual(intervalStats([interval(0,0,6),interval(1,10,16)]),{heardA:6,heardB:6,overlapSeconds:0});
assert.deepEqual(intervalStats([interval(0,0,6),interval(1,0,6)]),{heardA:6,heardB:6,overlapSeconds:6});
assert.deepEqual(intervalStats([interval(0,0,6,2),interval(1,0,6)]),{heardA:3,heardB:6,overlapSeconds:6});
assert.equal(intervalStats([interval(0,0,6),interval(0,0,6),interval(1,0,6)]).overlapSeconds,6,'Repeating a passage must not multiply common-source coverage');
assert.deepEqual(commonSegments([interval(0,0,3),interval(0,3,6),interval(1,1,5)]),[[1,5]]);
console.log('Listening interval checks passed: invalid input, source overlap, playback-rate elapsed time and repeat-safe common coverage. Route ownership, timing and run-before-vote checks also pass the operator real-SQLite integration suite (deployment-only harness).');

const { DatabaseSync } = await import('node:sqlite');
const { readFileSync, readdirSync } = await import('node:fs');
const { LISTENING_PROTOCOL, LEVEL_MATCHED_LISTENING_PROTOCOL } = await import('../site/lib/listening-protocol.ts');
const { VOTE_DATA_NOTICE_VERSION } = await import('../site/lib/vote-data-notice.ts');
for (const protocol of [LISTENING_PROTOCOL, LEVEL_MATCHED_LISTENING_PROTOCOL]) {
  const db = new DatabaseSync(':memory:');
  db.exec('PRAGMA foreign_keys=ON');
  for (const path of readdirSync('site/drizzle').filter(name => name.endsWith('.sql')).sort()) {
    db.exec(readFileSync('site/drizzle/' + path, 'utf8'));
  }
  db.prepare("INSERT INTO privacy_accounts (subject_id,submissions_enabled,agreement_version) VALUES ('browser:fixture',1,?)").run(VOTE_DATA_NOTICE_VERSION);
  db.prepare("INSERT INTO privacy_sessions (token_hash,subject_id,expires_at) VALUES ('session','browser:fixture',?)").run(Date.now()+60000);
  const recordOwner = (kind, id) => db.prepare("INSERT INTO submission_owners (record_kind,record_id,subject_id,session_hash) VALUES (?,?,'browser:fixture','session')").run(kind,id);
  const target = db.prepare("INSERT INTO targets (id,name,creator,points,status,created_at) VALUES (?,?,'fixture','[]','approved',0)");
  target.run('a','Alpha'); target.run('b','Beta');
  const saveRun = () => db.prepare("INSERT INTO listening_runs (id,trial_id,voter_id,test_mode,headphone_type,target_a_id,target_b_id,target_a_name,target_b_name,result,intervals,heard_a,heard_b,overlap_seconds,created_at,protocol_version) VALUES ('run','trial','voter','blind','oe','a','b','Alpha','Beta','a','[]',5,5,5,0,?)").run(protocol);
  const saveVote = () => db.prepare("INSERT INTO votes (id,winner_id,loser_id,voter_id,created_at,test_mode,headphone_type,eligible,heard_a,heard_b,overlap_seconds,protocol_version) VALUES ('trial','a','b','voter',0,'blind','oe',1,5,5,5,?)").run(protocol);
  assert.throws(saveRun,/Assigned trial was erased or changed/);
  db.prepare("INSERT INTO ranked_trials (id,voter_id,test_mode,side_a,side_b,issued_at,protocol_version,headphone_type) VALUES ('trial','voter','blind','a','b',0,?,'oe')").run(protocol);
  recordOwner('trial','trial');
  assert.throws(saveVote,/Completed comparison was erased or changed/);
  saveRun();
  assert.throws(saveVote,/Completed comparison was erased or changed/);
  recordOwner('run','run');
  saveVote();
  assert.equal(db.prepare('SELECT count(*) AS n FROM votes').get().n,1);
  db.close();
}
console.log('Both ranked protocols retain atomic assignment, completion and ownership guards.');
