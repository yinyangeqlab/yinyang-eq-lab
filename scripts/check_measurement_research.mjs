import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { webcrypto } from 'node:crypto';
import ts from 'typescript';
import * as input from '../lib/request-json.ts';
import * as files from '../lib/research-measurement-files.ts';
import { parseCurve } from '../lib/curves.ts';

const secret = 'local-test-owner-value-'.repeat(3);
const env = { OWNER_ANALYTICS_TOKEN: secret };
let limited = null, queries = 0;
const metadata = { id: 'id', table: 'metadata' };
const chunkTable = { measurementId: 'measurementId', kind: 'kind', chunkIndex: 'chunkIndex', table: 'chunks' };
const records = new Map(), storedChunks = [];
const matches = (row, conditions) => (Array.isArray(conditions) ? conditions : [conditions]).every(({ key, value }) => row[key] === value);
const db = {
  insert(table) { return { values: value => ({ table, value }) }; },
  async batch(commands) {
    queries++;
    for (const { table, value } of commands) {
      if (table === "ownership") continue;
      if (table === metadata) records.set(value.id, value); else storedChunks.push(value);
    }
  },
  select() { return { from(table) { return { where(condition) {
    queries++;
    const rows = table === metadata ? [...records.values()] : storedChunks;
    return { get: async () => rows.find(row => matches(row, condition)), orderBy: () => ({ all: async () => rows.filter(row => matches(row, condition)).sort((a,b) => a.chunkIndex-b.chunkIndex) }) };
  } }; } }; },
};
const deps = {
  "@/lib/submission-ownership": { submissionContext:async()=>({record:()=>({table:"ownership",value:{}})}) },
  '@/db': { getDb: () => db },
  '@/db/schema': { researchMeasurements: metadata, researchMeasurementChunks: chunkTable },
  '@/lib/curves': { parseCurve },
  '@/lib/public-write-gate': { publicWriteGate: async () => limited },
  '@/lib/request-json': input,
  '@/lib/research-measurement-files': files,
  '@/lib/vote-data-notice': { VOTE_DATA_NOTICE_VERSION: 'test' },
  'cloudflare:workers': { env },
  'drizzle-orm': { eq: (key,value) => ({key,value}), and: (...values) => values, asc: key => key },
};
function load(path) {
  const code=ts.transpileModule(readFileSync(new URL(path,import.meta.url),'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;
  const context=vm.createContext({ exports:{}, require:name=>{assert.ok(name in deps,name);return deps[name];}, Request, Response, FormData, File, URL, Uint8Array, TextEncoder, TextDecoder, crypto:webcrypto, atob, btoa, Date });
  vm.runInContext(code,context);
  return context.exports;
}
deps['@/lib/owner-access']=load('../lib/owner-access.ts');
const upload=load('../app/api/research-measurements/route.ts');
const download=load('../app/api/owner-research-measurement/route.ts');
const responseText=Array.from({length:20},(_,i)=>`${20+i*1000},${i/10}`).join('\r\n')+'\r\n';
function request({text=responseText,rights='yes',version='test',origin='https://example.test',name='original.txt',extra,declaredLength}={}) {
 const form=new FormData();
 for(const [key,value] of Object.entries({name:'My response',device:'Example headphone',rig:'Example rig',type:'ie',contributorId:'11111111-1111-4111-8111-111111111111',localId:'22222222-2222-4222-8222-222222222222',rights,voteDataNoticeVersion:version,...extra}))form.set(key,value);
 form.set('file',new File([text],name,{type:'text/plain'}));
 const headers={Origin:origin}; if(declaredLength)headers['Content-Length']=declaredLength;
 return new Request('https://example.test/api/research-measurements',{method:'POST',headers,body:form});
}
for(const [options,status] of [[{rights:'no'},403],[{version:'old'},403],[{origin:'https://elsewhere.test'},403],[{text:'not a response'},400],[{name:'response.html'},400],[{text:'x'.repeat(4_000_001)},413],[{declaredLength:'12100001'},413],[{extra:{nozzleDiameterMm:'NaN'}},400]]) {
 const before=records.size;
 assert.equal((await upload.POST(request(options))).status,status,JSON.stringify(options).slice(0,100));
 assert.equal(records.size,before,'Invalid upload must not be archived');
}
limited=Response.json({error:'Wait'},{status:429});assert.equal((await upload.POST(request())).status,429);limited=null;
// More than one chunk, preserving CRLFs, a UTF-8 BOM and multibyte comments.
const original='\uFEFF'+responseText+'# café 😀\r\n'.repeat(55_000);
const saved=await upload.POST(request({text:original,name:'réponse.txt'}));
assert.equal(saved.status,201,await saved.clone().text());
const {id}=await saved.json();
const record=records.get(id), file=JSON.parse(record.files)[0];
assert.ok(file.chunks>1); assert.ok(!record.files.includes(responseText));
assert.equal(file.bytes,new TextEncoder().encode(original).length);
const address=`https://example.test/api/owner-research-measurement?id=${id}&kind=single`;
const before=queries;
for(const auth of ['', 'Bearer wrong']) {
 assert.equal((await download.GET(new Request(address,{headers:{Authorization:auth}}))).status,403);
 assert.equal(queries,before,'Unauthorized download must not query private records');
}
const owner=new Request(address,{headers:{Authorization:`Bearer ${secret}`}});
const restored=await download.GET(owner);
assert.equal(restored.status,200);assert.equal(restored.headers.get('Cache-Control'),'private, no-store');
assert.equal(restored.headers.get('Content-Type'),'application/octet-stream');
assert.equal(restored.headers.get('X-Content-Type-Options'),'nosniff');
assert.deepEqual(new Uint8Array(await restored.arrayBuffer()),new TextEncoder().encode(original));
assert.ok(restored.headers.get('Content-Disposition').includes("filename*=UTF-8''r%C3%A9ponse.txt"));
assert.equal((await download.GET(new Request(address.replace('kind=single','kind=missing'),{headers:{Authorization:`Bearer ${secret}`}}))).status,400);
const first=storedChunks[0].base64;storedChunks[0].base64=btoa('corrupt');
assert.equal((await download.GET(owner)).status,503,'Never return a corrupt or incomplete original');storedChunks[0].base64=first;
env.OWNER_ANALYTICS_TOKEN=undefined;
assert.equal((await download.GET(owner)).status,503);
// The client must retain its local save if the optional archive request fails.
const source=readFileSync(new URL('../components/measurement-manager.tsx',import.meta.url),'utf8');
const ast=ts.createSourceFile('measurement.tsx',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
let save;
function visit(node){if(ts.isFunctionDeclaration(node)&&node.name?.text==='saveFromForm')save=node.getText(ast);ts.forEachChild(node,visit);}visit(ast);
let locallySaved=null,status='';
const client=vm.createContext({Error,FormData,File,crypto:webcrypto,parseCurve,adminTestOnly:false,recordAdminTestIfNeeded:async()=>{throw Error("Offline");},contribute:true,editing:null,isRemoved:()=>false,VOTE_DATA_NOTICE_VERSION:'test',localStorage:{getItem:()=>null,setItem(){}},fetch:async()=>{throw Error('Offline');},onAdd:row=>{locallySaved=row;},onUpdate(){},beginEdit(){},setContributionStatus:message=>{status=message;},at(){},averageChannels(){},parseChannelMatchPreset(){},isImportedMeasurement(){return false;}});
vm.runInContext(ts.transpileModule(save,{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText,client);
const form=await request().formData();
// Browser FormData(formElement) is modeled by a constructor returning the fields.
client.FormData=function(){return form;};client.formElement={reset(){}};
await vm.runInContext('saveFromForm(formElement)',client);
assert.ok(locallySaved);assert.match(status,/Saved in this browser.*Offline/);
console.log('Measurement archive: consent, origin, bounds, invalid curves, throttling, exact multi-chunk UTF-8 bytes, owner-only downloads, corruption checks, and failed-upload local-save recovery pass.');

let adminTests=0,adminFetches=0;client.adminTestOnly=true;client.saveAdminTestRecord=()=>adminTests++;client.fetch=async()=>{adminFetches++;throw Error('No admin upload expected');};await vm.runInContext('saveFromForm(formElement)',client);assert.equal(adminTests,1);assert.equal(adminFetches,0);assert.equal(locallySaved.adminTestOnly,true);console.log('PASS admin measurement files remain local without any submission request.');
