import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
const text=fs.readFileSync('components/use-listening-reminder.ts','utf8');
const code=ts.transpileModule(text,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
function fixture({skip=false,ack=false}={}){
  const local=new Map(skip?[['target-lab-sound-check-skip','true']]:[]),session=new Map(ack?[['target-lab-personal-sound-check-acknowledged','true']]:[]),states=[];
  const storage=map=>({getItem:key=>map.get(key)??null,setItem:(key,value)=>map.set(key,value),removeItem:key=>map.delete(key)});
  const context={exports:{},localStorage:storage(local),sessionStorage:storage(session),require:()=>({useRef:value=>({current:value}),useCallback:fn=>fn,useEffect:fn=>fn(),useState:value=>{const index=states.length;states.push(value);return [value,next=>{states[index]=next}];}})};
  vm.runInNewContext(code,context);
  return {hook:context.exports.useListeningReminder(),local,session,states};
}
{
 const {hook,states,session}=fixture();assert.equal(hook.request(),false);assert.equal(states[0],true);hook.ready();assert.equal(hook.request(),true);assert.equal(session.get('target-lab-personal-sound-check-acknowledged'),'true');hook.newTest();assert.equal(states[0],true);assert.equal(session.size,0);
}
{
 const {hook,states}=fixture({skip:true});assert.equal(hook.request(),true);hook.newTest();assert.equal(states[0],false);hook.show();assert.equal(states[0],true);assert.equal(states[1],false);
}
{
 const {hook,local}=fixture({skip:true});hook.show();hook.ready();assert.equal(local.has('target-lab-sound-check-skip'),false);
}
const panel=fs.readFileSync('components/music-panel.tsx','utf8');
for(const entry of ['async function playPassage() {','async function replayPassage() {','listen: async next => {','function startPlayback(fadeIn = false) {']){
 const body=panel.slice(panel.indexOf(entry)+entry.length).trimStart();assert.ok(body.startsWith('if(beforePlayback&&!beforePlayback())return'),entry+' must check reminder before playback');
}
assert.match(panel,/if\(autoPlay&&beforePlayback&&!beforePlayback\(\)\)return false/);
assert.match(panel,/if\(audio.paused&&beforePlayback&&!beforePlayback\(\)\)return/);
console.log('PASS reminder acknowledgement, new-test repeat, saved opt-out, manual re-enable and all playback entry guards. No audio, storage outside fixtures or network used.');
