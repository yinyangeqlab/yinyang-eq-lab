import * as fingerprints from "../lib/file-fingerprint.ts";
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { rankPreferences } from '../lib/preference-ranking.ts';
import {intervalStats,parseIntervals} from '../lib/listening.ts';
const code=ts.transpileModule(readFileSync(new URL('../app/api/research/route.ts',import.meta.url),'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;
const targets=[{id:'a',name:'Alpha',creator:'Test',status:'approved',measurement:'must-not-leak'},{id:'b',name:'Beta',creator:'Test',status:'approved'},{id:'pending',name:'Pending',creator:'Test',status:'pending'}];
const base={protocolVersion:'legacy-v1',testMode:'blind',eligible:1,heardA:6,heardB:6,headphoneType:'ie',songTitle:'private-title',songArtist:'private-artist',songAlbum:'private-album',recordingId:'private-recording',sha256:'a'.repeat(64),otherReason:'private-comment',reasonTags:'[]',createdAt:1000,reliabilityWeight:.5};
const votes=[{...base,id:'one',winnerId:'a',loserId:'b',voterId:'private-browser-one'},{...base,id:'two',winnerId:'b',loserId:'a',voterId:'private-browser-one'},{...base,id:'three',winnerId:'a',loserId:'b',voterId:'private-browser-two'},{...base,id:'short',winnerId:'a',loserId:'b',voterId:'private-browser-one',heardA:4}];
const schema={targets:{},votes:{},listeningRuns:{},submissionOwners:{}};
let removed = new Set();let owners=[];let runs=[];
const deps={'@/lib/file-fingerprint':fingerprints,'@/lib/active-submissions':{activeSubmissions:async()=> (kind,id) => !removed.has(`${kind}:${id}`)},'@/lib/maintenance':{maintenanceResponse:()=>null},'@/db':{getDb:()=>({select:()=>({from:async table=>table===schema.targets?targets:table===schema.votes?votes:table===schema.listeningRuns?runs:owners})})},'@/db/schema':schema,'@/lib/preference-ranking':{rankPreferences},'@/lib/curated-tracks':{curatedTracks:[{title:base.songTitle,artist:base.songArtist,album:base.songAlbum,recordingId:base.recordingId}]}};
deps['@/lib/listening-protocol']={LISTENING_PROTOCOL:'matched-passage-v2',MIN_SIDE_SECONDS:5,MIN_COMMON_SECONDS:5};
deps['@/lib/listening']={intervalStats,parseIntervals};
const evidenceCode=ts.transpileModule(readFileSync(new URL('../lib/ranking-evidence.ts',import.meta.url),'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;
const evidenceContext=vm.createContext({exports:{},require:name=>deps[name]});vm.runInContext(evidenceCode,evidenceContext);deps['@/lib/ranking-evidence']=evidenceContext.exports;
const context=vm.createContext({exports:{},require:name=>deps[name],Response});vm.runInContext(code,context);
const response=await context.exports.GET();assert.equal(response.status,200);
const data=await response.json();assert.equal(data.methodology,'participant-balanced-fractional-bt-v2');
for(const mode of ['all','random','curated','verified']) {
 assert.equal(data[mode].voteCount,3); assert.equal(data[mode].rows.length,2);
 assert.equal(data.categories[mode].ie[0].comparisons,3);
 assert.equal(data.categories[mode].oe.length,0);
 for(const row of data[mode].rows) { assert.equal(row.listeners,2);assert.ok(Number.isFinite(row.sd));assert.ok(row.sd>0); }
}
assert.equal(data.bring.voteCount,0);
const json=JSON.stringify(data);
for(const privateValue of ['private-browser','private-title',base.sha256,'private-comment','must-not-leak']) assert.ok(!json.includes(privateValue),privateValue);
console.log('Ranking API: accepted repeats/reversals counted, all filters include deviations, short listens excluded, and private listener/song/measurement details withheld.');

removed = new Set(['vote:one']);
const moderated = await (await context.exports.GET()).json();
assert.equal(moderated.all.voteCount,2);
assert.equal(moderated.curated.voteCount,2);
assert.equal(moderated.verified.voteCount,2);
removed.clear();
assert.equal((await (await context.exports.GET()).json()).all.voteCount,3);
console.log('Removed observations are excluded from every ranking cohort; restoration includes them again.');

const protocolData=await (await context.exports.GET()).json();assert.equal(protocolData.protocols.legacy.all.voteCount,3);assert.equal(protocolData.protocols.current.all.voteCount,0);
console.log('Historical comparisons remain explicitly available in the exploratory cohort; no retroactive validation claim.');

owners=votes.filter(v=>v.id!=='short').map(v=>({recordKind:'vote',recordId:v.id,subjectId:'invite:same-authenticated-account'}));
const grouped=await (await context.exports.GET()).json();assert.equal(grouped.all.rows[0].listeners,1,'One account across browsers counts as one participant group');assert.equal(grouped.all.voteCount,3);
runs=[{id:'tie-run',trialId:'tie-trial',voterId:'another-browser',testMode:'blind',headphoneType:'ie',result:'tie',targetAId:'a',targetBId:'b',heardA:6,heardB:6,protocolVersion:'matched-passage-v2',intervals:JSON.stringify([{side:0,start:0,end:6,rate:1},{side:1,start:0,end:6,rate:1}])}];
const tied=await (await context.exports.GET()).json();assert.equal(tied.all.voteCount,4);assert.equal(tied.protocols.current.all.voteCount,1);assert.equal(tied.all.rows[0].ties,1);
removed=new Set(['run:tie-run']);assert.equal((await (await context.exports.GET()).json()).all.voteCount,3);
console.log('Authenticated cross-browser grouping and current-protocol ties work; removed listening runs cannot survive as ranking evidence.');
