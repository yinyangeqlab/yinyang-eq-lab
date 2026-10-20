"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type EventRow = { id:string; subject_id:string; session_id:string; event_type:string; route:string; shootout_tab:string|null; test_mode:string|null; test_active:number; created_at:number; listener_label:string };
type Cursor = { beforeAt:number; beforeId:string } | null;
type Payload = { events:EventRow[]; hasMore:boolean; next:Cursor; retentionDays:number; activeWindowSeconds:number; error?:string };
const eventNames:Record<string,string> = { page_view:"Page visit", heartbeat:"Active page heartbeat", shootout_tab:"Tournament tab", test_started:"Test started", test_ended:"Test ended" };

export default function ActivityMonitoringPanel() {
  const [events,setEvents] = useState<EventRow[]>([]);
  const cursorRef = useRef<Cursor>(null);
  const [hasMore,setHasMore] = useState(false);
  const [windowSeconds,setWindowSeconds] = useState(90);
  const [error,setError] = useState("");
  const [loading,setLoading] = useState(false);
  const load = useCallback(async (older = false) => {
    setLoading(true); setError("");
    try {
      const pageCursor = cursorRef.current;
      const query = older && pageCursor ? `?beforeAt=${pageCursor.beforeAt}&beforeId=${encodeURIComponent(pageCursor.beforeId)}` : "";
      const response = await fetch(`/api/owner-research/activity${query}`,{cache:"no-store"});
      const result = await response.json() as Payload;
      if (!response.ok) throw new Error(result.error || "Activity records could not be loaded.");
      setEvents(current => {
        if (!older && result.events.length === 0) return [];
        const merged = new Map<string,EventRow>();
        const retained = current.filter(row=>row.created_at>=Date.now()-result.retentionDays*86400000);
        for (const row of [...retained,...result.events]) merged.set(row.id,row);
        return [...merged.values()].sort((a,b)=>b.created_at-a.created_at || b.id.localeCompare(a.id));
      });
      cursorRef.current=result.next; setHasMore(result.hasMore); setWindowSeconds(result.activeWindowSeconds);
    } catch(cause) { setError(cause instanceof Error ? cause.message : "Activity records could not be loaded."); }
    finally { setLoading(false); }
  },[]);
  useEffect(()=>{void load();const timer=window.setInterval(()=>void load(),30_000);return()=>window.clearInterval(timer);},[load]);
  const latestBySession = useMemo(()=>{
    const latest = new Map<string,EventRow>();
    for(const row of events) if(!latest.has(JSON.stringify([row.subject_id,row.session_id]))) latest.set(JSON.stringify([row.subject_id,row.session_id]),row);
    return latest;
  },[events]);
  const liveCount = useMemo(()=>[...latestBySession.values()].filter(row=>row.test_active===1 && Date.now()-row.created_at<=windowSeconds*1000).length,[latestBySession,windowSeconds]);
  return <section id="activity-monitoring" aria-label="Opted-in activity monitoring">
    <h2>Opted-in test activity</h2>
    <p>{liveCount} session{liveCount===1?"":"s"} currently reporting an active Tournament test. “Active” means the page sent a heartbeat in the last {windowSeconds} seconds; it does not prove someone is listening. Logged routes and Tournament tabs are visible below. Entries are kept for 30 days, then purged the next time the monitoring service runs; logs are deleted immediately when the user opts out.</p>
    <p>Only users who enabled identifiable activity monitoring are listed. Labels identify the browser or shared account, not a verified person. No IP address, device fingerprint, typed content, form values, audio or external browser history is collected by this feature.</p>
    {error&&<p role="alert">{error}</p>}
    <div className="owner-table-wrap"><table><thead><tr><th>Time</th><th>Tester</th><th>Status</th><th>Location</th><th>Event</th></tr></thead><tbody>
      {events.map(row=>{const latest=latestBySession.get(JSON.stringify([row.subject_id,row.session_id]))?.id===row.id;const live=latest&&row.test_active===1&&Date.now()-row.created_at<=windowSeconds*1000;return <tr key={row.id}><td>{new Date(row.created_at).toLocaleString()}</td><td>{row.listener_label}</td><td>{live?"Active in test":latest?"Last seen":"Event"}</td><td>{row.route}{row.route==="/shootout"&&row.shootout_tab?` · ${row.shootout_tab}`:""}{row.route==="/shootout"&&row.test_mode?` · ${row.test_mode}`:""}</td><td>{eventNames[row.event_type]||row.event_type}</td></tr>;})}
      {!events.length&&<tr><td colSpan={5}>No opted-in activity recorded yet.</td></tr>}
    </tbody></table></div>
    {hasMore&&<button type="button" disabled={loading} onClick={()=>void load(true)}>{loading?"Loading…":"Load older activity"}</button>}
  </section>;
}
