import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
// toggleWithSpace only plays/pauses; whether Space may reach it is decided by shortcutDecision (lib/playback-shortcuts.ts).
const ast=ts.createSourceFile('panel.tsx',readFileSync('components/music-panel.tsx','utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);let handler;
function visit(n){if(ts.isVariableDeclaration(n)&&n.name?.getText(ast)==='toggleWithSpace')handler='const '+n.getText(ast)+';';ts.forEachChild(n,visit);}visit(ast);assert.ok(handler);
let clicks=0,prevented=0;
const state={audioRef:{current:{closest:()=>({querySelector:()=>({click(){clicks++;}})})}}};vm.createContext(state);vm.runInContext(ts.transpileModule(handler,{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText,state);
state.event={code:'Space',preventDefault(){prevented++},stopPropagation(){}};vm.runInContext('toggleWithSpace(event)',state);assert.equal(clicks,1);assert.equal(prevented,1);
const fixtureModule={exports:{}};vm.runInNewContext(ts.transpileModule(readFileSync('lib/playback-shortcuts.ts','utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText,{module:fixtureModule,exports:fixtureModule.exports});
const {shortcutDecision}=fixtureModule.exports;
const el=kinds=>({closest:s=>kinds.some(k=>s.split(',').some(p=>p.trim().startsWith(k)||p.includes(`[role='${k}']`)))?{}:null});
const space={code:'Space',key:' ',shiftKey:false},context={scope:'everywhere',singleKey:true,modalOpen:false,regionActive:true,mouseFocused:false};
// A control reached with the keyboard keeps its native Space action.
for(const kind of ['button','a','summary','input','textarea','select','[contenteditable]'])assert.equal(shortcutDecision(el([kind]),space,context).run,false,kind+' must keep its native keyboard action');
// The background, and a button merely left focused by a mouse click, toggle playback.
assert.equal(shortcutDecision(el([]),space,context).run,true);
assert.deepEqual({...shortcutDecision(el(['button']),space,{...context,mouseFocused:true})},{run:true,blurTarget:true});
console.log('PASS Space preserves keyboard-focused buttons/links/inputs, while the background and mouse-focused controls toggle playback');
