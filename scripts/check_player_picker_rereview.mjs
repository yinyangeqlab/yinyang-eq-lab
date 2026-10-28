import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import ts from 'typescript';

function functions(path,names){const ast=ts.createSourceFile(path,fs.readFileSync(path,'utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX),bodies=[];function visit(n){if(ts.isFunctionDeclaration(n)&&names.includes(n.name?.text))bodies.push(n.getText(ast));ts.forEachChild(n,visit);}visit(ast);assert.equal(bodies.length,names.length);return ts.transpileModule(bodies.join('\n'),{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText;}
const parent=functions('app/shootout/page.tsx',['listenToSide','listenToPassage']);
const picker=functions('components/music-panel.tsx',['chooseFolder','chooseFile']);
const deferred=()=>{let resolve;const promise=new Promise(r=>{resolve=r});return{promise,resolve}};
let checks=0;
for(const method of ['listenToSide','listenToPassage'])for(const outcome of [true,false,undefined]){
 const pending=deferred(),messages=[];let calls=0;
 const state={requireMeasurement:()=>true,pair:['a','b'],busy:false,revealed:false,skipSoundPromptRef:{current:true},touchBlind(){},setMessage:value=>messages.push(value),musicPanelRef:{current:{listen:()=>{calls++;return pending.promise},playPassage:()=>{calls++;return pending.promise}}},document:{querySelector(){throw Error('Listening completion must not scroll the page');}}};
 vm.createContext(state);vm.runInContext(parent,state);const run=state[method](0);assert.equal(calls,1);assert.deepEqual(messages,['']);state.setMessage('Newer page notice');pending.resolve(outcome);await run;assert.deepEqual(messages,['','Newer page notice'],'old completion must not overwrite a newer notice');checks++;
}
for(const method of ['listenToSide','listenToPassage'])for(const reason of ['measurement','reminder']){
 let calls=0,clears=0,prompted=false;const state={requireMeasurement:()=>reason!=='measurement',pair:['a','b'],busy:false,revealed:false,skipSoundPromptRef:{current:reason!=='reminder'},requestSoundCheck:()=>{prompted=true},touchBlind(){},setMessage:()=>clears++,musicPanelRef:{current:{listen:()=>calls++,playPassage:()=>calls++}}};vm.createContext(state);vm.runInContext(parent,state);await state[method](0);assert.equal(calls,0);assert.equal(clears,0);assert.equal(prompted,reason==='reminder');checks++;
}
{
 const scan=deferred(),audio={pause(){},load(){},src:'blob:old'},state={file:null,testMode:'open',testModeRef:{current:'open'},openMusicSourceRef:{current:'own'},folderSerialRef:{current:0},sourceSerialRef:{current:1},curatedFetchRef:{current:0},hashSerialRef:{current:0},audioRef:{current:audio},samplesRef:{current:[]},sampleIndexRef:{current:-1},sourceKindRef:{current:'uploaded'},candidateUrlRef:{current:null},measuredLufsRef:{current:null},urlRef:{current:null},onFileChosenRef:{current:()=>{}},suggestions:[],stereoFile:()=>scan.promise,matchSongSuggestion:()=>undefined,resetHeard(){},markPlaybackStopped(){},updateDynamicRange(){},processFileData(){},URL:{createObjectURL:()=> 'blob:single-file',revokeObjectURL(){}}};
 for(const name of ['SampleStatus','Samples','SampleChoice','OpenMusicSource','CandidateUrl','MusicVoteMessage','DynamicSliderEnabled','SourceError','BitrateDetails','Meta','LoudnessStatus','Analysis','CuratedPreview','WaveformZoom','Position','Duration','PassageOverride','WaveformFocus','File'])state['set'+name]=value=>{state[name]=value};
 vm.createContext(state);vm.runInContext(picker,state);
 const pending=state.chooseFolder([{name:'folder.wav',webkitRelativePath:'Synthetic/folder.wav'}]);assert.match(state.SampleStatus,/Checking stereo/);
 state.chooseFile({name:'single.wav'});assert.match(state.SampleStatus,/Checking stereo/);assert.equal(state.File.name,'single.wav');assert.equal(audio.src,'blob:single-file');
 scan.resolve(true);await pending;assert.match(state.SampleStatus,/current song stays loaded/);assert.equal(state.samplesRef.current.length,1);assert.equal(state.File.name,'single.wav');checks++;
}
function effect(path, marker){const ast=ts.createSourceFile(path,fs.readFileSync(path,'utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);let body;function visit(n){if(ts.isCallExpression(n)&&n.expression.getText(ast)==='useEffect'&&n.arguments[0].getText(ast).includes(marker))body=n.arguments[0].getText(ast);ts.forEachChild(n,visit);}visit(ast);assert.ok(body);return ts.transpileModule('const runEffect='+body+';runEffect();',{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText;}
const openFocus=effect('app/shootout/page.tsx','!nextComparisonFocusPending.current||revealed||!pair');
for(const scenario of ['ready','other-focus','other-tab','waiting-pair','not-pending','revealed']){
 let focuses=0;const body={},state={pair:scenario==='waiting-pair'?null:['a','b'],revealed:scenario==='revealed',tab:scenario==='other-tab'?'profile':'shootout',nextComparisonFocusPending:{current:scenario!=='not-pending'},document:{body,activeElement:scenario==='other-focus'?{}:body},focusComparisonPlayback:()=>focuses++};vm.createContext(state);vm.runInContext(openFocus,state);
 assert.equal(focuses,scenario==='ready'?1:0);
 if(scenario==='waiting-pair'){state.pair=['b','c'];vm.runInContext('runEffect()',state);assert.equal(focuses,1,'wait for the next pair before consuming focus');}
 if(scenario==='ready'){vm.runInContext('runEffect()',state);assert.equal(focuses,1,'focus once only');}
 checks++;
}
const personalFocus=effect('app/shootout/personal/page.tsx','const duel=document.querySelector');
for(const scenario of ['ready','other-focus','results','no-duel']){
 let focuses=0;const body={},state={results:scenario==='results',nextComparisonFocusPending:{current:true},document:{body,activeElement:scenario==='other-focus'?{}:body,querySelector:()=>scenario==='no-duel'?null:{}},focusComparisonPlayback:()=>focuses++};vm.createContext(state);vm.runInContext(personalFocus,state);assert.equal(focuses,scenario==='ready'?1:0);assert.equal(state.nextComparisonFocusPending.current,false);checks++;
}
{
 const state={};vm.createContext(state);vm.runInContext(functions('lib/comparison-focus.ts',['focusComparisonPlayback']).replace(/^export /m,''),state);
 let options;assert.equal(state.focusComparisonPlayback({querySelector:()=>({focus:value=>{options=value}})}),true);assert.equal(options.preventScroll,true);checks++;
 assert.equal(state.focusComparisonPlayback({querySelector:()=>null}),false);checks++;
}
{
 let notice='Earlier success',error='';const state={setNotice:v=>{notice=v},setError:v=>{error=v}};vm.createContext(state);vm.runInContext(functions('app/shootout/personal/page.tsx',['safely']),state);vm.runInContext('safely(()=>{throw new Error("quota")})',state);assert.equal(notice,'');assert.equal(error,'quota');checks++;
}
console.log(`PASS ${checks} actual re-review checks: interrupted listening, guarded prerequisites, independent folder scans, one-shot next-comparison focus, no scroll/focus stealing, and failed-save notice cleanup.`);
