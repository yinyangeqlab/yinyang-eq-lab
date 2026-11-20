'use client';
import {useEffect,useState} from 'react';
export default function CompanionLink(){
  const [link,setLink]=useState({challenge:'',issued:0}),[status,report]=useState(''),[busy,setBusy]=useState(false);
  useEffect(()=>{const p=new URLSearchParams(location.hash.slice(1));
    if(!p.has('key'))return;
    history.replaceState(null,'',location.pathname);
    queueMicrotask(()=>setLink({challenge:p.get('key')||'',issued:Number(p.get('at'))}));},[]);
  async function submit(action:string){
    setBusy(true);
    try {
      const res=await fetch('/api/companion/grants',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...link,action})});
      const body=await res.json() as {error?:string};if(!res.ok)throw Error(body.error||'Approval failed.');
      report(action==='approve'?'Approved. Return to the companion and refresh Sync.':'Companions linked through this browser have been disconnected.');
      setLink({challenge:'',issued:0});
    }catch(e){report(e instanceof Error?e.message:'Could not reach Sync.');}finally{setBusy(false);}
  }
  return <main style={{maxWidth:560,margin:'3rem auto',padding:'1rem'}}><h1>Companion sync</h1>
    {/^[a-f0-9]{64}$/.test(link.challenge) && <><p>Compare this number with the one on your phone. Approve only a request you started.</p>
    <h2>{link.challenge.slice(0,8).toUpperCase()}</h2><p>Allow this companion to read your synced EQs, headphone measurements and channel matches for 30 days. You can disconnect it here.</p>
    <button disabled={busy} onClick={()=>submit('approve')}>Approve library access</button></>}
    <p role="status">{status}</p><button disabled={busy} onClick={()=>submit('disconnect')}>Disconnect companions linked by this browser</button>
    <p><a href="/account-sync">Account sync settings</a></p></main>;
}
