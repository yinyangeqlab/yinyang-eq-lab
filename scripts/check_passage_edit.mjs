import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
const fixtureModule={exports:{}};vm.runInNewContext(ts.transpileModule(readFileSync('lib/comparison-passage.ts','utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText,{module:fixtureModule,exports:fixtureModule.exports});
const {adjustComparisonPassage:adjust}=fixtureModule.exports;
for(const duration of [5,5.05,6,8,20,180])for(const mode of ['move','start','end'])for(const delta of [-10000,-8,-.5,0,.5,8,10000]){
 const result=adjust({start:Math.max(0,duration/2-4),end:Math.min(duration,duration/2+4)},mode,delta,duration);
 assert.ok(result.start>=0);assert.ok(result.end<=duration+.001);assert.ok(Math.abs(result.end-result.start-5)<.001,'Every selection must stay exactly five seconds');
}
assert.deepEqual({...adjust({start:6,end:11},'move',2,20)},{start:8,end:13});
assert.deepEqual({...adjust({start:6,end:11},'start',2,20)},{start:8,end:13});
assert.deepEqual({...adjust({start:6,end:11},'end',-2,20)},{start:4,end:9});
console.log('PASS fixed five-second selection across move/start/end drags, short tracks and both boundaries');
