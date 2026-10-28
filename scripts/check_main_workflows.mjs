// Actual page/component handlers with synthetic storage and deferred transports only.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
const require = createRequire(import.meta.url);
const deferred = () => { let resolve,reject; const promise=new Promise((a,b)=>{resolve=a;reject=b;});return {promise,resolve,reject}; };
const flush=async()=>{for(let i=0;i<40;i++)await Promise.resolve();};
let checks=0;
const check=(value,message)=>{assert.ok(value,message);checks++;};
{
 const source=fs.readFileSync('app/preference-tuning/page.tsx','utf8'),ast=ts.createSourceFile('tuning.tsx',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);let initializer;
 const visit=node=>{if(ts.isVariableDeclaration(node)&&node.name.getText(ast)==='preparePreviewFit')initializer=node.initializer.getText(ast);ts.forEachChild(node,visit);};visit(ast);assert.ok(initializer);
 const jobs=[],messages=[],current={context:{sampleRate:48000,currentTime:0},output:{gain:{cancelScheduledValues(){},setValueAtTime(){}}},filters:[{}]};
 const state={AbortController,Error,JSON,useCallback:fn=>fn,measurement:{points:[[20,0],[20000,0]]},normalized:[[20,0],[20000,0]],filters:[],bypass:false,graph:{current},media:{current:{pause(){}}},previewGain:()=>1,replaceEqStage:()=>({}),safeGain(){},setFit(){},setMessage:value=>messages.push(value),fitAutoEqAsync(_request,signal){const job=deferred();jobs.push(job);signal.addEventListener('abort',()=>job.reject(new DOMException('EQ request cancelled.','AbortError')),{once:true});return job.promise;}};
 const prepare=vm.runInNewContext(ts.transpileModule('('+initializer+')',{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText,state);
 const old=prepare(current);state.measurement={points:[[20,5],[20000,-2]]};const next=prepare(current);await flush();
 check(messages.length===0,'Superseded Tuning fits never display cancellation errors');jobs[1].resolve([{filters:[],preamp:-1}]);check(await next,'Replacement Tuning fit can succeed');check(await old===false,'Obsolete Tuning fit cannot apply');
}
const text=n=>n==null||typeof n==='boolean'?'':typeof n!=='object'?String(n):Array.isArray(n)?n.map(text).join(''):text(n.props?.children);
const all=(n,fn)=>!n||typeof n!=='object'?[]:Array.isArray(n)?n.flatMap(x=>all(x,fn)):[...(fn(n)?[n]:[]),...all(n.props?.children,fn)];
function mount(path,{globals={},imports={},audio,props={},queueFunctional=false}={}){
 const hooks=[],effects=[],events=new Map(),timers=[],updates=[];let index=0,tree,live=true,late=0;
 const React={
  useState(initial){const i=index++;if(!hooks[i])hooks[i]={value:typeof initial==='function'?initial():initial};return[hooks[i].value,next=>{if(!live)late++;if(queueFunctional&&typeof next==='function')updates.push(()=>{hooks[i].value=next(hooks[i].value);});else hooks[i].value=typeof next==='function'?next(hooks[i].value):next;}];},
  useId(){const i=index++;if(!hooks[i])hooks[i]={value:"fixture-"+i};return hooks[i].value;},
  useRef(initial){const i=index++;if(!hooks[i])hooks[i]={current:initial};return hooks[i];},
  useMemo(fn,deps){const i=index++;if(!hooks[i]||deps.some((v,j)=>!Object.is(v,hooks[i].deps[j])))hooks[i]={value:fn(),deps};return hooks[i].value;},
  useCallback(fn,deps){const i=index++;if(!hooks[i]||deps.some((v,j)=>!Object.is(v,hooks[i].deps[j])))hooks[i]={value:fn,deps};return hooks[i].value;},
  useEffect(fn,deps){const i=index++;if(!hooks[i]||!deps||deps.some((v,j)=>!Object.is(v,hooks[i].deps[j]))){const cleanup=hooks[i]?.cleanup;hooks[i]={deps};effects.push(()=>{cleanup?.();hooks[i].cleanup=fn();});}},
 };
 const jsx=(type,props)=>{if(props?.ref&&typeof type==='string')props.ref.current=type==='audio'?audio:{focus(){}};return{type,props};};
 const storage=new Map();
 const window={location:{search:'',reload(){globals.onReload?.();}},addEventListener(n,fn){if(!events.has(n))events.set(n,new Set());events.get(n).add(fn);},removeEventListener(n,fn){events.get(n)?.delete(fn);},setInterval(fn,delay){timers.push({fn,delay});return timers.length;},clearInterval(){}};
 const env={document:{querySelector:()=>null,addEventListener:(n,fn)=>window.addEventListener(n,fn),removeEventListener:(n,fn)=>window.removeEventListener(n,fn)},console,Error,URL,Blob,AbortController,Date,JSON,URLSearchParams,queueMicrotask,setTimeout(){},clearTimeout(){},clearInterval(){},window,localStorage:{getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)},...globals};
 const cache=new Map();
 function load(file){if(cache.has(file))return cache.get(file);const mod={exports:{}};cache.set(file,mod.exports);const req=id=>{
  if(id==='react')return React;if(id==='react/jsx-runtime')return{jsx,jsxs:jsx,Fragment:'fragment'};if(id in imports)return imports[id];if(id.endsWith('.css'))return{};
  // Worker execution has its own real-engine suite; these tests defer transports.
  if(id==='@/lib/autoeq-client'||id==='./autoeq-client')return{fitAutoEqAsync:async()=>[]};
  if(id==='@/components/embed-common')return load('components/embed-common.ts');
  if(id.startsWith('@/components/')||id==='next/link')return{default:id,useInvitesEnabled:()=>false,useConsentPrompt:()=>({ask:async fn=>fn(),prompt:null})};
  if(id==='lucide-react')return new Proxy({},{get:(_,k)=>String(k)});
  if(id.startsWith('@/lib/')){const name=id.slice(2);if(fs.existsSync(name+'.ts'))return load(name+'.ts');return require('../'+name);}
  if(id.startsWith('.')){const base=fileURLToPath(new URL(id,new URL('../'+file,import.meta.url)));if(fs.existsSync(base+'.ts'))return load((base+'.ts').replace(fileURLToPath(new URL('../',import.meta.url)),''));return require(base);}
  return require(id);
 };vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText,{...env,require:req,module:mod,exports:mod.exports});cache.set(file,mod.exports);return mod.exports;}
 const Component=load(path).default;
 const h={render(){while(updates.length)updates.shift()();index=0;tree=Component(props);while(effects.length)effects.shift()();return tree;},find(fn){const nodes=all(tree,fn);assert.equal(nodes.length,1,'One rendered element expected');return nodes[0];},button(label){return this.find(n=>n.type==='button'&&text(n).trim()===label);},get tree(){return tree;},events,timers,storage,get late(){return late;},unmount(){live=false;for(const hook of hooks)hook?.cleanup?.();},load};h.render();return h;
}
class PlaybackTarget { constructor(inside=false){this.inside=inside;} closest(selector){return selector===".pt-listen"&&this.inside?{}:null;} }
function tuning({blocked=false,queueFunctional=false}={}){
 const jobs=[],requests=[],play=deferred(),actions=[];const node=()=>({connect(){},disconnect(){},frequency:{value:0},gain:{value:0},Q:{value:0}});
 const audio={src:'',currentSrc:'',paused:true,duration:45,currentTime:0,load(){actions.push('load');},pause(){this.paused=true;},play(){this.paused=false;return play.promise;}};
 class AudioContext extends EventTarget {state='running';destination={};createGain=node;createBiquadFilter=node;createMediaElementSource(){actions.push('media-source');return node();}createAnalyser(){return{...node(),fftSize:0};}resume(){return Promise.resolve();}close(){this.state='closed';return Promise.resolve();}}
 const h=mount('app/preference-tuning/page.tsx',{audio,queueFunctional,imports:{'@/lib/loudness':{analyzeTrack(file){const job=deferred();jobs.push({file,...job});return job.promise;}},'@/lib/music-catalog':{listeningPool:[{fileUrl:'/synthetic.wav',title:'Synthetic',artist:'Fixture'}]}},globals:{Element:PlaybackTarget,HTMLElement:PlaybackTarget,AudioContext,URL:{createObjectURL:f=>'blob:'+f.name,revokeObjectURL(){}},fetch:async url=>{if(url.startsWith('/api/'))return{ok:true,json:async()=>url==='/api/targets'?[]:{}};const job=deferred();requests.push(job);return job.promise;},...(blocked?{localStorage:{getItem(){throw Error('blocked');},setItem(){throw Error('blocked');}}}:{} )}});
 h.render();return Object.assign(h,{audio,jobs,requests,play,actions,choose(name){h.find(n=>n.type==='input'&&n.props.type==='file'&&!n.props.multiple&&n.props.accept.startsWith('audio/')).props.onChange({target:{files:[{name}]}});h.render();},wave(){return h.find(n=>n.type==='@/components/track-waveform').props;}});
}
{
 const h=tuning();await flush();h.render();h.choose('native-control.wav');
 check(h.actions.indexOf('media-source')>=0&&h.actions.indexOf('media-source')<h.actions.indexOf('load'),'Tuning connects the processed media source before metadata prerolls in WebKit');
 h.audio.paused=false;h.find(n=>n.type==='audio').props.onPlay();h.render();
 check(h.audio.paused,'An initial native/OS media Play cannot bypass the Tuning graph and headroom');
 check(text(h.tree).includes('Press Play music'),'Native playback before initialization gives an actionable gesture prompt');
 h.find(n=>n.type==='button'&&n.props['aria-label']==='Play music').props.onClick();
 check(!h.audio.paused,'The explicit Play gesture initializes the graph and starts playback');h.play.resolve();await flush();h.unmount();
}
{
 const measurement={id:'same-id',name:'Synthetic',type:'oe',points:[[20,0],[20000,0]]};
 const store=new Map([['target-lab-measurements',JSON.stringify([measurement])],['target-lab-active-measurement',measurement.id]]);
 const jobs=[],variant=(bands,method='peqdb',priority='close')=>({bands,method,priority,engine:'peqdb',filters:[{hz:1000,gain:0,q:1}],preamp:-1,rms:0,peakBoost:0});
 const h=mount('app/preference-tuning/page.tsx',{imports:{'@/lib/music-catalog':{listeningPool:[]},'@/lib/preference-finalize':{finalizeVariant:(_raw,_curve,bands,method,priority)=>variant(bands,method,priority)},'@/lib/autoeq-export':{finalizePeqdb(_raw,_curve,bands,signal){const job=deferred();jobs.push({...job,bands,signal});return job.promise;}}},globals:{setTimeout:fn=>queueMicrotask(fn),localStorage:{getItem:k=>store.get(k)??null,setItem:(k,v)=>store.set(k,v)},fetch:async()=>({ok:true,json:async()=>[]})}});
 await flush();h.render();
 const edit=points=>{h.find(n=>n.type==='@/components/headphone-picker').props.onEdit(measurement.id);h.render();h.find(n=>n.type==='@/components/measurement-manager').props.onUpdate({...measurement,points});h.render();};
 h.button('Finalize preference curve').props.onClick();await flush();
 for(let i=0;i<3;i++){jobs[i].resolve(variant(jobs[i].bands));await flush();}
 h.render();check(all(h.tree,n=>n.props?.['aria-label']==='Download EQ formats').length===5,'Finalization exposes five current variants per band');
 check(text(h.tree).includes('15 EQ options'),'Finalization reports all fifteen options');
 edit([[20,5],[20000,-3]]);
 check(all(h.tree,n=>n.props?.['aria-label']==='Download EQ formats').length===0,'Editing measurement points under the same ID invalidates finished exports');
 h.button('Finalize preference curve').props.onClick();await flush();const pending=jobs[3];
 edit([[20,8],[20000,-4]]);check(pending.signal.aborted,'Same-ID measurement edits cancel pending finalization');
 pending.reject(new DOMException('Cancelled','AbortError'));await flush();h.render();
 check(all(h.tree,n=>n.props?.['aria-label']==='Download EQ formats').length===0,'Cancelled finalization cannot restore stale downloads');h.unmount();
}
{
 const measurement={id:'same-id',name:'Synthetic',points:[[20,0],[20000,0]]},store=new Map([['target-lab-measurements',JSON.stringify([measurement])]]),job=deferred(),saved=[];let signal;
 const h=mount('components/library-eq-panel.tsx',{props:{onChange(){}},imports:{'@/lib/autoeq-export':{finalizePeqdb(_raw,_curve,_bands,currentSignal){signal=currentSignal;return job.promise;}},'@/lib/music-library-eq':{readLibraryEqs:()=>[],saveLibraryEq:eq=>saved.push(eq)}},globals:{crypto,localStorage:{getItem:k=>store.get(k)??null},fetch:async()=>({ok:true,json:async()=>[]})}});
 await flush();h.render();h.find(n=>n.props?.id==='library-headphone').props.onChange({target:{value:measurement.id}});h.render();h.button('Create EQ').props.onClick();
 store.set('target-lab-measurements',JSON.stringify([{...measurement,points:[[20,5],[20000,-3]]}]));h.events.get('storage').forEach(fn=>fn());h.render();
 check(signal.aborted,'Storage refresh with same-ID measurement edits cancels library generation');
 job.resolve({engine:'peqdb',filters:[],preamp:-1,rms:0});await flush();h.render();
 check(saved.length===0,'Late library generation cannot save the stale measurement fit');check(!h.button('Create EQ').props.disabled,'Cancelled library generation releases the busy state');h.unmount();
}
{
 const h=tuning();await flush();h.render();h.choose('old.wav');h.choose('new.wav');h.jobs[1].resolve({id:'new'});await flush();h.render();h.jobs[0].resolve({id:'old'});await flush();h.render();check(h.wave().analysis.id==='new','Late waveform cannot replace the current local track');
 h.find(n=>n.type==='audio').props.onLoadedMetadata();h.render();check(h.wave().duration===45,'Metadata supplies duration');h.choose('third.wav');check(h.wave().duration===0,'Selecting another file clears the previous duration');
 h.jobs[2].reject(Error('bad format'));await flush();h.render();check(text(h.tree).includes('source waveform analysis is unavailable'),'Current decoder failure remains actionable');
 h.choose('fourth.wav');h.find(n=>n.type==='select'&&n.props['aria-label']==='Choose a curated track').props.onChange({target:{value:'0'}});h.render();h.jobs[3].reject(Error('stale'));await flush();h.render();check(!text(h.tree).includes('source waveform analysis is unavailable'),'Old local failure cannot replace a curated-track status');
 h.choose('fifth.wav');h.requests[0].resolve({ok:true,blob:async()=>new Blob()});await flush();h.render();check(h.jobs.length===5,'A retired curated fetch never starts decoding');
 h.jobs[4].resolve({id:'latest'});await flush();h.render();h.find(n=>n.type==='button'&&n.props['aria-label']==='Play music').props.onClick();await flush();h.render();h.find(n=>n.type==='button'&&n.props['aria-label']==='Play music').props.onClick();h.render();h.play.resolve();await flush();h.render();check(h.find(n=>n.type==='button'&&n.props['aria-label']==='Play music'),'Pending Play completion cannot undo Pause');h.unmount();
}
{
 const h=tuning({blocked:true});await flush();h.render();check(text(h.tree).includes('Tuning still works in this tab'),'Blocked storage does not crash Tuning and discloses unsaved changes');h.choose('fixture.wav');h.unmount();const before=h.late;h.jobs[0].resolve({id:'late'});await flush();check(h.late===before,'Retired decoder cannot update an unmounted page');
}
{
 let blocked=true,hash='#key=synthetic',replaced=0;
 const store=new Map();const localStorage={getItem:k=>store.get(k)??null,setItem(k,v){if(blocked)throw Error('quota');store.set(k,v);}};
 const h=mount('components/embed-results.tsx',{props:{id:'synthetic'},globals:{localStorage,location:{get hash(){return hash;},pathname:'/s/synthetic/results',search:'',origin:'https://fixture.invalid'},history:{replaceState(){replaced++;hash='';}},fetch:async()=>({ok:true,json:async()=>({id:'synthetic',title:'Fixture',createdAt:1,targets:[],runs:[],summary:{sideBias:{decided:0},targets:[],pairs:[],byKind:{},bySignal:{},timeline:[]},ownerShare:{}})})}});
 await flush();h.render();check(replaced===0&&hash,'Unsaved private results key stays in the address bar');check(text(h.tree).includes('Browser storage could not save'),'Storage failure is disclosed before leaving');
 const common=h.load('components/embed-common.ts');check(common.saveShootout({id:'other',key:'key'})===false,'Persistence reports failure');blocked=false;check(common.saveShootout({id:'other',key:'key'})===true,'Persistence confirms saved keys');check(common.readSaved()[0].key==='key','Successful save preserves key');h.unmount();
}
{
 const reads=[],deletion=deferred();let clearFails=false;const h=mount('app/my-data/page.tsx',{imports:{'@/lib/account-sync-cache.mjs':{clearSyncBase:async()=>{}},'@/lib/browser-data':{clearSiteBrowserData(){if(clearFails)throw Error('blocked');},notifySharingChoicesChanged(){},comparisonLookup(){},deleteBrowserTrial(){}}},globals:{fetch(url,options){if(options?.method==='DELETE')return deletion.promise;const job=deferred();reads.push(job);return job.promise;}}});
 const data={records:[],activityLogs:[],activityLogLimit:0,submissionsEnabled:true};
 h.events.get('focus').forEach(fn=>fn());reads[1].resolve({ok:true,json:async()=>({...data,nickname:'Newest'})});await flush();h.render();reads[0].resolve({ok:true,json:async()=>({...data,nickname:'Stale'})});await flush();h.render();check(h.find(n=>n.type==='@/components/listener-nickname-panel').props.initialNickname==='Newest','Latest data refresh wins over out-of-order older responses');
 h.events.get('focus').forEach(fn=>fn());h.button('Delete all my submitted data…').props.onClick();h.render();h.find(n=>n.type==='input'&&n.props.autoFocus).props.onChange({target:{value:'DELETE ALL MY DATA'}});h.render();h.button('Permanently delete').props.onClick();h.render();const count=reads.length;h.events.get('focus').forEach(fn=>fn());check(reads.length===count,'Focus refresh cannot race an in-flight deletion');clearFails=true;deletion.resolve({ok:true,json:async()=>({})});await flush();h.render();reads[2].resolve({ok:true,json:async()=>({...data,nickname:'Deleted'})});await flush();h.render();check(!text(h.tree).includes('Delete all my submitted data…'),'A pre-deletion response cannot restore erased records');check(text(h.tree).includes('Browser storage still needs manual clearing'),'Successful server erasure never falsely claims browser clearing');h.unmount();
}
{
 let calls=0;
 const mine={};
 const snapshot=()=>({signedIn:true,mine:{...mine},totals:{keep:Object.keys(mine).length,pass:0},byTrack:{}});
 const h=mount('app/music-library/page.tsx',{imports:{'next/navigation':{useSearchParams:()=>new URLSearchParams()},'@/lib/music-catalog':{musicCandidates:[{url:'synthetic',title:'Synthetic',artist:'Fixture',genre:'Test',focus:'Test',fileUrl:'/synthetic.wav',duration:10,license:'https://creativecommons.org/licenses/by/4.0/'}]}},globals:{localStorage:{getItem(){throw Error('blocked');},setItem(){throw Error('blocked');}},fetch:async(url,options)=>{if(options?.method==='POST'){calls++;mine.synthetic=JSON.parse(options.body).choice;}return{ok:true,json:async()=>snapshot()};}}});
 await flush();h.render();check(!text(h.tree).includes('blocked'),'Account votes load even when the optional browser cache cannot be read');h.button('Upvote').props.onClick();await flush();h.render();check(calls===1&&mine.synthetic==='keep','Vote reaches the synthetic server once');check(!text(h.tree).includes('blocked')&&!text(h.tree).includes('Could not save'),'Cache denial cannot report a successful server vote as failed');h.unmount();
}
{
 const reads=[];
 const h=mount('app/my-profile/page.tsx',{globals:{fetch(url){const job=deferred();reads.push({url,...job});return job.promise;}}});
 reads[0].resolve({ok:true,json:async()=>({entries:[],hasMore:true})});await flush();h.render();
 const sharing=h.find(n=>n.type==='@/components/profile-category-sharing');sharing.props.onChanged();sharing.props.onChanged();h.render();check(h.button('Next').props.disabled,'Profile paging waits for the current refresh');
 reads[2].resolve({ok:true,json:async()=>({entries:[],hasMore:true})});await flush();h.render();h.button('Next').props.onClick();h.render();h.render();check(reads[3].url.endsWith('page=2'),'Next requests the next page');check(h.button('Previous').props.disabled,'Profile paging cannot skip ahead during a pending request');
 reads[3].resolve({ok:true,json:async()=>({entries:[],hasMore:false})});await flush();h.render();reads[1].resolve({ok:true,json:async()=>({entries:[],hasMore:true})});await flush();h.render();check(all(h.tree,n=>n.type==='button'&&text(n)==='Next').length===0,'An older page response cannot restore stale pagination');
 sharing.props.onChanged();h.unmount();const before=h.late;reads[4].resolve({ok:true,json:async()=>({entries:[],hasMore:true})});await flush();check(h.late===before,'Unmount invalidates pending profile reads');
}
{
 const h=mount('components/embed-create.tsx',{globals:{location:{origin:'https://fixture.invalid'},localStorage:{getItem(){return null;},setItem(){throw Error('quota');}},fetch:async(url,options)=>({ok:true,json:async()=>options?.method==='POST'?{id:'synthetic',manageKey:'synthetic-key'}:{targets:[{id:'a',name:'A'},{id:'b',name:'B'}]}})}});
 await flush();h.render();for(const input of all(h.tree,n=>n.type==='input'&&n.props.type==='checkbox'))input.props.onChange();h.render();h.button('Create shootout').props.onClick();await flush();h.render();check(text(h.tree).includes('Copy or bookmark the private results link before leaving'),'Creation warns when its private key is not saved');check(h.find(n=>n.type==='input'&&n.props['aria-label']==='Private results link').props.value.endsWith('#key=synthetic-key'),'Creation still exposes a recoverable private link when storage fails');h.unmount();
}
{
 const h=tuning({queueFunctional:true});await flush();h.render();const bass=()=>h.find(n=>n.type==='input'&&n.props['aria-label']==='Bass');bass().props.onChange({target:{value:'1'}});bass().props.onChange({target:{value:'5'}});h.render();h.button('Undo 2').props.onClick();h.render();check(bass().props.value===1,'Batched tuning edits capture each previous value before queued history updates');h.button('Undo 1').props.onClick();h.render();check(bass().props.value===0,'Undo restores the original value after batched edits');h.button('Redo 2').props.onClick();h.render();check(bass().props.value===1,'Redo keeps the correct next edit after batched changes');h.unmount();
}
{
 let now=100000;class ClockDate extends Date{static now(){return now;}}
 const h=mount('components/activity-monitoring-panel.tsx',{globals:{Date:ClockDate,fetch:async()=>({ok:true,json:async()=>({events:[{id:'fixture',subject_id:'synthetic',session_id:'fixture',test_active:1,created_at:100000,route:'/synthetic',event_type:'heartbeat',listener_label:'Fixture'}],next:null,hasMore:false,retentionDays:30,activeWindowSeconds:90})})}});await flush();h.render();check(text(h.tree).includes('1 session currently reporting'),'Fresh activity is initially marked active');now=191000;h.timers.filter(t=>t.delay===1000).forEach(t=>t.fn());h.render();check(text(h.tree).includes('0 sessions currently reporting'),'Activity ages out on a clock tick without a fetch or another user action');h.unmount();
}
{
 let now=100000;class ClockDate extends Date{static now(){return now;}}
 const h=mount('components/yinyangeq-account-panel.tsx',{globals:{Date:ClockDate,fetch:async()=>({ok:true,json:async()=>({created:true,devices:[],snapshots:[],captures:[],grants:[{id:'fixture',label:'Synthetic expiry grant',expires_at:101000}]})})}});await flush();h.render();check(text(h.tree).includes('Synthetic expiry grant'),'A current sign-in grant is displayed');now=102000;h.timers.filter(t=>t.delay===1000).forEach(t=>t.fn());h.render();check(!text(h.tree).includes('Synthetic expiry grant'),'Expired sign-in grant disappears without interaction');h.unmount();
}
console.log(`PASS ${checks} main workflow regressions: actual Tuning, music votes, private links, profile pagination and data erasure handlers; synthetic fixtures only.`);

