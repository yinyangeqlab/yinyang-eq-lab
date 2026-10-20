import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {webcrypto} from 'node:crypto';
import ts from 'typescript';
// Run the shipped upload/session/vote handlers against disposable browser storage
// and controlled network responses. React effects are covered by browser QA.
const file=process.argv[2]||'app/shootout/page.tsx';
const ast=ts.createSourceFile('page.tsx',readFileSync(file,'utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX),handlers=new Map();
function visit(n){if(ts.isFunctionDeclaration(n)&&n.name)handlers.set(n.name.text,n.getText(ast));ts.forEachChild(n,visit);}visit(ast);
const names=['upload','savePrivate','beginTestMode','resetFeedback','openFeedbackId','advancePair','nextPair','applyOpenPair','vote','saveTrial'];
const code=ts.transpileModule(names.map(n=>handlers.get(n)).join('\n'),{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText;
function load(path){const module={exports:{}};vm.runInNewContext(ts.transpileModule(readFileSync(path,'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText,{module,exports:module.exports,Error});return module.exports;}
const {parseCurve}=load('lib/curves.ts'),{compareTargets}=load('lib/target-review.ts'),{screenTargetName}=load('lib/target-name-policy.ts'),{targetHeadphoneType}=load('lib/target-type.ts');
const points=Array.from({length:20},(_,i)=>[20*1000**(i/19),i/10]);
const target=(id,type='ie')=>({id,name:`Reference ${id}`,points,status:'approved',measurement:{type}});
function harness(extra={}){
 const stored=new Map(),calls=[];
 const state={Error,curveVersion:()=>"qa-version",crypto:webcrypto,parseCurve,compareTargets,screenTargetName,targetHeadphoneType,
 name:'Warm reference',creator:'QA',description:'Synthetic',csv:points.map(p=>p.join(',')).join('\n'),fileName:'curve.csv',curveKind:'original',parentTargetId:'',
 selectedMeasurement:{id:'measurement',name:'QA',type:'ie',points},headphoneType:'ie',rankType:'ie',targets:[target('a')],localTargets:[],testMode:'blind',sessionExpired:false,sessionFinished:false,sessionTrials:[],sessionId:'old',pair:['old-a','old-b'],trialId:'old-trial',revealed:true,busy:false,submissionsEnabled:true,voteDataAccepted:true,
 feedbackNonce:2,describeOpen:true,openFeedbackIdRef:{current:'old-feedback-id'},autoCollapseSetupRef:{current:true},lastActivityRef:{current:0},lastPersistedRef:{current:0},
 localStorage:{getItem:k=>stored.get(k)||null,setItem:(k,v)=>stored.set(k,v)},
 musicPanelRef:{current:{stop(){state.stopped=true;},heard:()=>[6,6],isHashing:()=>false,snapshot:()=>({overlapSeconds:6}),finish:()=>({heardA:6,heardB:6,overlapSeconds:6,intervals:[]})}},
 fitAutoEq:(_raw,p)=>({filters:[{hz:100,q:1,gain:p[0][1]}],rms:0,preamp:0}),
 requireMeasurement:()=>!!state.selectedMeasurement,touchBlind(){},requestSoundCheck:action=>action(),browserVoterId:()=> 'voter',VOTE_DATA_NOTICE_VERSION:'qa',refresh:async()=>{},trials:[],
 fetch:async(url,options)=>{calls.push({url,body:JSON.parse(options.body)});return {ok:true,json:async()=>({ok:true})};},
 ...extra};
 Object.defineProperties(state,{allTargets:{get:()=>[...state.targets,...state.localTargets]},testPool:{get:()=>[...state.targets,...(state.testMode==='open'?state.localTargets:[])].filter(t=>targetHeadphoneType(t)===state.headphoneType)}});
 for(const key of ['message','name','description','curveKind','parentTargetId','csv','fileName','localTargets','pair','trialId','pickA','pickB','testMode','previewMode','heard','revealed','tab','setupCollapsed','sessionFinished','sessionExpired','sessionId','lastActivity','feedbackNonce','describeOpen','trials','busy','reviewVoteData','headphoneType','rankType'])state['set'+key[0].toUpperCase()+key.slice(1)]=v=>{state[key]=typeof v==='function'?v(state[key]):v;};
 const context=vm.createContext(state);vm.runInContext(code,context);
 return {state,stored,calls,run:code=>vm.runInContext(code,context)};
}
let passed=0,failed=0;async function test(name,fn){try{await fn();console.log('PASS '+name);passed++;}catch(error){console.error('FAIL '+name+': '+error.message);failed++;}}
for(const flag of ['sessionExpired','sessionFinished'])await test(`Upload resets ${flag}; A/B/tie and Continue work`,async()=>{
 const h=harness({[flag]:true});await h.run('upload({preventDefault(){}})');assert.equal(h.state[flag],false);assert.equal(h.state.testMode,'open');assert.equal(h.state.trialId,null);assert.equal(h.state.describeOpen,false);assert.notEqual(h.state.openFeedbackIdRef.current,'old-feedback-id');
 for(const choice of [0,1,2]){const previous=[...h.state.pair];await h.run(`vote(${choice})`);assert.equal(h.state.revealed,true);h.run('nextPair()');assert.equal(h.state.revealed,false);assert.deepEqual([...h.state.pair],[previous[1],previous[0]]);}
 assert.equal(h.state.trials.length,3);assert.equal(new Set(h.state.trials.map(t=>t.id)).size,3);assert.equal(h.calls.filter(c=>c.url==='/api/votes').length,0);
});
await test('Upload chooses a compatible reference even when first catalog target is wrong type',async()=>{const h=harness({targets:[target('wrong','oe'),target('right') ]});await h.run('upload({preventDefault(){}})');assert.equal(h.state.pair[0],h.state.localTargets[0].id);assert.equal(h.state.pair[1],'right');});
await test('Empty compatible pool saves curve and leaves no stale pair',async()=>{const h=harness({targets:[target('wrong','oe')]});await h.run('upload({preventDefault(){}})');assert.equal(h.state.localTargets.length,1);assert.equal(h.state.pair,null);assert.equal(h.state.pickA,'');assert.equal(h.state.pickB,'');});
await test('Larger pools advance to a different unordered compatible pair 50 times',async()=>{const h=harness({targets:[target('a'),target('b'),target('c'),target('wrong','oe')],testMode:'open'});await h.run('upload({preventDefault(){}})');for(let i=0;i<50;i++){const before=[...h.state.pair].sort().join(':');h.run('nextPair()');assert.notEqual([...h.state.pair].sort().join(':'),before);assert.ok(!h.state.pair.includes('wrong'));}});
for(const [label,extra,pattern] of [['invalid CSV',{csv:'20,3\n100,4'},/at least 10/],['missing measurement',{selectedMeasurement:null},/measurement/],['missing parent',{curveKind:'preference',parentTargetId:'missing'},/Select the available/],['empty name',{name:'  '},/Name and creator/],['empty creator',{creator:'  '},/Name and creator/],['blocked name',{name:'fuck'},/profanity/]])await test(`${label} keeps form and existing targets`,async()=>{const h=harness(extra);await h.run('upload({preventDefault(){}})');assert.equal(h.state.localTargets.length,0);assert.match(h.state.message,pattern);assert.equal(h.state.csv,extra.csv||points.map(p=>p.join(',')).join('\n'));});
await test('Storage failure keeps input and prevents transition',async()=>{const h=harness();h.state.localStorage.setItem=()=>{throw Error('Storage full');};await h.run('upload({preventDefault(){}})');assert.equal(h.state.localTargets.length,0);assert.equal(h.state.name,'Warm reference');assert.equal(h.state.testMode,'blind');assert.match(h.state.message,/Storage full/);});
await test('Preference lineage survives upload; form resets; no submission on upload',async()=>{const h=harness({curveKind:'preference',parentTargetId:'a'});await h.run('upload({preventDefault(){}})');const row=h.state.localTargets[0];assert.equal(row.parentTargetId,'a');assert.equal(row.curveKind,'preference');assert.equal(h.state.curveKind,'original');assert.equal(h.state.parentTargetId,'');assert.equal(h.calls.length,0);assert.equal(JSON.parse(h.stored.get('target-lab-private-targets'))[0].id,row.id);});
await test('Uploading twice creates distinct comparison IDs and preserves prior results',async()=>{const h=harness();for(let i=0;i<2;i++){h.state.csv=points.map(p=>p.join(',')).join('\n');h.state.name='Warm '+i;await h.run('upload({preventDefault(){}})');await h.run('vote(0)');}assert.equal(h.state.trials.length,2);assert.equal(h.state.localTargets.length,2);assert.notEqual(h.state.trials[0].id,h.state.trials[1].id);});
for(const failure of ['http','network','malformed'])await test(`Failed listening-run ${failure} retains result and allows Continue`,async()=>{const h=harness();await h.run('upload({preventDefault(){}})');h.state.fetch=async()=>{if(failure==='network')throw Error('Offline');return {ok:false,json:async()=>{if(failure==='malformed')throw SyntaxError('Invalid JSON');return {error:'Synthetic failure'};}};};await h.run('vote(1)');assert.equal(h.state.revealed,true);assert.equal(h.state.busy,false);assert.equal(h.state.trials.length,1);h.run('nextPair()');assert.equal(h.state.revealed,false);});
await test('Ranked Continue still clears pair/trial for a fresh server assignment',()=>{const h=harness({targets:[target('a'),target('b')],pair:['a','b'],testMode:'blind'});h.run('nextPair()');assert.equal(h.state.pair,null);assert.equal(h.state.trialId,null);assert.equal(h.state.revealed,false);});
console.log(`${passed} passed; ${failed} failed`);if(failed)process.exitCode=1;
