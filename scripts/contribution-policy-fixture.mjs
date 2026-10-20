// Real contribution policy for isolated VM regression harnesses.
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import * as input from '../lib/request-json.ts';
const exports={};
vm.runInNewContext(ts.transpileModule(readFileSync(new URL('../lib/admin-contributions.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports,require:name=>{if(name==='@/lib/request-json')return input;throw Error(name);}});
export default exports;
