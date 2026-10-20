import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import vm from 'node:vm';
import ts from 'typescript';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import * as nickname from '../lib/listener-nickname.ts';
const require=createRequire(import.meta.url);
function load(file){const exports={};vm.runInNewContext(ts.transpileModule(readFileSync(file,'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText,{exports,require:name=>name==='@/lib/listener-nickname'?nickname:name.endsWith('.css')?{}:require(name)});return exports.default;}
const Panel=load('components/listener-nickname-panel.tsx'),Dialog=load('components/comparison-data-settings.tsx');
const props={savedActivityMonitoring:false,loadFailed:false,sharedAdmin:false,loading:false,onNicknameChange(){},submit:false,shareMusic:false,activityMonitoring:false,busy:false,error:'',returning:false,changed:false,onClose(){},onSubmitChange(){},onMusicChange(){},onActivityMonitoringChange(){},onSave(){}};
for(const name of ['Yin Yang EQ Labs','YinYeng','Sound Owl'])for(const Component of [Panel,Dialog]){
 const html=renderToStaticMarkup(React.createElement(Component,Component===Panel?{initialNickname:name}:{...props,nickname:name}));assert.ok(html.includes(nickname.NICKNAME_BRAND_RULE));assert.ok(html.includes('mailto:yinyangeqlab@gmail.com'));
 if(name==='Sound Owl'){assert.ok(!html.includes('Nickname flagged:'));assert.ok(!html.includes('aria-invalid="true"'));}
 else{assert.ok(html.includes(nickname.NICKNAME_BRAND_FLAG));assert.ok(html.includes('role="alert"'));assert.ok(html.includes('aria-invalid="true"'));}
}
console.log('PASS both actual nickname forms render the brand rule/contact link, flag exact/near matches accessibly and leave ordinary names unflagged.');
