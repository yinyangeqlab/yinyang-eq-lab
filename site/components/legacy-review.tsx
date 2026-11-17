"use client";
import "./legacy-review.css";
import { AdminTable, adminDate } from "@/components/admin-table";
import {useCallback,useEffect,useState} from 'react';
import {ARCHIVE_TARGETS} from '@/lib/archive-targets';
const names=new Map<string,string>(ARCHIVE_TARGETS.map(t=>[t.id,t.name]));
type Review={id:string;record_kind:string;record_id:string;message:string;status:string;admin_reason?:string;subject_id?:string;requester_label?:string;preview?:{createdAt:number;mode:string;targetA:string;targetB:string;linkedRecords:{kind:string;id:string}[]}|null};
type Study={id:string;target_a:string;target_b:string;mode:string;headphone_type:string;seal_after:number;opted_in:number;sealed:number};
async function send(url:string,method:string,body:unknown){const r=await fetch(url,{method,headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});const j=await r.json() as {error?:string};if(!r.ok)throw Error(j.error||'Could not save.');return j;}
export function LegacyReviewPanel(){
 const [requests,setRequests]=useState<Review[]>([]),[studies,setStudies]=useState<Study[]>([]),[kind,setKind]=useState('vote'),[id,setId]=useState(''),[message,setMessage]=useState(''),[error,setError]=useState(''),[status,setStatus]=useState(''),[busy,setBusy]=useState(false);
 const load=useCallback(async()=>{try{const responses=await Promise.all(['/api/my-data/legacy','/api/my-data/retrospective'].map(url=>fetch(url,{cache:'no-store'})));const [a,b]=await Promise.all(responses.map(async r=>await r.json() as {error?:string;requests:Review[];studies:Study[];noticeVersion:string;sharedAdmin:boolean;participationActive:boolean}));if(!responses.every(r=>r.ok))throw Error(a.error||b.error||'Sign in to manage legacy records.');setRequests(a.requests);setStudies(b.studies);}catch(e){setError(e instanceof Error?e.message:'Could not load legacy settings.');}},[]);
 // eslint-disable-next-line react-hooks/set-state-in-effect -- Bootstrap external browser/server state and expose loading or reset feedback before asynchronous completion.
 useEffect(()=>{const q=new URLSearchParams(window.location.search);setId(q.get('trial')||'');const kind=q.get('kind');if(kind&&['vote','open','run'].includes(kind))setKind(kind);void load();const refresh=()=>void load();window.addEventListener('yinyang-data-changed',refresh);return()=>window.removeEventListener('yinyang-data-changed',refresh);},[load]);
 async function act(url:string,method:string,body:unknown){setBusy(true);setError('');setStatus('');try{await send(url,method,body);setStatus('Saved. Review does not grant archive permission automatically.');await load();}catch(e){setError(e instanceof Error?e.message:'Could not save.');}finally{setBusy(false);}}
 return <section className="legacy-review" aria-label="Legacy submissions and retrospective permission"><h2>Older submissions: admin-assisted review</h2><p>A browser ID or knowledge of a record ID does not prove ownership. Request review of a specific comparison. The admin must verify ownership independently before linking its explicit comparison records to your sign-in. No other participant’s data is disclosed through this form. You may request ownership for deletion without agreeing to research participation.</p><p>Find the comparison ID in My results or ask the admin for help. Describe context the admin can verify independently; do not send passwords, access credentials, government ID or sensitive documents.</p><label>Record type<select value={kind} onChange={e=>setKind(e.target.value)}><option value="vote">Ranked vote / trial ID</option><option value="run">Listening run / browser result ID</option><option value="open">Open choice ID</option></select></label><label>Comparison ID<input value={id} onChange={e=>setId(e.target.value)} /></label><label>Details that help identify your result<textarea maxLength={500} value={message} onChange={e=>setMessage(e.target.value)} /></label><button type="button" disabled={busy||message.trim().length<10||!id} onClick={()=>void act('/api/my-data/legacy','POST',{kind,id,message})}>Ask the owner to check this older result</button>
 {requests.map(r=><article key={r.id}><p>{r.record_kind} · <code>{r.record_id}</code> · <strong>{r.status}</strong></p><p>{r.message}</p>{r.admin_reason&&<p>Admin response: {r.admin_reason}</p>}{r.status==='approved'?<a href={`/my-data?trial=${encodeURIComponent(r.record_id)}`}>Find recovered submission for server deletion</a>:<button type="button" disabled={busy} onClick={()=>void act('/api/my-data/legacy','DELETE',{id:r.id})}>Withdraw / delete this request</button>}</article>)}
 <h2>Historical-study permissions</h2><p>Review, grant or withdraw these permissions in the shared data choices form. Ownership recovery never grants research permission. Sealed group results remain after withdrawal; original records remain deletable.</p><a href="/participation?review=1&return_to=/my-data">Review all data choices and historical studies →</a>{studies.map(s=><article key={s.id}><h3>{names.get(s.target_a)||s.target_a} / {names.get(s.target_b)||s.target_b}</h3><p>{s.opted_in?'Permission saved':'Not opted in'} · {s.sealed?'Result already sealed':'Not sealed'}</p></article>)}{!studies.length&&<p>No historical study is currently available.</p>}{error&&<p role="alert">{error}</p>}{status&&<p role="status">{status}</p>}</section>;
}
export function AdminLegacyReview() {
  const [rows, setRows] = useState<(Review & { created_at: number })[]>([]);
  const [pending, setPending] = useState<number | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [verified, setVerified] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/owner-research/legacy", { cache: "no-store" });
      const result = await response.json() as { error?: string; requests: (Review & { created_at: number })[]; pending: number };
      if (!response.ok) throw Error(result.error);
      setRows(result.requests);
      setPending(result.pending);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Queue unavailable.");
    } finally { setLoading(false); }
  }, []);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- Bootstrap the queue count for the collapsed summary.
  useEffect(() => { void load(); }, [load]);

  const active = rows.find(row => row.id === selected);
  function openReview(id: string | null) {
    setSelected(id);
    setReason("");
    setVerified(false);
  }
  async function review(action: "approve" | "reject") {
    if (!active || busy) return;
    setBusy(true);
    setError("");
    try {
      await send("/api/owner-research/legacy", "POST", {
        requestId: active.id, action, reason, independentlyVerified: verified, confirmation: "VERIFY SPECIFIC LEGACY OWNERSHIP",
      });
      openReview(null);
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Review failed.");
    } finally { setBusy(false); }
  }
  return <details className="admin-tool-group" id="legacy-review">
    <summary>Older submission claims <small>{pending === null ? loading ? "Checking queue…" : "Queue unavailable" : `${pending} pending`}</small></summary>
    <section className="legacy-review" aria-label="Older submission claims">
      <p>Participants can ask to recover older comparisons so they can manage or delete them from My data.</p>
      <details>
        <summary>Verification rules</summary>
        <p>Verify ownership of the exact comparison independently. A browser ID or a known record ID alone is insufficient. Approval links only the listed records and does not grant research or archive permission. Keep sensitive evidence out of review notes.</p>
      </details>
      <button type="button" disabled={busy || loading} onClick={() => void load()}>{loading ? "Loading…" : "Refresh claims"}</button>
      {pending !== null && pending > rows.filter(row => row.status === "pending").length && <p>The queue shows up to 20 requests. Review these claims to reveal the next ones.</p>}
      {error && <p role="alert">{error}</p>}
      {!loading && <AdminTable label="Older submission claims" rows={rows} rowKey={row => row.id} empty="No claims to review." columns={[
        adminDate("Requested", (row: { created_at: number }) => row.created_at),
        { key: "requester", label: "Requester", value: row => row.requester_label || row.subject_id },
        { key: "kind", label: "Record type", value: row => row.record_kind },
        { key: "record", label: "Record ID", value: row => row.record_id, render: row => <code className="admin-id">{row.record_id}</code> },
        { key: "status", label: "Status", value: row => row.status },
        { key: "evidence", label: "Matching records", value: row => row.preview?.linkedRecords.length, search: row => !row.preview && row.status === "pending" ? "No source found" : null,
          render: row => row.preview?.linkedRecords.length ?? (row.status === "pending" ? "No source found" : "—") },
        { key: "review", label: "Review", render: row => <button type="button" disabled={busy} onClick={() => openReview(row.id)}>{row.status === "pending" ? "Review…" : "View"}</button> },
      ]} />}
      {active && <article key={active.id} className="admin-review-form">
        <h3>{active.requester_label || active.subject_id} · {active.status}</h3>
        <p>{active.record_kind} · <code>{active.record_id}</code></p>
        <p>Requester message: {active.message}</p>
        {active.preview && <>
          <p>{new Date(active.preview.createdAt).toLocaleString()} · {active.preview.mode} · {names.get(active.preview.targetA) || active.preview.targetA} / {names.get(active.preview.targetB) || active.preview.targetB}</p>
          <details><summary>Linked records ({active.preview.linkedRecords.length})</summary>
            {active.preview.linkedRecords.map(row => <p key={`${row.kind}:${row.id}`}>{row.kind} · <code>{row.id}</code></p>)}
          </details>
        </>}
        {active.status === "pending" ? <>
          {!active.preview && <p>No matching historical source remains. Approval is unavailable.</p>}
          <label>Verification or rejection reason<textarea autoFocus maxLength={500} disabled={busy} value={reason} onChange={event => setReason(event.target.value)} /></label>
          <label><input type="checkbox" disabled={busy || !active.preview} checked={verified} onChange={event => setVerified(event.target.checked)} /> I independently verified ownership of these specific records.</label>
          <button type="button" disabled={busy || !active.preview || !verified || reason.trim().length < 10} onClick={() => void review("approve")}>Approve verified ownership</button>
          <button type="button" disabled={busy || reason.trim().length < 10} onClick={() => void review("reject")}>Reject claim</button>
        </> : <p>{active.admin_reason}</p>}
        <button type="button" disabled={busy} onClick={() => openReview(null)}>Close</button>
      </article>}
    </section>
  </details>;
}
