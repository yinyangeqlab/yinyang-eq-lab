"use client";
import {useEffect,useState} from 'react';
import {usePathname} from 'next/navigation';
import {readAccountState,writeAccountState} from '@/lib/account-sync-transfer.mjs';
import {readSyncBase,writeSyncBase} from '@/lib/account-sync-cache.mjs';
import {accountDataDigest} from '@/lib/device-sync.mjs';
import {captureAccountValues,applyAccountValues,mergeAccountValues,validateAccountValues} from '@/lib/account-sync.mjs';
type State={segmented?:boolean;enabled?:boolean;devicePaused?:boolean;protectedAccount?:boolean;accountKey?:string;consent?:{stamp:string;monitoring:boolean};epoch:string;revision:number;initialized:boolean;values:Record<string,string>};
const same=(a:unknown,b:unknown)=>JSON.stringify(a)===JSON.stringify(b);
export default function AccountAutoSync(){
 const pathname=usePathname(),[status,setStatus]=useState(''),[conflicts,setConflicts]=useState<string[]>([]),[refresh,setRefresh]=useState(false);
 useEffect(()=>{let stopped=false,busy=false,disabled=false,lastPoll=0,retryAt=0,failures=0,lastReport=0;let observedConsent='';let lastState:State|undefined;
 const safe=['/','/home','/my-profile','/account-sync','/my-data','/privacy','/curve-credits'].includes(pathname);
 async function report(state:State|undefined,phase:string){if(Date.now()-lastReport<25000&&phase==='paused')return;try{const digest=await accountDataDigest(captureAccountValues(localStorage));await fetch('/api/my-profile/devices',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'report',epoch:state?.epoch||'',revision:state?.revision||0,dataDigest:digest,consentStamp:observedConsent||null,state:phase})});lastReport=Date.now();window.dispatchEvent(new Event('yinyang-device-status'));}catch{/* Status reporting never interrupts or overwrites saved listening data. */}}
 async function tick(){if(stopped||busy||disabled||document.visibilityState!=='visible'||Date.now()<retryAt)return;busy=true;
 try{if(localStorage.getItem('yinyang-account-sync-paused')==='true'){setStatus('Automatic sync is paused on this browser. Your account copy is retained.');await report(lastState,'paused');return;}await navigator.locks.request('yinyang-account-auto-sync',async()=>{
  if(stopped)return;
  let base:State|null=null;try{base=await readSyncBase(localStorage) as State|null;if(base)validateAccountValues(base.values);}catch{throw Error('Saved sync state could not be read. Local data is unchanged.');}
  const local=captureAccountValues(localStorage),dirty=base&&!same(local,base.values);
  if(!dirty&&Date.now()-lastPoll<30000)return;
  const remote=await readAccountState() as State;lastState=remote;lastPoll=Date.now();
  if(base&&(base.accountKey&&base.accountKey!==remote.accountKey||!base.accountKey&&!remote.protectedAccount))base=null;
  if(remote.consent&&observedConsent!==remote.consent.stamp){observedConsent=remote.consent.stamp;try{localStorage.setItem('yinyang-activity-monitoring',String(remote.consent.monitoring));window.dispatchEvent(new Event('yinyang-monitoring-choice'));window.dispatchEvent(new Event('yinyang-data-changed'));}catch{}}
  if(remote.enabled===false){setStatus(remote.devicePaused?'Automatic sync is paused for this device. Resume it in Sync settings.':'Account sync is off. Review your data choices to enable it.');return;}
if(stopped||localStorage.getItem('yinyang-account-sync-paused')==='true')return;
  // Never apply a response over edits made while it was in flight.
  if(!same(local,captureAccountValues(localStorage)))return;
  let desired:Record<string,string>;
  if(!base){if(remote.initialized){const merged=mergeAccountValues({},local,remote.values);if(merged.conflicts.length){setConflicts(merged.conflicts);setStatus('Sync paused: this browser and the account have different saved values. Both copies are retained.');await report(remote,'conflict');return;}desired=merged.values;}else desired=local;}
  else if(base.epoch!==remote.epoch){desired=remote.values;}
  else {const merged=mergeAccountValues(base.values,local,remote.values);if(merged.conflicts.length){setConflicts(merged.conflicts);setStatus('Sync paused: the same data changed on two devices. Both copies are retained.');await report(remote,'conflict');return;}desired=merged.values;}
  setConflicts([]);
  const incoming=!same(desired,local);
  if(incoming&&!safe){setStatus('Changes from another device are ready. Open Sync settings to apply them safely.');await report(remote,'pending');return;}
  let saved=remote;
  if(!remote.segmented||!remote.initialized||!same(desired,remote.values))saved=await writeAccountState(remote,desired,fetch,message=>{if(stopped||localStorage.getItem('yinyang-account-sync-paused')==='true')throw Error('Transfer paused; saved copies are retained.');setStatus(message);}) as State;
  if(stopped||localStorage.getItem('yinyang-account-sync-paused')==='true')return;
  // Save the acknowledged base even if a fresh local edit raced the write;
  // the next three-way merge then uploads that edit without losing remote state.
  if(!same(local,captureAccountValues(localStorage))){await writeSyncBase(localStorage,saved);return;}
  if(incoming){applyAccountValues(localStorage,desired);setRefresh(true);window.dispatchEvent(new Event('yinyang-data-changed'));}
  await writeSyncBase(localStorage,saved);failures=0;retryAt=0;setStatus(incoming?'Account data updated on this browser. Refresh to show it in any open tools.':'✓ This browser matches the account');await report(saved,'synced');
 });}catch(cause){const error=cause as Error&{status?:number};if(error.status===401||error.status===403){disabled=true;setStatus('');setConflicts([]);}else if(error.status===409){lastPoll=0;setStatus('Another device saved changes. Retrying safely…');}else{await report(lastState,'pending');failures++;retryAt=Date.now()+Math.min(60000,3000*2**Math.min(failures,4));setStatus(error.name==='SecurityError'?'Sync paused because browser storage is unavailable. Allow site storage, then retry.':error.status===422?error.message:'Sync paused. Your browser data is saved locally. '+error.message);}}
 finally{busy=false;}}
 void tick();const timer=window.setInterval(()=>void tick(),3000);const focus=()=>{lastPoll=0;retryAt=0;disabled=false;void tick();};window.addEventListener('focus',focus);window.addEventListener('yinyang-sync-permission-changed',focus);window.addEventListener('yinyang-data-changed',focus);document.addEventListener('visibilitychange',focus);
 return()=>{stopped=true;window.clearInterval(timer);window.removeEventListener('focus',focus);window.removeEventListener('yinyang-sync-permission-changed',focus);window.removeEventListener('yinyang-data-changed',focus);document.removeEventListener('visibilitychange',focus);};
 },[pathname]);
 if(!status)return null;
 return <aside className="account-sync-status" aria-label="Account automatic sync"><p role="status">{status}</p>{conflicts.length>0&&<p>Conflicting data: {conflicts.map(key=>key.replace(/^target-lab-/, '').replaceAll('-',' ')).join(', ')}. <a href="/account-sync">Review account copies</a></p>}{status.startsWith("Automatic sync is paused")&&<button onClick={()=>{localStorage.removeItem("yinyang-account-sync-paused");window.location.reload();}}>Resume account sync</button>}{refresh&&<button onClick={()=>window.location.reload()}>Refresh saved data</button>}<a href="/account-sync">Sync settings &amp; devices</a></aside>;
}
