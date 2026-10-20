const fs = require('node:fs');
const ts = require('typescript');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
function load(file, imports = {}) {
  const module = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync(path.join(root, file), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  vm.runInNewContext(code, { module, exports: module.exports, require: id => { if (id in imports) return imports[id]; throw Error(`Unexpected import: ${id}`); }, Response, Set, Date });
  return module.exports;
}
const { rankMusic, musicRotation } = load('lib/music-preferences.ts');
const tracks = JSON.parse(fs.readFileSync(path.join(root, 'data/music-candidates.json'), 'utf8'));
const counts = Object.fromEntries(tracks.map((t, i) => [t.url, { keep: i, pass: 0 }]));
const pool = musicRotation(tracks, counts, () => .4);
assert.equal(pool.length, 22);
assert.equal(new Set(pool.map(t => t.url)).size, 22);
for (const group of ['dynamic', 'compact']) {
  const ranked = rankMusic(tracks.filter(t => t.group === group), counts);
  assert(ranked.slice(0, 10).every(t => pool.includes(t)));
  assert.equal(pool.filter(t => t.group === group).length, 11);
  counts[ranked[0].url] = { keep: 0, pass: 100 };
  assert(!rankMusic(tracks.filter(t => t.group === group), counts).slice(0, 10).includes(ranked[0]));
}
assert.equal(musicRotation([{ url: 'x', group: 'unmeasured' }], {}).length, 0);
assert.equal(rankMusic([{ url: 'a' }, { url: 'b' }], { a: { keep: 1, pass: 0 }, b: { keep: 9, pass: 1 } })[0].url, 'b');
// Exercise the real endpoint with an isolated account store. No production writes.
let user = { userId: 'listener', email: 'private@example.test', displayName: 'Private listener' };
let rows = [{ userId: 'other', trackUrl: tracks[0].url, choice: 'keep' }, { userId: 'listener', trackUrl: tracks[0].url, choice: 'pass' }, { userId: 'hidden', trackUrl: 'unknown', choice: 'keep' }];
const db = {
  select: () => ({ from: async () => rows }),
  insert: () => ({ values: value => ({ onConflictDoUpdate: async () => { rows = rows.filter(r => !(r.userId === value.userId && r.trackUrl === value.trackUrl)); rows.push(value); } }) }),
  delete: () => ({ where: async () => { rows = rows.filter(r => !(r.userId === user.userId && r.trackUrl === tracks[0].url)); } }),
};
const endpoint = load('app/api/music-votes/route.ts', {
  'drizzle-orm': { and() {}, eq() {} },
  '@/app/chatgpt-auth': { getChatGPTUser: async () => user },
  '@/db': { getDb: () => db }, '@/db/schema': { musicVotes: {} },
  '@/lib/music-catalog': { musicCandidates: tracks },
  '@/lib/request-json': { readJsonObject: request => request.json(), requestInputResponse: () => null },
});
const request = choice => new Request('http://localhost/api/music-votes', { method: 'POST', body: JSON.stringify({ trackUrl: tracks[0].url, choice }) });
(async () => {
  let response = await endpoint.GET();
  assert.equal(response.headers.get('cache-control'), 'private, no-store');
  let result = await response.json();
  assert.deepEqual(result.byTrack[tracks[0].url], { keep: 1, pass: 1 });
  assert.equal(result.mine[tracks[0].url], 'pass');
  assert(!JSON.stringify(result).includes('private@example.test'));
  assert(!JSON.stringify(result).includes('other'));
  result = await (await endpoint.POST(request('keep'))).json();
  assert.deepEqual(result.byTrack[tracks[0].url], { keep: 2, pass: 0 });
  result = await (await endpoint.POST(request(null))).json();
  assert.deepEqual(result.byTrack[tracks[0].url], { keep: 1, pass: 0 });
  assert.equal(result.mine[tracks[0].url], undefined);
  user = null;
  assert.equal((await endpoint.POST(request('keep'))).status, 401);
  assert.deepEqual((await (await endpoint.GET()).json()).mine, {});
  console.log('Music preferences passed: ranking, replacement, balanced rotation, challengers, privacy, account replacement/undo and signed-out rejection.');
})().catch(error => { console.error(error); process.exitCode = 1; });
