import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
function load(path,deps={}){const exports={};vm.runInNewContext(ts.transpileModule(readFileSync(path,'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText,{exports,require:n=>{assert.ok(n in deps,n);return deps[n];}});return exports;}
const listening=load('lib/listening.ts'),{matchedListeningProgress:progress}=load('lib/matched-listening.ts',{'@/lib/listening':listening});
const row=(side,start,end)=>({side,start,end,rate:1});
assert.equal(progress([row(0,0,9)]).seconds,0);
assert.equal(progress([row(0,0,5),row(1,10,15)]).complete,false);
assert.equal(progress([row(0,0,5),row(1,3,8)]).seconds,2);
assert.equal(progress([row(0,0,2),row(1,0,2),row(0,0,2),row(1,0,2)]).seconds,2);
const split=[row(0,0,2),row(1,0,2),row(0,10,13),row(1,10,13)];assert.equal(progress(split).seconds,5);assert.equal(progress(split).segments.length,2);assert.equal(progress(split).complete,true);
const almost=progress([row(0,0,4.999),row(1,0,4.999)]);assert.equal(almost.complete,false);assert.equal(almost.displaySeconds,4.9);
assert.equal(progress([row(0,0,12),row(1,2,10)]).displaySeconds,5);
const source=readFileSync('app/community-preferences/page.tsx','utf8');assert.ok(source.includes('Source audio heard on both A and B'));assert.ok(source.includes('matched.displaySeconds.toFixed(1)'));assert.ok(source.includes('matchedListeningProgress(snapshot.intervals).complete'));
console.log('PASS shared-source timing: one-sided/disjoint/repeated/partially shared/multiple shared segments, exact threshold and conservative display; UI and submit guard use shared progress.');
