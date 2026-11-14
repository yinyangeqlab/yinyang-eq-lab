// Actual component failure/retry and private-link recovery, using synthetic transports only.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {savedSectionSummary} from '../lib/saved-section-summary.ts';
const require=createRequire(import.meta.url);
const flush=async()=>{for(let i=0;i<40;i++)await Promise.resolve();};
let checks=0;const check=(value,message)=>{assert.ok(value,message);checks++;};
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
  if(id==='@/components/site-help-actions')return{useSiteHelpActions:()=>null};
  if(id.startsWith('@/components/')||id==='next/link')return{default:id,useInvitesEnabled:()=>false,useConsentPrompt:()=>({ask:async fn=>fn(),prompt:null})};
  if(id==='lucide-react')return new Proxy({},{get:(_,k)=>String(k)});
  if(id.startsWith('@/lib/')){const name=id.slice(2);if(fs.existsSync(name+'.ts'))return load(name+'.ts');return require('../'+name);}
  if(id.startsWith('.')){const base=fileURLToPath(new URL(id,new URL('../'+file,import.meta.url)));if(fs.existsSync(base+'.ts'))return load((base+'.ts').replace(fileURLToPath(new URL('../',import.meta.url)),''));return require(base);}
  return require(id);
 };vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText,{...env,require:req,module:mod,exports:mod.exports});cache.set(file,mod.exports);return mod.exports;}
 const Component=load(path).default;
 const h={render(){while(updates.length)updates.shift()();index=0;tree=Component(props);while(effects.length)effects.shift()();return tree;},find(fn){const nodes=all(tree,fn);assert.equal(nodes.length,1,'One rendered element expected');return nodes[0];},button(label){return this.find(n=>n.type==='button'&&text(n).trim()===label);},get tree(){return tree;},events,timers,storage,get late(){return late;},unmount(){live=false;for(const hook of hooks)hook?.cleanup?.();},load};h.render();return h;
}

{
 let fail=true,reads=0;const h=mount('app/listeners/yinyangeq/page.tsx',{globals:{fetch:async()=>{reads++;if(fail)throw Error('Synthetic unavailable');return{ok:true,json:async()=>({entries:[],hasMore:false})};}}});
 await flush();h.render();check(text(h.tree).includes('Synthetic unavailable')&&!text(h.tree).includes('Loading published activity'),'Journal failure replaces the loading state');
 fail=false;h.button('Try again').props.onClick();h.render();h.render();check(text(h.tree).includes('Loading published activity')&&!text(h.tree).includes('Synthetic unavailable'),'Retry clears a stale journal error');await flush();h.render();check(reads===2&&text(h.tree).includes('No published activity'),'Successful retry displays the actual empty result');h.unmount();
}
{
 let fail=true,reads=0;const h=mount('components/song-suggestions.tsx',{props:{testOnly:true},globals:{fetch:async()=>{reads++;if(fail)throw Error('Synthetic unavailable');return{ok:true,json:async()=>[]};}}});
 check(text(h.tree).includes('Loading suggestions')&&!text(h.tree).includes('No suggestions yet'),'Suggestions do not claim empty while loading');await flush();h.render();check(text(h.tree).includes('Synthetic unavailable')&&!text(h.tree).includes('No suggestions yet'),'Failed suggestions are distinct from empty');fail=false;h.button('Try again').props.onClick();h.render();await flush();h.render();check(reads===2&&text(h.tree).includes('No suggestions yet'),'Retry can confirm the actual empty suggestion list');h.unmount();
}
{
 const key='a'.repeat(43);let hash='#key='+key;const h=mount('components/embed-results.tsx',{props:{id:'abcdefghij'},globals:{location:{get hash(){return hash;},pathname:'/s/abcdefghij/results',search:'',origin:'https://fixture.invalid'},history:{replaceState(){hash='';}},fetch:async()=>({ok:true,json:async()=>({id:'abcdefghij',title:'Fixture',createdAt:1,expiresAt:2,targets:[],runs:[],summary:{runs:0,sideBias:{decided:0},targets:[],pairs:[],byKind:{},bySignal:{},timeline:[]},ownerShare:{}})})}});
 await flush();h.render();
 check(hash==='','The saved key can be removed from the address bar');
 const field=h.find(n=>typeof n.type==='function'&&n.props.label==='Private results access link');
 check(field.props.value.endsWith('#key='+key),'The displayed recovery link still contains its complete key');
 h.unmount();
}
{
 const ast=ts.createSourceFile('page.tsx',fs.readFileSync('app/shootout/page.tsx','utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);let found=0;
 function walk(node,ancestors=[]){if(ts.isJsxElement(node)&&node.openingElement.attributes.getText(ast).includes('comparison-outcome')){found++;check(!ancestors.some(a=>ts.isJsxElement(a)&&a.openingElement.attributes.getText(ast).includes('shootout-setup-panel')),'Save feedback is outside auto-collapsed setup');}ts.forEachChild(node,n=>walk(n,[...ancestors,node]));}walk(ast);check(found===1,'There is one durable comparison outcome region');
 const value=savedSectionSummary('[{"name":"One"},{"title":"Two"}]');check(value.description.startsWith('2 entries')&&value.entries.join(',')==='One,Two','Conflict summaries describe the full stored section');check(savedSectionSummary(undefined).entries.length===0,'Missing account copies are described without guessing deletion');check(savedSectionSummary('{bad').description.includes('could not be summarized'),'Unrecognized saved data remains reviewable rather than crashing');
}
console.log(`PASS ${checks} beginner-guidance regressions; synthetic data only.`);

{
 const h=mount('components/service-status-panel.tsx',{globals:{fetch:async()=>({ok:true,json:async()=>({active:true,enabled:true,ownerOnly:true,message:'Closed',pauseSubmissions:true,lockedFeatures:['shootouts','listeningPool','preferenceTuning','contributions'],expiresAt:null})})}});
 await flush();h.render();check(text(h.tree).includes('Live now · Whole-site maintenance'),'The deployment-wide lock appears live in admin');check(text(h.tree).includes('Until turned off · no automatic end'),'An indefinite live lock states its actual duration');h.unmount();
}
{
 let sent;const h=mount('components/service-status-panel.tsx',{globals:{fetch:async(_url,options)=>{if(options?.method==='POST'){sent=JSON.parse(options.body);return{ok:true,json:async()=>({active:true,enabled:false,message:sent.message,pauseSubmissions:true,lockedFeatures:['shootouts'],expiresAt:null})};}return{ok:true,json:async()=>({active:false,enabled:false,expiresAt:null,lockedFeatures:[]})};}}});
 await flush();h.render();h.find(n=>n.type==='input'&&n.props.value==='indefinite').props.onChange();h.render();check(text(h.tree).includes('Until you turn it off'),'The indefinite option explains that manual clearing is required');h.button('Publish notice').props.onClick();await flush();h.render();check(sent.indefinite===true&&!('durationMinutes' in sent),'Admin publishes an explicit indefinite window, not a guessed numeric expiry');check(text(h.tree).includes('Live now'),'Published indefinite maintenance is shown live');h.unmount();
}
console.log('PASS maintenance panel status and indefinite publication checks.');
