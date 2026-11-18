import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import vm from 'node:vm';
import ts from 'typescript';
import * as scoring from '../../../site/lib/preference-ranking.ts';
import { approvedEqModels } from '../../../site/data/approved-eq-models.ts';
import { VOTE_DATA_NOTICE_VERSION } from '../../../site/lib/vote-data-notice.ts';

const sqlite = new DatabaseSync(':memory:');
sqlite.exec('PRAGMA foreign_keys=ON');
for (const file of readdirSync('site/drizzle').filter(name => /^\d{4}.*\.sql$/.test(name)).sort()) {
  sqlite.exec(readFileSync('site/drizzle/' + file, 'utf8'));
}
let beforeWrite;
const db = {
  prepare(sql) {
    return {
      args: [],
      bind(...args) { this.args = args; return this; },
      async first() {
        if (/^\s*INSERT INTO eq_preset_reactions/.test(sql)) { beforeWrite?.(); beforeWrite = undefined; }
        return sqlite.prepare(sql).get(...this.args) ?? null;
      },
      async run() { return sqlite.prepare(sql).run(...this.args); },
      async all() { return { results: sqlite.prepare(sql).all(...this.args) }; },
    };
  },
  async batch(statements) {
    sqlite.exec('BEGIN');
    try {
      for (const statement of statements) await statement.run();
      sqlite.exec('COMMIT');
    } catch (error) { sqlite.exec('ROLLBACK'); throw error; }
  },
};
function load(path, imports = {}) {
  const exports = {};
  const code = ts.transpileModule(readFileSync(path, 'utf8'), { compilerOptions: {
    target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS,
  }}).outputText;
  vm.runInNewContext(code, { exports, require(id) { assert.ok(id in imports, id); return imports[id]; }, Request, Response, URL, crypto, TextDecoder });
  return exports;
}
const inputs = load('site/lib/request-json.ts');
const admin = load('site/lib/admin-contributions.ts', { '@/lib/request-json': inputs });
const rankings = load('site/lib/eq-rankings.ts', {
  '../data/approved-eq-models': { approvedEqModels }, './preference-ranking': scoring,
});
const modelId = 'hifiman-arya-stealth';
const v3 = rankings.getPublishedEqPreview(modelId, 'arya-stealth-v3', '4cc7eb3f648b7199ba3e187c18a9f00e178a05dc947e33e8de80eecfb1c53377');
assert.equal(v3?.preset.credit, 'trudenpa');
assert.deepEqual(v3?.preset.tags, ['Diamond', 'YYT1']);
assert.equal(v3?.preview.path, '/eq-presets/arya-stealth-v3.txt');
const arya = rankings.eqRankingsForDevice(rankings.publishedEqModels, 'oe').find(row => row.model.id === modelId);
assert.equal(arya?.ranked.length, 0, 'Publishing a preset does not create comparison results');
assert.equal(arya?.awaiting[0]?.id, 'arya-stealth-v3');
assert.ok(!rankings.eqRankingsForDevice(rankings.publishedEqModels, 'ie').some(row => row.model.id === modelId));
const firstVersion = 'a'.repeat(64), secondVersion = 'b'.repeat(64);
let version = firstVersion;
const models = () => [{
  id: 'fixture-headphone', name: 'Fixture headphone', type: 'oe',
  presets: [{ id: 'fixture-a', name: 'Fixture A', preview: { path: '/eq-presets/fixture-a.txt', sha256: version } },
    { id: 'fixture-b', name: 'Fixture B' }],
  pairs: [{ a: 'fixture-a', b: 'fixture-b', winsA: 3, winsB: 1, ties: 1 }],
}];
const rankBefore = JSON.stringify(rankings.eqRankingsForDevice(models(), 'all')[0].ranked.map(({ id, rating }) => ({ id, rating })));
const subjects = ['browser:reaction-one', 'browser:reaction-two', 'owner', admin.LAYOUT_TEST_SUBJECT];
for (const [i, subject] of subjects.entries()) {
  sqlite.prepare('INSERT INTO privacy_accounts(subject_id,submissions_enabled,agreement_version) VALUES(?,1,?)').run(subject,VOTE_DATA_NOTICE_VERSION);
  sqlite.prepare('INSERT INTO privacy_sessions(token_hash,subject_id,expires_at) VALUES(?,?,?)').run(String(i+1).repeat(64),subject,Date.now()+600000);
}
let index = 0;
const currentSession = () => index < 0 ? '' : String(index+1).repeat(64);
const dataIdentity = async () => {
  const account = sqlite.prepare('SELECT * FROM privacy_accounts WHERE subject_id=?').get(subjects[index] ?? '');
  if (!account) throw new inputs.RequestInputError('Sign in.', 401);
  return { subjectId: account.subject_id, sessionHash: currentSession(), submissionsEnabled: account.submissions_enabled === 1 && account.agreement_version === VOTE_DATA_NOTICE_VERSION };
};
const sql = { env: { DB: db, ASSETS: {
  async fetch(request) {
    assert.equal(new URL(request.url).pathname, '/eq-presets/fixture-a.txt');
    return new Response('Preamp: -6 dB\nFilter 1: ON PK Fc 1000 Hz Gain -2 dB Q 1');
  },
} } };
const route = load('site/app/api/eq-preset-reactions/route.ts', {
  'cloudflare:workers': sql, '@/lib/admin-contributions': admin, '@/lib/request-json': inputs,
  '@/lib/eq-rankings': { getPublishedEqPreview: (model, preset, hash) => rankings.getPublishedEqPreview(model, preset, hash, models()) },
  '@/lib/submission-ownership': { dataIdentity }, '@/lib/vote-data-notice': { VOTE_DATA_NOTICE_VERSION },
  '@/lib/public-write-gate': { publicWriteGate: async () => null },
});
const erasure = load('site/lib/privacy-erasure.ts', { 'cloudflare:workers': sql, '@/lib/request-json': inputs });
const url = 'https://fixture.invalid/api/eq-preset-reactions';
const key = { model: 'fixture-headphone', preset: 'fixture-a', version: firstVersion };
const get = (patch = {}) => route.GET(new Request(url + '?' + new URLSearchParams({ ...key, ...patch })));
const post = (choice, patch = {}, origin = 'https://fixture.invalid') => route.POST(new Request(url, {
  method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json' }, body: JSON.stringify({ ...key, choice, ...patch }),
}));
const counts = (up, down, mine, canReact = true) => ({ up, down, mine, canReact });
assert.match(await (await get({ preview: '1' })).text(), /Preamp: -6 dB/);
assert.equal((await get({ preview: '1', preset: 'private-id' })).status, 404);
assert.equal((await post('up', {}, 'https://foreign.invalid')).status, 403);
assert.equal((await post('like')).status, 400);
assert.equal((await post('up', { preset: 'fixture-b' })).status, 404);
assert.deepEqual(await (await post('up')).json(), counts(1,0,'up'));
assert.deepEqual(await (await post('up')).json(), counts(1,0,'up'));
assert.deepEqual(await (await post('down')).json(), counts(0,1,'down'));
assert.equal(sqlite.prepare('SELECT COUNT(*) AS n FROM eq_preset_reactions').get().n, 1);
const firstId = sqlite.prepare('SELECT id FROM eq_preset_reactions').get().id;
index = 1;
assert.deepEqual(await (await get()).json(), counts(0,1,null));
assert.deepEqual(await (await post('up')).json(), counts(1,1,'up'));
await assert.rejects(erasure.eraseData(subjects[1], { kind:'eq-reaction', id:firstId }), /not found/);
index = -1;
assert.deepEqual(await (await get()).json(), counts(1,1,null,false));
assert.equal((await post('up')).status, 401);
for (const testIndex of [2,3]) {
  index = testIndex;
  assert.deepEqual(await (await get()).json(), counts(1,1,null,false));
  assert.equal((await post('up')).status, 403);
}
index = 0;
beforeWrite = () => sqlite.prepare('UPDATE privacy_accounts SET submissions_enabled=0 WHERE subject_id=?').run(subjects[0]);
assert.equal((await post('up')).status, 403, 'Changing consent during the request prevents the write');
assert.deepEqual(await (await get()).json(), counts(1,1,'down',false));
assert.deepEqual(await (await post(null)).json(), counts(1,0,null,false), 'Opted-out listener can remove their earlier reaction');
index = 1;
version = secondVersion;
assert.equal((await post('up')).status,404);
assert.deepEqual(await (await get({version})).json(), counts(0,0,null));
assert.deepEqual(await (await post('down',{version})).json(), counts(0,1,'down'));
const secondId = sqlite.prepare('SELECT id FROM eq_preset_reactions WHERE preset_version=?').get(version).id;
await erasure.eraseData(subjects[1],{kind:'eq-reaction',id:secondId});
assert.deepEqual(await (await get({version})).json(),counts(0,0,null));
await erasure.eraseData(subjects[1]);
assert.equal(sqlite.prepare('SELECT COUNT(*) AS n FROM eq_preset_reactions').get().n,0);
assert.equal(JSON.stringify(rankings.eqRankingsForDevice(models(),'all')[0].ranked.map(({ id,rating })=>({ id,rating }))),rankBefore);
sqlite.close();
console.log('PASS preset preview allowlist, exact version reactions, account isolation, replacement/removal, consent race, transacted erasure and A/B ranking independence.');
