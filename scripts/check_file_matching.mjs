import contributionPolicy from './contribution-policy-fixture.mjs';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import * as fingerprints from '../lib/file-fingerprint.ts';
import {rankPreferences} from '../lib/preference-ranking.ts';
import {intervalStats,parseIntervals} from '../lib/listening.ts';
import * as protocol from '../lib/listening-protocol.ts';

const hash='a'.repeat(64),otherHash='b'.repeat(64);
for(const value of [null,undefined,17,{},[],true,'','a'.repeat(63),'g'.repeat(64),'a'.repeat(65)])assert.equal(fingerprints.fileFingerprint(value),null);
assert.equal(fingerprints.fileFingerprint(' '+hash.toUpperCase()+' '),hash);
for(const context of [null,'{bad','null','[]','42','{"sha256":17}','{"sha256":"bad"}'])assert.equal(fingerprints.runFileFingerprint(context),null);
assert.equal(fingerprints.runFileFingerprint(JSON.stringify({sha256:hash})),hash);
const targets=[{id:'a',name:'Alpha',creator:'Fixture',status:'approved'},{id:'b',name:'Beta',creator:'Fixture',status:'approved'}];
const schema={targets:{},votes:{},listeningRuns:{},submissionOwners:{}};
let votes=[],runs=[],owners=[],removed=new Set();
const deps={'@/lib/admin-contributions':contributionPolicy,'@/lib/file-fingerprint':fingerprints,'@/lib/listening-protocol':protocol,'@/lib/listening':{intervalStats,parseIntervals},'@/lib/preference-ranking':{rankPreferences},'@/lib/curated-tracks':{curatedTracks:[]},'@/lib/maintenance':{maintenanceResponse:()=>null},'@/lib/active-submissions':{activeSubmissions:async()=> (kind,id)=>!removed.has(kind+':'+id)},'@/db/schema':schema,'@/db':{getDb:()=>({select:()=>({from:async table=>table===schema.targets?targets:table===schema.votes?votes:table===schema.listeningRuns?runs:owners})})}};
function load(relative){const exports={};vm.runInNewContext(ts.transpileModule(readFileSync(new URL('../'+relative,import.meta.url),'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText,{exports,require:name=>{assert.ok(name in deps,name);return deps[name];},Response});return exports;}
deps['@/lib/ranking-evidence']=load('lib/ranking-evidence.ts');
const api=load('app/api/research/route.ts');
const intervals=JSON.stringify([{side:0,start:0,end:6,rate:1},{side:1,start:0,end:6,rate:1}]);
const base={winnerId:'a',loserId:'b',eligible:1,testMode:'blind',headphoneType:'oe',protocolVersion:protocol.LISTENING_PROTOCOL,heardA:6,heardB:6,intervals,songTitle:null,songArtist:null,songAlbum:null,recordingId:null,sha256:hash,reasonTags:'[]'};
const one={...base,id:'vote-one',voterId:'private-browser-one'},two={...base,id:'vote-two',voterId:'private-browser-two'};
const tie=(id,voterId,context={sha256:hash})=>({...base,id,trialId:'trial-'+id,voterId,targetAId:'a',targetBId:'b',result:'tie',researchContext:JSON.stringify(context)});
let checks=0;
async function check(name,expected){const body=await(await api.GET()).json();assert.equal(body.fileMatching,'sha256-two-participant-groups-v2');assert.equal(body.verified.voteCount,expected,name);for(const privateValue of [hash,otherHash,'private-browser','private-tag','private-recording'])assert.ok(!JSON.stringify(body).includes(privateValue),'Private provenance leaked');checks++;return body;}
votes=[one,two];await check('Two groups match a valid hash with all song tags absent',2);
votes=[{...one,songTitle:'private-tag',songArtist:'one',songAlbum:'one',recordingId:'private-recording-one'},{...two,songTitle:'different',songArtist:'different',songAlbum:null,recordingId:'private-recording-two',sha256:hash.toUpperCase()}];await check('Different tags, recording IDs and hash case do not split identical files',2);
owners=[{recordKind:'vote',recordId:one.id,subjectId:'same-account'},{recordKind:'vote',recordId:two.id,subjectId:'same-account'}];await check('Synced browsers under one authenticated account remain one group',0);owners=[];
votes=[one,{...two,sha256:otherHash}];await check('Different files remain separate',0);
for(const value of [null,'', 'not-a-hash','x'.repeat(64)]){votes=[one,{...two,sha256:value}];await check('Invalid or absent hash cannot supply the second group',0);}
votes=[one,{...two,protocolVersion:'legacy-v1'}];let body=await check('All versions may match files heard in different protocol eras',2);assert.equal(body.protocols.current.verified.voteCount,0);assert.equal(body.protocols.legacy.verified.voteCount,0);
votes=[];runs=[tie('one','private-browser-one'),tie('two','private-browser-two')];body=await check('Two tie-only groups retain consented hashes without song tags',2);assert.equal(body.protocols.current.verified.voteCount,2);assert.ok(body.verified.rows.every(row=>row.ties===2));assert.ok((await deps['@/lib/ranking-evidence'].rankingEvidence()).votes.every(v=>v.sha256===hash));
owners=[{recordKind:'run',recordId:'one',subjectId:'same-account'},{recordKind:'run',recordId:'two',subjectId:'same-account'}];await check('Tie-only synced browsers remain one group',0);owners=[];
votes=[one];runs=[tie('two','private-browser-two')];await check('A decisive answer and tie can establish two file groups',2);
removed=new Set(['run:two']);body=await check('Removing a tie removes its evidence and the two-group cohort',0);assert.equal(body.all.voteCount,1);removed=new Set(['vote:trial-two']);await check('Removing a linked trial excludes its tie',0);removed.clear();
runs=[tie('two','private-browser-two',{})];await check('A context with no retained hash cannot infer one from tags or the catalogue',0);
runs=[{...tie('two','private-browser-two'),researchContext:'{broken'}];await check('Malformed retained context fails closed without crashing rankings',0);
votes=[{...one,testMode:'open'}];runs=[{...tie('two','private-browser-two'),testMode:'open'}];body=await check('Open comparisons do not enter file-matched rankings',0);assert.equal(body.all.voteCount,0);
votes=[one];runs=[{...tie('two','private-browser-two'),intervals:JSON.stringify([{side:0,start:0,end:6,rate:1},{side:1,start:20,end:26,rate:1}])}];await check('A hash does not bypass the current common-passage requirement',0);
console.log(`Same-file matching: ${checks} API/evidence scenarios passed; hash validation, absent/different tags, tie-only/mixed groups, synced ownership, protocol isolation, private output, consent-missing provenance, moderation and passage requirements verified. Synthetic records only.`);