{
 let picked='',focusReturned=false;
 const rows=[{id:'own',name:'Sennheiser HD 600',device:'HD 600',source:'Synthetic',rig:'Fixture',type:'oe',origin:'upload'}];
 const h=mount('components/headphone-picker.tsx',{props:{rows,selectedId:'own',headphoneType:'oe',onType(){},onSelect:id=>{picked=id},onClear(){},onImport:async()=>{},onUpload(){},onEdit(){},onDelete(){}},globals:{fetch:async()=>({ok:true,json:async()=>({entries:[]})})}});
 const input=()=>h.find(n=>n.type==='input'&&n.props.type==='search');
 input().props.onFocus({currentTarget:{select(){}}});await flush();h.render();input().props.onChange({target:{value:'hd600'}});h.render();
 const result=h.find(n=>n.type==='button'&&n.props['data-measurement-option']!==undefined);result.props.onClick();h.render();check(picked==='own','Actual picker matches compact model text and selects the original measurement identity');
 input().props.onFocus({currentTarget:{select(){}}});h.render();
 const details=h.find(n=>n.type==='details'&&n.props.className==='measurement-management');details.props.onToggle({currentTarget:{open:true}});h.render();check(!all(h.tree,n=>n.props?.className==='headphone-search-results').length,'Opening Manage from the keyboard closes search results');const element={open:true,querySelector:()=>({focus(){focusReturned=true;}})};
 details.props.onKeyDown({key:'Escape',preventDefault(){},currentTarget:element});check(!element.open&&focusReturned,'Manage Escape closes the disclosure and returns focus');
 check(!all(h.tree,n=>n.props?.role==='combobox'||n.props?.role==='listbox').length,'Mixed-action measurement search uses honest native search and labelled results semantics');h.unmount();
}
console.log('PASS actual measurement picker compact search, Manage Escape/focus and honest native semantics.');

