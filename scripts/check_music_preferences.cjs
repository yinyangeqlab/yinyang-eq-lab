const fs = require('node:fs');
const ts = require('typescript');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
function load(file, imports = {}, nodeEnv = "development") {
  const fixtureModule = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync(path.join(root, file), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
  vm.runInNewContext(code, { module: fixtureModule, exports: fixtureModule.exports, require: id => { if (id in imports) return imports[id]; throw Error(`Unexpected import: ${id}`); }, Response, Set, Date, process: {env:{NODE_ENV:nodeEnv}} });
  return fixtureModule.exports;
}
const { rankMusic, musicCommunityRank, musicRotation, musicReview, playbackGain, playbackTarget } = load('lib/music-preferences.ts');
const json = file => JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'));
const catalogImports = Object.fromEntries(['permission-music','listening-pool-original-audio','music-candidates','shantae-cc-tracks','shantae-audio','listening-pool-local','listening-pool-measurements'].map(name=>['@/data/'+name+'.json',json('data/'+name+'.json')]));
const catalog = load('lib/music-catalog.ts',catalogImports);
const productionCatalog = load('lib/music-catalog.ts',catalogImports,'production');
assert.equal(productionCatalog.listeningPool.length,224);
assert(productionCatalog.listeningPool.every(t=>!t.fileUrl.includes('__local-listening-pool')));
assert.equal(productionCatalog.listeningPool.filter(t=>t.fileUrl.startsWith('/api/listening-audio/')).length,224);
const tracks = catalog.listeningPool;
assert.equal(tracks.length,224);
assert.equal(new Set(tracks.map(t=>t.url)).size,224);
assert.equal(new Set(tracks.map(t=>t.songFamily || t.url)).size,217);
const counts = Object.fromEntries(tracks.map((t, i) => [t.url, { keep: i, pass: 0 }]));
const pool = musicRotation(tracks, counts, () => .4);
assert.equal(pool.length, 217);
assert.equal(new Set(pool.map(t => t.url)).size, 217);
assert.deepEqual(musicRotation(tracks, {}, () => .4), pool);
assert.equal(musicRotation([{ url: 'x', group: 'unmeasured' }], {}).length, 1);
const versions = [{url:'a1',songFamily:'a'}, {url:'a2',songFamily:'a'}, {url:'b'}];
assert.equal(musicRotation(versions, {}, () => .1).length, 2);
assert(musicRotation(versions, {}, () => .1).some(t => t.url === 'a1'));
assert(musicRotation(versions, {}, () => .9).some(t => t.url === 'a2'));
assert.equal(musicReview({keep:0,pass:49}).flagged, false);
assert.equal(musicReview({keep:0,pass:50}).flagged, true);
assert.equal(musicReview({keep:25,pass:25}).flagged, false);
assert.equal(musicReview({keep:10,pass:40}).flagged, true);
assert.equal(musicReview({keep:20,pass:30}).flagged, false);
assert.equal(rankMusic([{ url: 'a' }, { url: 'b' }], { a: { keep: 1, pass: 0 }, b: { keep: 9, pass: 1 } })[0].url, 'b');
// Community positions must match the rated-only library, never catalog order.
const rankFixture=[{url:'unrated'}, {url:'down'}, {url:'middle'}, {url:'best'}, {url:'tied'}];
const rankCounts={down:{keep:0,pass:8},middle:{keep:2,pass:2},best:{keep:9,pass:1},tied:{keep:9,pass:1}};
assert.equal(musicCommunityRank(rankFixture,rankCounts,'unrated'),null);
assert.equal(musicCommunityRank(rankFixture,{},'best'),null);
assert.equal(musicCommunityRank(rankFixture,rankCounts,'best').position,1);
assert.equal(musicCommunityRank(rankFixture,rankCounts,'tied').position,2);
assert.equal(musicCommunityRank(rankFixture,rankCounts,'middle').position,3);
assert.equal(musicCommunityRank(rankFixture,rankCounts,'down').position,4);
assert.equal(musicCommunityRank(rankFixture,rankCounts,'down').total,4);
rankCounts.down={keep:100,pass:0};
assert.equal(musicCommunityRank(rankFixture,rankCounts,'down').position,1);
assert.equal(musicCommunityRank(rankFixture,rankCounts,'best').position,2);
delete rankCounts.down;
assert.equal(musicCommunityRank(rankFixture,rankCounts,'down'),null);
assert.equal(musicCommunityRank(rankFixture,rankCounts,'best').total,3);
const dreams=[{integrated_lufs:-14.7,true_peak_dbtp:0},{integrated_lufs:-11,true_peak_dbtp:.3}];
assert.equal(playbackTarget(dreams),-16);
assert(Math.abs(20*Math.log10(playbackGain(-14.7)) + 1.3) < 1e-10);
assert(Math.abs(20*Math.log10(playbackGain(-11)) + 5) < 1e-10);
assert.equal(playbackTarget([{integrated_lufs:-25,true_peak_dbtp:-3}]),-23);
assert.equal(playbackGain(undefined),1);
// Compare entire shuffled sequences, rather than only observed frequencies.
const seeded = seed => () => { seed = (1664525 * seed + 1013904223) >>> 0; return seed / 4294967296; };
const scenarios=[{},Object.fromEntries(tracks.map(t=>[t.url,{keep:1000,pass:0}])),Object.fromEntries(tracks.map(t=>[t.url,{keep:0,pass:1000}]))];
for(let seed=1;seed<=100;seed++) {
 const baseline=musicRotation(tracks,{},seeded(seed)).map(t=>t.url);
 for(const scenario of scenarios) assert.deepEqual(musicRotation(tracks,scenario,seeded(seed)).map(t=>t.url),baseline);
}
const seen=new Set(), appearances=new Map();
for(let seed=1;seed<=1000;seed++) {
 const cycle=musicRotation(tracks,{},seeded(seed));
 assert.equal(new Set(cycle.map(t=>t.songFamily || t.url)).size,217);
 for(const t of cycle){seen.add(t.url); appearances.set(t.url,(appearances.get(t.url)||0)+1)}
}
assert.equal(seen.size,224);
for(const track of tracks) {
 const siblings=tracks.filter(t=>(t.songFamily||t.url)===(track.songFamily||track.url)).length;
 assert(siblings===1 ? appearances.get(track.url)===1000 : appearances.get(track.url)>400 && appearances.get(track.url)<600);
}
// Exercise the real endpoint with an isolated account store. No production writes.
let user = { userId: 'listener', email: 'private@example.test', displayName: 'Private listener' };
let rows = [{ userId: 'other', trackUrl: tracks[0].url, choice: 'keep' }, { userId: 'other', trackUrl: tracks[0].url, choice: 'keep' }, { userId: 'listener', trackUrl: tracks[0].url, choice: 'pass' }, { userId: 'hidden', trackUrl: 'unknown', choice: 'keep' }];
const db = {
  batch: async commands => Promise.all(commands),
  select: () => ({ from: async () => rows }),
  insert: () => ({ values: value => ({ onConflictDoUpdate: async () => { rows = rows.filter(r => !(r.userId === value.userId && r.trackUrl === value.trackUrl)); rows.push(value); } }) }),
  delete: table => ({ where: async test => { if(table === musicTable) rows = rows.filter(r => !test(r)); } }),
};
const musicTable={userId:'userId',trackUrl:'trackUrl',choice:'choice'};
const requestInput=load('lib/request-json.ts');
const adminPolicy=load('lib/admin-contributions.ts',{'@/lib/request-json':requestInput});
const endpoint = load('app/api/music-votes/route.ts', {
  '@/lib/admin-contributions':adminPolicy,
  'drizzle-orm': { and: (...args) => row => args.every(test=>test(row)), eq: (key,value) => row => row[key] === value },
  '@/app/chatgpt-auth': { getChatGPTUser: async () => user },
  '@/lib/submission-ownership': {submissionContext:async()=>({subjectId:user.userId,record:()=>Promise.resolve()})},
  '@/db': { getDb: () => db }, '@/db/schema': { musicVotes: musicTable, submissionOwners: {} },
  '@/lib/music-catalog': { musicCandidates: tracks },
  '@/lib/request-json': { readJsonObject: request => request.json(), requestInputResponse: requestInput.requestInputResponse },
});
const request = (choice,trackUrl = tracks[0].url) => new Request('http://localhost/api/music-votes', { method: 'POST', body: JSON.stringify({ trackUrl, choice }) });
(async () => {
  let response = await endpoint.GET();
  assert.equal(response.headers.get('cache-control'), 'private, no-store');
  let result = await response.json();
  assert.deepEqual(result.byTrack[tracks[0].url], { keep: 1, pass: 1 });
  assert.equal(result.mine[tracks[0].url], 'pass');
  assert(!JSON.stringify(result).includes('private@example.test'));
  assert(!JSON.stringify(result).includes('other'));
  assert.equal(musicCommunityRank(tracks,result.byTrack,tracks[0].url).position,1);
  result = await (await endpoint.POST(request('keep'))).json();
  assert.deepEqual(result.byTrack[tracks[0].url], { keep: 2, pass: 0 });
  result = await (await endpoint.POST(request(null))).json();
  assert.deepEqual(result.byTrack[tracks[0].url], { keep: 1, pass: 0 });
  assert.equal(result.mine[tracks[0].url], undefined);
  // Every recording version accepts both directions and undo, with one rating per account.
  rows=[];
  for(const track of tracks) {
    let r=await endpoint.POST(request('keep',track.url)); assert.equal(r.status,200);
    let data=await r.json(); assert.deepEqual(data.byTrack[track.url],{keep:1,pass:0});
    data=await (await endpoint.POST(request('pass',track.url))).json(); assert.deepEqual(data.byTrack[track.url],{keep:0,pass:1});
    data=await (await endpoint.POST(request(null,track.url))).json(); assert.equal(data.byTrack[track.url],undefined);
  }
  const masters=tracks.filter(t=>t.songFamily==='jmhbm-dreams');
  rows=Array.from({length:49},(_,i)=>({userId:'listener-'+i,trackUrl:masters[0].url,choice:'pass'}));
  rows.push({...rows[0]});
  let boundary=await (await endpoint.GET()).json();
  assert.equal(musicReview(boundary.byTrack[masters[0].url]).total,49);
  assert.equal(musicReview(boundary.byTrack[masters[0].url]).flagged,false);
  rows.push({userId:'listener-50',trackUrl:masters[0].url,choice:'pass'});
  boundary=await (await endpoint.GET()).json();
  assert.equal(musicReview(boundary.byTrack[masters[0].url]).flagged,true);
  assert.equal(musicReview(boundary.byTrack[masters[1].url]).flagged,false);
  const beforeAdmin=JSON.stringify(rows);user={userId:'owner',email:'',displayName:'Owner'};
  assert.equal((await endpoint.POST(request('keep'))).status,403);
  assert.equal(JSON.stringify(rows),beforeAdmin);
  rows.push({userId:'owner',trackUrl:tracks[0].url,choice:'keep'});
  const adminSnapshot=await (await endpoint.GET()).json();
  assert.equal(adminSnapshot.byTrack[tracks[0].url],undefined);
  assert.equal(adminSnapshot.testOnly,true);
  assert.deepEqual(adminSnapshot.mine,{});
  user = null;
  assert.equal((await endpoint.POST(request('keep'))).status, 401);
  assert.deepEqual((await (await endpoint.GET()).json()).mine, {});
  console.log('Listening pool passed: all 224 versions vote/replace/undo; 217 families per cycle; 100 exact seeded vote-invariance comparisons; 1000-cycle coverage of every version; 49/50 distinct-account review boundary, independent masters, privacy and signed-out rejection.');
})().catch(error => { console.error(error); process.exitCode = 1; });
