import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';
import { VOTE_DATA_NOTICE_VERSION } from '../lib/vote-data-notice.ts';
import { inspectDatabase, sanitizeDatabase } from './recovery/recovery.mjs';

const sql = new DatabaseSync(':memory:');
sql.exec('PRAGMA foreign_keys=ON');
for (const file of readdirSync('drizzle').filter(name => name.endsWith('.sql')).sort()) {
  sql.exec(readFileSync(join('drizzle', file), 'utf8'));
}

function statement(query, args = []) {
  return {
    bind: (...values) => statement(query, values),
    async first() { return sql.prepare(query).get(...args) ?? null; },
    all() { return { results: sql.prepare(query).all(...args) }; },
  };
}
const db = {
  prepare: statement,
  async batch(statements) {
    sql.exec('BEGIN');
    try {
      const results = statements.map(item => item.all());
      sql.exec('COMMIT');
      return results;
    } catch (error) {
      sql.exec('ROLLBACK');
      throw error;
    }
  },
};
const session = 'a'.repeat(64);
const otherSession = 'b'.repeat(64);
const testerSession = 'c'.repeat(64);
const subject = 'invite:participant';
const browserId = crypto.randomUUID();
const legacyBrowserId = crypto.randomUUID();
const voteId = crypto.randomUUID();
const origin = 'https://fixture.invalid';
const now = Date.now();
const ownerToken = crypto.randomUUID();
let sessionHeader = '';
sql.prepare('INSERT INTO privacy_accounts(subject_id,submissions_enabled,agreement_version,agreed_at) VALUES(?,1,?,?)').run(subject,VOTE_DATA_NOTICE_VERSION,now);
sql.prepare("INSERT INTO privacy_accounts(subject_id) VALUES('invite:layout-test-only')").run();
const addSession = sql.prepare('INSERT INTO privacy_sessions VALUES(?,?,?)');
addSession.run(session,subject,now+3600_000);
addSession.run(otherSession,subject,now+3600_000);
addSession.run(testerSession,'invite:layout-test-only',now+3600_000);
sql.prepare('INSERT INTO listener_nicknames VALUES(?,?)').run(subject,'Synthetic listener');
const vote = sql.prepare("INSERT INTO votes(id,winner_id,loser_id,voter_id,created_at,test_mode) VALUES(?,'a','b',?,?,'blind')");
vote.run(voteId,browserId,now);
vote.run(crypto.randomUUID(),legacyBrowserId,0);
sql.prepare("INSERT INTO submission_owners(record_kind,record_id,subject_id,session_hash) VALUES('vote',?,?,?)").run(voteId,subject,session);
sql.prepare('UPDATE privacy_accounts SET submissions_enabled=0 WHERE subject_id=?').run(subject);

const dependencies = {
  'cloudflare:workers': { env: { DB: db, OWNER_ANALYTICS_TOKEN: ownerToken } },
  'next/headers': { headers: async () => new Headers({ 'x-yinyang-data-session': sessionHeader }) },
  'drizzle-orm': {}, '@/db': {}, '@/db/schema': {},
  '@/lib/vote-data-notice': { VOTE_DATA_NOTICE_VERSION },
  '@/lib/activity-monitoring': {},
};
function load(path) {
  const exports = {};
  const code = ts.transpileModule(readFileSync(path,'utf8'), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
  }).outputText;
  runInNewContext(code, { exports, require: name => dependencies[name], Response, Headers, URL, crypto, TextEncoder, TextDecoder });
  return exports;
}
for (const name of ['request-json','admin-contributions','submission-ownership','owner-access','browser-ownership-proof']) {
  dependencies['@/lib/'+name] = load('lib/'+name+'.ts');
}
const participant = load('app/api/my-data/browser-proof/route.ts');
const owner = load('app/api/owner-research/browser-proof/route.ts');
const issue = (id = browserId, site = origin) => participant.POST(request({ browserId: id }, site));
const redeem = (code, id = browserId, authorization = 'Bearer '+ownerToken, site = origin) =>
  owner.POST(request({ browserId: id, code }, site, authorization));
function request(body, site, authorization = '') {
  return new Request(origin + '/browser-proof', {
    method: 'POST',
    headers: { Origin: site, 'Content-Type': 'application/json', Authorization: authorization },
    body: JSON.stringify(body),
  });
}
async function create() {
  const response = await issue();
  assert.equal(response.headers.get('Cache-Control'),'private, no-store');
  const result = await response.json();
  assert.equal(response.status,200,result.error);
  assert(result.expiresAt > Date.now() && result.expiresAt <= Date.now()+600_000);
  return result.code;
}

assert.equal((await issue()).status,401);
sessionHeader = testerSession;
assert.equal((await issue()).status,403);
sessionHeader = otherSession;
assert.equal((await issue()).status,409,'another session on the same account is insufficient');
sessionHeader = session;
assert.equal((await issue(browserId,'https://other.invalid')).status,403);
assert.equal((await issue('invalid')).status,400);
assert.equal((await issue(legacyBrowserId)).status,409,'unlinked legacy evidence is insufficient');

const replaced = await create();
const code = await create();
assert.equal((await redeem(replaced)).status,409);
const stored = sql.prepare('SELECT * FROM browser_ownership_codes').all();
assert.equal(stored.length,1);
assert.match(stored[0].code_hash,/^[a-f0-9]{64}$/);
assert(!JSON.stringify(stored).includes(code) && !JSON.stringify(stored).includes(browserId));
assert.equal((await redeem(code,browserId,'')).status,403);
assert.equal((await redeem(code,browserId,'Bearer '+ownerToken,'https://other.invalid')).status,403);
assert.equal((await redeem(code,legacyBrowserId)).status,409);
const attempts = await Promise.all([redeem(code),redeem(code)]);
assert.deepEqual(attempts.map(response => response.status).sort(),[200,409]);
const success = attempts.find(response => response.ok);
assert.equal(success.headers.get('Cache-Control'),'private, no-store');
assert.deepEqual(await success.json(),{ browserId, accountId: subject, nickname: 'Synthetic listener' });

const expired = await create();
sql.prepare('UPDATE browser_ownership_codes SET expires_at=0').run();
assert.equal((await redeem(expired)).status,409);
const invalidated = await create();
sql.prepare("DELETE FROM submission_owners WHERE record_kind='vote' AND record_id=?").run(voteId);
assert.equal((await redeem(invalidated)).status,409,'lost evidence invalidates a code');
sql.prepare('DELETE FROM privacy_sessions WHERE token_hash=?').run(session);
assert.equal(sql.prepare('SELECT count(*) n FROM browser_ownership_codes').get().n,0,'session deletion erases the code');

const folder = mkdtempSync(join(tmpdir(),'browser-proof-recovery-'));
try {
  sql.prepare('INSERT INTO browser_ownership_codes VALUES(?,?,?)').run(otherSession,'synthetic-code-hash',now+60_000);
  const input = join(folder,'input.sqlite');
  sql.exec(`VACUUM INTO '${input.replaceAll("'", "''")}'`);
  assert.throws(() => inspectDatabase(input),/Active authentication/);
  const output = join(folder,'clean.sqlite');
  sanitizeDatabase(input,output);
  const clean = new DatabaseSync(output);
  try { assert.equal(clean.prepare('SELECT count(*) n FROM browser_ownership_codes').get().n,0); }
  finally { clean.close(); }
} finally {
  sql.close();
  rmSync(folder,{ recursive: true, force: true });
}
console.log('Browser ownership proof passed: private access, exact session binding, replacement, expiry, concurrent redemption, source removal and recovery sanitation.');
