'use client';
import {useEffect,useRef,useState} from 'react';
import {bugReportUrl} from '@/lib/release-info';
import SyncRecoveryForm, { groupSyncValue, syncRecoveryRequest } from '@/components/sync-recovery-form';
import './link.css';

type Link = {challenge:string; issued:number; ranks?:boolean};
type Decision = 'approve' | 'cancel';
type Outcome = Decision | 'expired' | 'used';
const ttl=600000;
const titles:Record<Outcome,string>={
  approve:'Companion connected',cancel:'Request cancelled',expired:'This code expired',used:'This request has ended'
};
const descriptions:Record<Outcome,string>={
  approve:'Return to Sync on your phone to see your saved library.',
  cancel:'To try again, choose Get new code in the phone’s Sync tab, then Open in browser.',
  expired:'Open Sync on your phone and get a new code.',
  used:'Return to Sync on your phone to check its status or start a new request.'
};
function valid(value:Link | undefined):value is Link {
  return !!value && /^[a-f0-9]{64}$/.test(value.challenge) && Number.isSafeInteger(value.issued) && value.issued>0 && value.issued<=Date.now()+60000;
}
function remember(value:{link?:Link; outcome?:Outcome}){
  history.replaceState({...history.state,companionApproval:value},'',location.pathname);
}
export default function CompanionLink(){
  const [link,setLink]=useState<Link>(),[outcome,setOutcome]=useState<Outcome>(),[ready,setReady]=useState(false);
  const [busy,setBusy]=useState(false),[error,setError]=useState(''),[manage,setManage]=useState(false),[disconnected,setDisconnected]=useState(false);
  const [recovering,setRecovering]=useState(false),[recoveredId,setRecoveredId]=useState<string>();
  const [browserId,setBrowserId]=useState<string>();
  const inFlight=useRef(false);
  useEffect(()=>{
    function restore(){
      const params=new URLSearchParams(location.hash.slice(1));
      const saved=history.state?.companionApproval;
      const request=params.has('key') ? {challenge:params.get('key')!,issued:Number(params.get('at')),ranks:params.get('ranks')==='1'} : saved?.link;
      const previous=!location.hash && (saved?.outcome==='wrong-code' ? 'cancel' : saved?.outcome);
      const terminal:Outcome|undefined=valid(request) && Date.now()>=request.issued+ttl ? 'expired'
        : previous && Object.hasOwn(titles,previous) ? previous : undefined;
      const active=valid(request) && !terminal ? request : undefined;
      remember({link:active,outcome:terminal});setLink(active);setOutcome(terminal);setError('');setReady(true);
      setRecovering(false);setRecoveredId(undefined);setBrowserId(undefined);
    }
    restore();window.addEventListener('hashchange',restore);return ()=>window.removeEventListener('hashchange',restore);
  },[]);
  useEffect(()=>{
    if(!link || recovering)return;
    const timer=setTimeout(()=>{if(!inFlight.current){remember({outcome:'expired'});setLink(undefined);setOutcome('expired');}},Math.max(0,link.issued+ttl-Date.now()));
    return ()=>clearTimeout(timer);
  },[link,busy,recovering]);
  useEffect(()=>{
    if(!link || recovering || recoveredId)return;
    let active=true;
    void syncRecoveryRequest<{syncId:string|null}>('/api/my-profile/sync-recovery').then(settings=>{
      if(active && settings.syncId)setBrowserId(settings.syncId);
    }).catch(()=>{ /* The existing browser approval still works without a Sync ID. */ });
    return ()=>{active=false;};
  },[link,recovering,recoveredId]);
  async function submit(action:Decision|'disconnect'){
    if(inFlight.current || (!link && action!=='disconnect'))return;
    inFlight.current=true;setBusy(true);setError('');
    try {
      const res=await fetch('/api/companion/grants',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...link,action,syncId:recoveredId ?? browserId,access:link?.ranks?'edit-library-ranks-v2':'edit-library-v1'})});
      if(res.status===409 && action!=='disconnect'){remember({outcome:'used'});setOutcome('used');setLink(undefined);return;}
      if(!res.ok){const body=await res.json().catch(()=>({}));throw Error(body && typeof body==='object' && 'error' in body && typeof body.error==='string' ? body.error : 'Could not save your choice. Try again.');}
      if(action==='disconnect'){setManage(false);setDisconnected(true);}
      else{remember({outcome:action});setOutcome(action);setLink(undefined);}
    }catch(e){setError(e instanceof Error?e.message:'Connection failed. Try again.');}
    finally{inFlight.current=false;setBusy(false);}
  }
  const code=link?.challenge.slice(0,8).toUpperCase();
  return <main className="companion-approval">
    <a href="/account-sync">Sync &amp; Devices</a>
    <h1>{!ready?'Companion Sync':link?'Connect your companion?':outcome?titles[outcome]:'Companion access'}</h1>
    {link && code && <>
      <p>Compare this code with the one in the app’s Sync tab. If the codes differ, cancel this request.</p>
      <div className="approval-code">{code.slice(0,4)} {code.slice(4)}</div>
      <p className="approval-expiry">Expires at {new Date(link.issued+ttl).toLocaleTimeString([],{hour:'numeric',minute:'2-digit'})}</p>
      <p>This companion can read your library and save the EQs, measurements and channel matches you choose. Your live filter edits stay on the phone. Manage saved items and backup history in My Collection. The link lasts until you disconnect or revoke access.</p>
      {link.ranks && <p>The companion can also read the target ranks from your synced Personal Tournaments. Your individual choices stay in Sync.</p>}
      {recovering ? <SyncRecoveryForm
        onCancel={()=>setRecovering(false)}
        onRecovered={syncId=>{setRecoveredId(syncId.trim().replace(/[ -]/g,''));setRecovering(false);setError('');}}
      /> : <>
        {(recoveredId ?? browserId) && <p>Sync ID <strong>{groupSyncValue((recoveredId ?? browserId)!)}</strong></p>}
        <div className="approval-actions">
          <button className="approval-primary" disabled={busy} onClick={()=>submit('approve')}>Approve companion</button>
          <button disabled={busy} onClick={()=>setRecovering(true)}>Use Sync ID</button>
          <button disabled={busy} onClick={()=>submit('cancel')}>Cancel request</button>
        </div>
        {!recoveredId && <p>Approve in a browser with your existing Sync account, or use your Sync ID with a passkey or recovery code.</p>}
      </>}
    </>}
    {outcome && <p role="status">{descriptions[outcome]}</p>}
    {ready && !link && !outcome && <p>To connect a phone, open <strong>Sync</strong> in the companion app and start connecting an account. Open the approval link from the app to see its code.</p>}
    {error && <p role="alert">{error}</p>}
    {ready && !link && !outcome && <details><summary>Manage linked companions</summary>
      <p>Disconnect every companion approved through this browser. Your saved library stays in your account.</p>
      {disconnected ? <p role="status">Companions disconnected.</p> : manage ? <div className="approval-actions">
        <button disabled={busy} onClick={()=>submit('disconnect')}>Confirm disconnect</button><button disabled={busy} onClick={()=>setManage(false)}>Cancel</button>
      </div> : <button onClick={()=>setManage(true)}>Disconnect companions</button>}
    </details>}
    {ready && <footer><a href={bugReportUrl} target="_blank" rel="noopener noreferrer">Report issue</a><small>Leave comparison codes and approval links out of your report.</small></footer>}
  </main>;
}
