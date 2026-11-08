"use client";
import {navigateFresh} from "@/lib/browser-navigation";
import {useEffect,useState} from 'react';
export default function ListeningAccountSignIn(){
 const [admin,setAdmin]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('');
 useEffect(()=>{if(new URLSearchParams(window.location.search).get('approved')==='1')return;let live=true;void fetch('/api/admin-session',{cache:'no-store'}).then(async r=>{if(r.ok&&live)setAdmin(((await r.json()) as {admin?:boolean}).admin===true);}).catch(()=>{});return()=>{live=false;};},[]);
 async function enter(){setBusy(true);setError('');try{const r=await fetch('/api/owner-research/yinyangeq',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'listen-here'})}),d=await r.json() as {error?:string;redirect?:string};if(!r.ok)throw Error(d.error||'Could not prepare listening-account sign-in.');navigateFresh(d.redirect==="/account-sync?setup=1"?d.redirect:"/profile-access?approved=1");}catch(e){setError((e as Error).message);setBusy(false);}}
 return admin?<section className="profile-review"><h2>Switch from admin to your listening account</h2><p>Use YinYangEQ as a normal participant, with your own results and device Sync. An already approved listening device returns to your account. Other browsers review a private sign-in first. Switching ends admin access on this browser.</p><button type="button" disabled={busy} onClick={()=>void enter()}>{busy?'Preparing sign-in…':'Use my listening account'}</button>{error&&<p role="alert">{error}</p>}</section>:null;
}