{
 const h=tuning();await flush();h.render();h.choose('scope.wav');h.jobs[0].resolve({id:'scope'});await flush();h.render();
 let handled=0;const inside=new PlaybackTarget(true);
 const press=()=>{const event={code:'Space',key:' ',target:inside,repeat:false,isComposing:false,altKey:false,ctrlKey:false,metaKey:false,shiftKey:false,preventDefault(){handled++;},stopPropagation(){}};for(const fn of [...h.events.get('keydown')])fn(event);};
 h.storage.set('yinyang-display-preferences',JSON.stringify({shortcutScope:'off'}));press();await flush();h.render();check(handled===0&&h.audio.paused,'Tuning Off disables playback keys in the actual page handler');
 h.storage.set('yinyang-display-preferences',JSON.stringify({shortcutScope:'player'}));press();await flush();check(handled===0,'Tuning player scope waits until the playback region is used');
 for(const fn of h.events.get('pointerdown'))fn({target:inside});press();await flush();h.render();check(handled===1&&!h.audio.paused,'Tuning player scope works after pointer interaction in its player');h.unmount();
}
console.log('PASS Tuning Off and player-region scope through actual keyboard handlers.');

for (const viewerHasAccess of [true, false]) {
 let reloads=0;
 const h=mount('components/service-warning.tsx',{globals:{onReload:()=>reloads++,AbortSignal,fetch:async()=>({ok:true,json:async()=>({id:'synthetic-owner-closure',active:true,ownerOnly:true,viewerHasAccess,message:'Synthetic closure'})})}});
 await flush();h.render();
 if(viewerHasAccess)check(reloads===0&&h.tree?.props?.warning?.title==='Closed for private testing','An admitted viewer sees owner-only closure without a reload loop');
 else check(reloads===1,'A visitor denied by owner-only maintenance still reloads into the gate');
 h.unmount();
}

console.log("PASS owner-closure admission and visitor reload regression checks.");
