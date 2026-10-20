import fs from 'node:fs';import vm from 'node:vm';import assert from 'node:assert/strict';import ts from 'typescript';
for(const path of ['app/shootout/page.tsx','app/shootout/personal/page.tsx']){
 const source=fs.readFileSync(path,'utf8'),ast=ts.createSourceFile(path,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);const found=[];
 function visit(node){if(ts.isFunctionDeclaration(node)&&['onMusicPlayback','toggleSetup'].includes(node.name?.text))found.push(node.getText(ast));ts.forEachChild(node,visit)}visit(ast);assert.equal(found.length,2);
 const state={autoCollapseSetupRef:{current:false},collapsed:false,playing:false};state.setSetupCollapsed=value=>{state.collapsed=typeof value==='function'?value(state.collapsed):value};state.setMusicPlaying=value=>{state.playing=value};vm.createContext(state);vm.runInContext(ts.transpileModule(found.join('\n'),{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText,state);
 state.onMusicPlayback(false);assert.equal(state.collapsed,false,'stopped playback must not hide');state.onMusicPlayback(true);assert.equal(state.collapsed,true,'first play hides');state.toggleSetup();assert.equal(state.collapsed,false,'reopening stays open');state.onMusicPlayback(false);state.onMusicPlayback(true);assert.equal(state.collapsed,false,'subsequent play respects reopen');state.toggleSetup();assert.equal(state.collapsed,true,'manual hide works');
 assert.match(source,/onPlaybackChange=\{onMusicPlayback\}/);assert.match(source,/aria-describedby="setup-auto-hide-note" onClick=\{toggleSetup\}/);assert.match(source,/<SetupAutoHideNote\/>/);
 console.log('PASS '+path+': first playback hides, manual reopen survives later playback, manual hide remains available.');
}
