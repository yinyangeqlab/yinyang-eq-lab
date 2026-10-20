"use client";
import {useEffect,useState} from 'react';
import {usePathname} from 'next/navigation';
import {captureAccountValues,applyAccountValues,mergeAccountValues,validateAccountValues} from '@/lib/account-sync.mjs';
type State={epoch:string;revision:number;initialized:boolean;values:Record<string,string>};
const baseKey='yinyang-account-sync-base-v1';
const same=(a:unknown,b:unknown)=>JSON.stringify(a)===JSON.stringify(b);
export default function AccountAutoSync(){
 const pathname=usePathname(),[status,setStatus]=useState(''),[conflicts,setConflicts]=useState<string[]>([]),[refresh,setRefresh]=useState(false);
 useEffect(()=>{let stopped=false,busy=false,disabled=false,lastPoll=0,retryAt=0,failures=0;
 const safe=['/','/home','/my-profile','/my-data','/privacy','/curve-credits'].includes(pathname);
 async function call(body?:unknown){const response=await fetch('/api/my-profile/sync',body?{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}:{cache:'no-store'});const result=await response.json() as State&{error?:string};if(!response.ok)throw Object.assign(Error(result.error||'Sync unavailable.'),{status:response.status});return result as State;}
 async function tick(){if(localStorage.getItem('yinyang-account-sync-paused')==='true'){setStatus('Automatic sync is paused on this browser. Your account copy is retained.');return;}if(stopped||busy||disabled||document.visibilityState!=='visible'||Date.now()<retryAt)return;busy=true;
 try{await navigator.locks.request('yinyang-account-auto-sync',async()=>{
  if(stopped)return;
  const raw=localStorage.getItem(baseKey);let base:State|null=null;try{base=raw?JSON.parse(raw):null;if(base)validateAccountValues(base.values);}catch{throw Error('Saved sync state could not be read. Local data is unchanged.');}
  const local=captureAccountValues(localStorage),dirty=base&&!same(local,base.values);
  if(!dirty&&Date.now()-lastPoll<30000)return;
  const remote=await call();lastPoll=Date.now();if(stopped||localStorage.getItem('yinyang-account-sync-paused')==='true')return;
  // Never apply a response over edits made while it was in flight.
  if(!same(local,captureAccountValues(localStorage)))return;
  let desired:Record<string,string>;
  if(!base){desired=remote.initialized?remote.values:local;}
  else if(base.epoch!==remote.epoch){desired=remote.values;}
  else {const merged=mergeAccountValues(base.values,local,remote.values);if(merged.conflicts.length){setConflicts(merged.conflicts);setStatus('Sync paused: the same data changed on two devices. Both copies are retained.');return;}desired=merged.values;}
  setConflicts([]);
  const incoming=!same(desired,local);
  if(incoming&&!safe){setStatus('Changes from another device are ready. Open My profile to apply them safely.');return;}
  let saved=remote;
  if(!remote.initialized||!same(desired,remote.values))saved=await call({epoch:remote.epoch,revision:remote.revision,values:desired});
  if(stopped||localStorage.getItem('yinyang-account-sync-paused')==='true')return;
  // Save the acknowledged base even if a fresh local edit raced the write;
  // the next three-way merge then uploads that edit without losing remote state.
  if(!same(local,captureAccountValues(localStorage))){localStorage.setItem(baseKey,JSON.stringify(saved));return;}
  if(incoming){applyAccountValues(localStorage,desired);setRefresh(true);window.dispatchEvent(new Event('yinyang-data-changed'));}
  localStorage.setItem(baseKey,JSON.stringify(saved));failures=0;retryAt=0;setStatus(incoming?'Account data updated on this browser. Refresh to show it in any open tools.':'YinYangEQ · automatically synced');
 });}catch(cause){const error=cause as Error&{status?:number};if(error.status===401||error.status===403){disabled=true;setStatus('');setConflicts([]);}else if(error.status===409){lastPoll=0;setStatus('Another device saved changes. Retrying safely…');}else{failures++;retryAt=Date.now()+Math.min(60000,3000*2**Math.min(failures,4));setStatus(error.status===422?error.message:'Sync paused. Your browser data is saved locally. '+error.message);}}
 finally{busy=false;}}
 void tick();const timer=window.setInterval(()=>void tick(),3000);const focus=()=>{lastPoll=0;void tick();};window.addEventListener('focus',focus);document.addEventListener('visibilitychange',focus);
 return()=>{stopped=true;window.clearInterval(timer);window.removeEventListener('focus',focus);document.removeEventListener('visibilitychange',focus);};
 },[pathname]);
 if(!status)return null;
 return <aside className="account-sync-status" aria-label="YinYangEQ automatic sync"><p role="status">{status}</p>{conflicts.length>0&&<p>Conflicting data: {conflicts.map(key=>key.replace(/^target-lab-/, '').replaceAll('-',' ')).join(', ')}. <a href="/my-profile">Review account copies</a></p>}{status.startsWith("Automatic sync is paused")&&<button onClick={()=>{localStorage.removeItem("yinyang-account-sync-paused");window.location.reload();}}>Resume account sync</button>}{refresh&&<button onClick={()=>window.location.reload()}>Refresh saved data</button>}<a href="/my-profile">My profile &amp; sync</a></aside>;
}
