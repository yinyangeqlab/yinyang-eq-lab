"use client";
import {useCallback,useEffect,useState} from "react";
import {downloadLocalFile} from "@/lib/channel-match-export";
type Backup={id:string; model:string;name:string;kind:string;main:string;match:string;mainName:string;matchName:string;savedAt:number;versionRank:number};
export default function CompanionPresetHistory({part}:{part:"main"|"match"|"history"}){
  const [open,setOpen]=useState(false),[rows,setRows]=useState<Backup[]>([]),[next,setNext]=useState<number|null>(null);
  const [pending,setPending]=useState(false),[message,setMessage]=useState(""),[confirm,setConfirm]=useState("");
  const load=useCallback(async (offset=0)=>{
    setPending(true);setMessage("");
    try{
      const res=await fetch('/api/companion/backups?part='+part+'&offset='+offset,{cache:'no-store'});
      if(!res.ok)throw Error('Sign in on an approved browser to view companion backups.');
      const page=await res.json() as {rows:Backup[];next:number|null};setRows(old=>offset?[...old,...page.rows]:page.rows);setNext(page.next);
      if(!page.rows.length && !offset)setMessage('No companion presets saved here yet.');
    }catch(e){setMessage((e as Error).message);}finally{setPending(false);}
  },[part]);
  useEffect(()=>{if(!open)return;const refresh=()=>void load();window.addEventListener('companion-presets-changed',refresh);return()=>window.removeEventListener('companion-presets-changed',refresh);},[open,load]);
  async function remove(id:string){
    setPending(true);
    try{const res=await fetch('/api/companion/backups',{method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({id})});
      if(!res.ok)throw Error('Could not delete this version.');setConfirm('');window.dispatchEvent(new Event('companion-presets-changed'));
    }catch(e){setMessage((e as Error).message);setPending(false);}
  }
  return <details onToggle={e=>{const visible=e.currentTarget.open;setOpen(visible);if(visible)void load();}}><summary>{part==='main'?'Companion Main EQ presets (USR)':part==='match'?'Companion Channel Match presets (SPK)':'Companion backup history'}</summary>
    <p role="status">{pending?'Loading…':message}</p>
    {rows.map(row=><article key={row.id}><strong>{row.name}</strong><p>{row.model} · {row.versionRank===1?'Current':'Previous'} · {new Date(row.savedAt).toLocaleString()}{row.kind==='pair'?` · Paired: ${row.mainName} / ${row.matchName}`:''}</p>
      {row.main && part!=='match' && <button onClick={()=>downloadLocalFile(row.mainName+'.txt',row.main,'text/plain')}>Download Main EQ</button>}
      {row.match && part!=='main' && <button onClick={()=>downloadLocalFile(row.matchName+'.txt',row.match,'text/plain')}>Download Channel Match</button>}
      {part==='history' && (confirm===row.id?<><button disabled={pending} onClick={()=>void remove(row.id)}>Confirm delete version</button><button onClick={()=>setConfirm('')}>Cancel</button></>:<button onClick={()=>setConfirm(row.id)}>Delete version</button>)}
    </article>)}
    {next!==null && <button disabled={pending} onClick={()=>void load(next)}>Load more</button>}
  </details>;
}
