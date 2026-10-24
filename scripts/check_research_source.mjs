import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {webcrypto} from 'node:crypto';
import vm from 'node:vm';
import ts from 'typescript';

const source=readFileSync('app/shootout/page.tsx','utf8');
const ast=ts.createSourceFile('page.tsx',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
const functions=new Map(),expressions=new Map();
function visit(node){if(ts.isFunctionDeclaration(node)&&node.name)functions.set(node.name.text,node.getText(ast));if(ts.isVariableDeclaration(node)&&node.initializer)expressions.set(node.name.getText(ast),node.initializer.getText(ast));if(ts.isVariableDeclaration(node)&&node.initializer&&ts.isCallExpression(node.initializer)&&node.initializer.expression.getText(ast)==='useCallback'){const callback=node.initializer.arguments[0];functions.set(node.name.getText(ast),'const '+node.name.getText(ast)+'='+callback.getText(ast)+';');}ts.forEachChild(node,visit);}visit(ast);
const handlers=ts.transpileModule(['changeTestMode','startTestMode','beginTestMode'].map(name=>functions.get(name)).join('\n'),{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText;
function harness(mode){
 const state={sharedAdmin:false,testMode:mode,previewMode:null,busy:false,submissionsEnabled:true,selectedMeasurement:{id:'synthetic'},pair:['a','b'],trialId:'old-trial',heard:[6,6],commonHeard:6,revealed:true,sessionId:'old-session',sessionExpired:false,sessionFinished:false,trials:[{id:'saved-answer',mode}],lastResearchSource:'blind',autoCollapseSetupRef:{current:true},lastActivityRef:{current:0},lastPersistedRef:{current:0},crypto:webcrypto,stopCount:0,resetCount:0,feedbackCount:0};
 for(const key of ['PreviewMode','Message','ReviewVoteData','SetupCollapsed','TestMode','PickA','PickB','SessionId','LastActivity','SessionFinished','SessionExpired','Pair','TrialId','Revealed','Heard','CommonHeard','LastResearchSource'])state['set'+key]=value=>{state[key[0].toLowerCase()+key.slice(1)]=value;};
 state.musicPanelRef={current:{stop(){state.stopCount++;},reset(){state.resetCount++;}}};state.resetFeedback=()=>state.feedbackCount++;
 state.rememberPendingStart=()=>{};state.requestSoundCheck=(action,newTest)=>{state.pendingAction=action;state.newTest=newTest;};
 state.URL=URL;state.window={requestAnimationFrame:fn=>fn(),location:{href:`http://127.0.0.1:5175/shootout?mode=${mode}&tab=shootout`},history:{replaceState(_state,_title,url){state.lastURL=url;}}};state.document={querySelector:()=>({focus(){state.focused=true;}})};
 const context=vm.createContext(state);vm.runInContext(handlers,context);
 return {state,call:code=>vm.runInContext(code,context),modePreview(){state.switchingResearchSource=vm.runInContext(expressions.get('switchingResearchSource'),context);return vm.runInContext(expressions.get('modePreview'),context);}};
}
let checks=0;
for(const [from,to] of [['blind','bring'],['bring','blind']]){
 const h=harness(from),s=h.state,answers=JSON.stringify(s.trials);
 h.call(`changeTestMode('${to}')`);
 assert.equal(s.previewMode,to);assert.equal(s.testMode,from);assert.equal(s.trialId,'old-trial');assert.deepEqual(s.heard,[6,6]);assert.equal(s.stopCount,0);assert.equal(h.modePreview(),false);
 h.call(`startTestMode('${to}')`);assert.equal(s.testMode,from);assert.equal(s.newTest,true);assert.equal(typeof s.pendingAction,'function');
 s.pendingAction();assert.equal(s.testMode,to);assert.equal(new URL(s.lastURL,"http://127.0.0.1:5175").searchParams.get("mode"),to);assert.equal(new URL(s.lastURL,"http://127.0.0.1:5175").searchParams.has("tab"),false);assert.equal(s.lastResearchSource,to);assert.equal(s.pair,null);assert.equal(s.trialId,null);assert.deepEqual([...s.heard],[0,0]);assert.equal(s.commonHeard,0);assert.equal(s.revealed,false);assert.notEqual(s.sessionId,'old-session');assert.equal(s.stopCount,1);assert.equal(s.resetCount,1);assert.equal(JSON.stringify(s.trials),answers);
 checks++;console.log(`PASS ${from} → ${to}: staged source switch preserves active comparison; confirmed start clears evidence and keeps completed answers`);
}
{
 const h=harness('blind');h.call("changeTestMode('bring');setPreviewMode(null)");assert.equal(h.state.testMode,'blind');assert.equal(h.state.trialId,'old-trial');assert.equal(h.state.stopCount,0);checks++;console.log('PASS Keeping the current source leaves its pairing and playback untouched');
}
for(const blocked of ['busy','submissionsEnabled']){
 const h=harness('blind');h.state[blocked]=blocked==='busy';h.call("changeTestMode('bring');startTestMode('bring')");assert.equal(h.state.previewMode,null);assert.equal(h.state.pendingAction,undefined);assert.equal(h.state.trialId,'old-trial');if(blocked==='submissionsEnabled')assert.equal(h.state.reviewVoteData,true);checks++;console.log(`PASS Source changes respect ${blocked} guard`);
}
{
 const h=harness('open');h.call("changeTestMode('bring')");assert.equal(h.modePreview(),true);assert.equal(h.state.testMode,'open');checks++;console.log('PASS Switching from Open retains the existing mode-preview confirmation');
}
console.log(`${checks} research music-source checks passed. No network, votes or audio used.`);
