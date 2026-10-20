import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
const ast=ts.createSourceFile('panel.tsx',readFileSync('components/music-panel.tsx','utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);let handler;
function visit(n){if(ts.isVariableDeclaration(n)&&n.name?.getText(ast)==='toggleWithSpace')handler='const '+n.getText(ast)+';';ts.forEachChild(n,visit);}visit(ast);assert.ok(handler);
let clicks=0,prevented=0;
class FakeElement {constructor(selector){this.selector=selector;}closest(selectors){return selectors.split(',').map(x=>x.trim()).includes(this.selector)?this:null;}}
const state={Element:FakeElement,audioRef:{current:{closest:()=>({querySelector:()=>({click(){clicks++;}})})}}};vm.createContext(state);vm.runInContext(ts.transpileModule(handler,{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText,state);
for(const selector of ['button','a','input','textarea','select',"[role='slider']",'[contenteditable]']){state.event={code:'Space',target:new FakeElement(selector),preventDefault(){prevented++},stopPropagation(){}};vm.runInContext('toggleWithSpace(event)',state);assert.equal(clicks,0,selector+' must keep its native keyboard action');assert.equal(prevented,0);}
state.event={code:'Space',target:new FakeElement('body'),preventDefault(){prevented++},stopPropagation(){}};vm.runInContext('toggleWithSpace(event)',state);assert.equal(clicks,1);assert.equal(prevented,1);
console.log('PASS Space preserves passage buttons/links/inputs/sliders, while the background shortcut still toggles ordinary playback');
