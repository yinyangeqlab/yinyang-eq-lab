"use client";
import { AdminTable } from "@/components/admin-table";
import ProtectedArchive from "@/components/protected-archive";
import { useCallback, useEffect, useState } from "react";
import { ARCHIVE_TARGETS } from "@/lib/archive-targets";
import type { StatisticsArchive } from "@/lib/statistics-archive";
import type { ResearchSummaryRow } from "@/lib/research-summary";
const names=new Map<string,string>(ARCHIVE_TARGETS.map(t=>[t.id,t.name]));
export default function StatisticsArchivePanel(){
  const [archives,setArchives]=useState<StatisticsArchive[]>([]),[rows,setRows]=useState<ResearchSummaryRow[]>([]),[error,setError]=useState(""),[busy,setBusy]=useState(false);
  const load=useCallback(async()=>{setBusy(true);setError("");try{
    const response=await fetch("/api/owner-research/archive",{cache:"no-store"});const data=await response.json() as {archives:StatisticsArchive[];planning:{rows:ResearchSummaryRow[]};error?:string};
    if(!response.ok)throw new Error(data.error||"Could not load research summaries.");setArchives(data.archives);setRows(data.planning.rows);
  }catch(cause){setError(cause instanceof Error?cause.message:"Could not load research summaries.");}finally{setBusy(false);}},[]);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- Bootstrap external browser/server state and expose loading or reset feedback before asynchronous completion.
  useEffect(()=>{void load();},[load]);
  function download(archive:StatisticsArchive){const url=URL.createObjectURL(new Blob([JSON.stringify(archive,null,2)],{type:"application/json"}));const link=document.createElement("a");link.href=url;link.download=`yinyang-legacy-statistics-${archive.year}.json`;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
  const percent=(n:number)=>`${(n*100).toFixed(1)}%`;
  return <><ProtectedArchive/><section aria-label="Research summaries and archive planning"><h2>Research summaries and archive planning</h2><p>All valid comparisons, including repeat answers, stay in the private research dataset unless erased. A new year does not reset the study or delete data. These live summaries use decisive eligible blind votes and separate UTC years, music modes and headphone categories. Open choices, ties and checks remain in the research dataset but are not counted in this table.</p><p><strong>Private analysis, not an anonymous archive.</strong> Exact small-group results can reveal preferences. This table is recomputed from retained records and changes after deletion or moderation; no permanent copy is saved here. Refresh after other admin actions.</p><p>Every repeat contributes to the raw preference. The equal-group preference first averages each group’s answers, then weights groups equally. Groups are authenticated accounts where ownership exists, otherwise legacy browser IDs; a shared admin account is one group. These are not verified counts of people, and this summary does not replace the live participant-balanced exploratory rankings.</p><button type="button" disabled={busy} onClick={()=>void load()}>{busy?"Loading…":"Refresh private summaries"}</button>{error&&<p role="alert">{error}</p>}
    <AdminTable label="Research summaries and archive planning" rows={rows}
      rowKey={row => JSON.stringify([row.year, row.mode, row.headphoneType, row.targetA, row.targetB])}
      empty={busy ? "Loading…" : "No qualifying decisive comparisons in the retained dataset."} columns={[
        { key: "year", label: "UTC year", value: row => row.year },
        { key: "mode", label: "Mode", value: row => row.mode },
        { key: "type", label: "Headphone type", value: row => row.headphoneType },
        { key: "a", label: "Target A", value: row => row.nameA },
        { key: "b", label: "Target B", value: row => row.nameB },
        { key: "total", label: "Comparisons", value: row => row.comparisons },
        { key: "aWins", label: "A wins", value: row => row.aWins },
        { key: "bWins", label: "B wins", value: row => row.bWins },
        { key: "repeat", label: "Repeat comparisons", value: row => row.repeatComparisons },
        { key: "groups", label: "Participant groups", value: row => row.groups },
        { key: "accounts", label: "Authenticated accounts", value: row => row.verifiedAccountGroups },
        { key: "browsers", label: "Legacy browsers", value: row => row.legacyBrowserGroups },
        { key: "admin", label: "Shared admin", value: row => row.sharedAdminGroups },
        { key: "raw", label: "Raw A preference", value: row => row.rawAShare, render: row => percent(row.rawAShare), search: row => percent(row.rawAShare) },
        { key: "equal", label: "Equal-group A preference", value: row => row.equalGroupAShare, render: row => percent(row.equalGroupAShare), search: row => percent(row.equalGroupAShare) },
      ]} />
    <h3>Private research and saved results</h3><p>Use the protected archive above for preplanned studies. These exact private summaries remain live and subject to deletion. They are not a protected release and should not be shared as an anonymous dataset. Earlier v1 saved releases remain available separately; its annual generator is still retired.</p>
    {archives.map(archive => <div key={archive.year}>
      <h3>{archive.year} · legacy saved estimates</h3>
      <p>Produced with the retired sampled mechanism.</p>
      <button type="button" onClick={() => download(archive)}>Download existing {archive.year} archive</button>
      <AdminTable label={`${archive.year} archive estimates`} rows={archive.pairs} rowKey={row => JSON.stringify([row.targetA,row.targetB])} columns={[
        { key: "a", label: "Target A", value: row => names.get(row.targetA) || row.targetA },
        { key: "b", label: "Target B", value: row => names.get(row.targetB) || row.targetB },
        { key: "aw", label: "Estimated A wins", value: row => row.estimatedAWins },
        { key: "bw", label: "Estimated B wins", value: row => row.estimatedBWins },
      ]} />
    </div>)}

  </section></>;
}
