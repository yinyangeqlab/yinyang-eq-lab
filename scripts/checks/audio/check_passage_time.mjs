import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';import ts from 'typescript';
function load(file){const exports={};vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText,{exports});return exports;}
const {parsePassageTime:parse,formatPassageTime:format,passageFromTimes:range}=load('site/lib/passage-time.ts');
for(const [input,expected]of[['65.5',65.5],['1:05.50',65.5],['1:02:03.125',3723.125],[' 0:00.00 ',0]])assert.equal(parse(input),expected);
for(const bad of ['','-1','NaN','1:60','1:2:60','1::2','1e3','Infinity','1:05.1234'])assert.equal(parse(bad),null,bad);
assert.equal(format(59.999),'1:00.00');assert.equal(format(65.5),'1:05.50');assert.deepEqual(JSON.parse(JSON.stringify(range(0,5,10).passage)),{start:0,end:5});assert.ok(range(0,4.999,10).error);assert.ok(range(-1,5,10).error);assert.ok(range(0,9.91,10).error);assert.ok(range(0,9.9,10).passage);assert.ok(range(0,5,NaN).error);assert.ok(range(null,5,10).error);
console.log('PASS editable passage parsing, track bounds and exact five-second minimum.');
