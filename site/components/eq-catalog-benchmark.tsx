"use client";

import {useDeferredValue, useEffect, useId, useMemo, useRef, useState} from "react";
import {FIT_BANDS, fitterNames, type FitBands, type FitterMethod} from "@/lib/fitter-settings";

type Case = {
  id: string;
  name: string;
  type: "ie" | "oe";
  source: string;
  rig: string | null;
  target: string;
  assignment: string;
  state: "pending" | "partial" | "complete" | "failed";
};
type Index = {count:number; tested:number; entries:Case[]};
type Score = {method:FitterMethod; bands:FitBands; shapeRms:number; displayedRms:number; peakBoost:number; fallbackReason?:string};
type Scores = {fits:Score[]; failures:{method:FitterMethod; bands:FitBands}[]};
type Request<T> = {status:"loading" | "error"} | {status:"ready"; data:T};
const base = "/eq-fitting/catalog-v1";
const sectionId = "benchmark-by-headphone";
const pageSize = 12;

function searchText(value:string) {
  return value.normalize("NFKD").replace(/\p{M}/gu,"").replace(/[^\p{L}\p{N}]+/gu," ").toLowerCase().trim();
}

export default function EqCatalogBenchmark() {
  const details = useRef<HTMLDetailsElement>(null);
  const searchId = useId();
  const [open,setOpen] = useState(false);
  const [index,setIndex] = useState<Request<Index>>({status:"loading"});
  const [query,setQuery] = useState("");
  const [type,setType] = useState<"all" | Case["type"]>("all");
  const [shown,setShown] = useState(pageSize);
  const [active,setActive] = useState<Case>();
  const deferred = useDeferredValue(searchText(query));
  const [scores,setScores] = useState<Request<Scores>>({status:"loading"});
  const [bands,setBands] = useState<FitBands>(20);
  const [version,setVersion] = useState(0);

  useEffect(()=>{
    function openLinkedSearch() {
      if (window.location.hash === "#"+sectionId && details.current) {
        details.current.open = true;
      }
    }
    openLinkedSearch();
    window.addEventListener("hashchange",openLinkedSearch);
    return ()=>window.removeEventListener("hashchange",openLinkedSearch);
  },[]);

  useEffect(()=>{
    if (!open) return;
    const request = new AbortController();
    fetch(base+"/index.json",{signal:request.signal})
      .then(r=>{if(!r.ok) throw Error(); return r.json() as Promise<Index>;})
      .then(data=>{if(!request.signal.aborted) setIndex({status:"ready",data});})
      .catch(()=>{if(!request.signal.aborted) setIndex({status:"error"});});
    return ()=>request.abort();
  },[open,version]);

  const matches = useMemo(()=>{
    if (index.status!=="ready") return [];
    const words = deferred.split(/\s+/).filter(Boolean);
    return index.data.entries.filter(entry=>{
      if (type!=="all" && entry.type!==type) return false;
      const text = searchText(entry.name+" "+entry.source+" "+(entry.rig??""));
      return words.every(word=>text.includes(word));
    });
  },[index,deferred,type]);

  useEffect(()=>{
    if (!active || active.state==="pending" || active.state==="failed") return;
    const request=new AbortController();
    fetch(base+"/cases/"+active.id.slice(0,2)+".json",{signal:request.signal})
      .then(r=>{if(!r.ok) throw Error(); return r.json() as Promise<Record<string,Scores>>;})
      .then(shard=>{
        const data=shard[active.id];
        if (!data) throw Error();
        if (!request.signal.aborted) setScores({status:"ready",data});
      })
      .catch(()=>{if(!request.signal.aborted) setScores({status:"error"});});
    return ()=>request.abort();
  },[active]);

  function choose(entry:Case) {
    if (active?.id===entry.id) return;
    setScores({status:"loading"});
    setActive(entry);
  }
  const results = scores.status==="ready" ? scores.data.fits.filter(f=>f.bands===bands)
    .sort((a,b)=>Number(!!a.fallbackReason)-Number(!!b.fallbackReason) || a.shapeRms-b.shapeRms) : [];
  const failures = scores.status==="ready" ? scores.data.failures.filter(f=>f.bands===bands) : [];

  return (
    <details className="fitter-coverage catalog-benchmark" id={sectionId} ref={details} onToggle={event=>setOpen(event.currentTarget.open)}>
      <summary>Search benchmark by headphone or IEM</summary>
      {open && index.status==="loading" && <p role="status">Loading measurement index…</p>}
      {open && index.status==="error" && <p role="status">The measurement index could not load. <button type="button" onClick={()=>{setIndex({status:"loading"});setVersion(value=>value+1);}}>Retry</button></p>}
      {open && index.status==="ready" && <>
        <p>{index.data.tested.toLocaleString("en-US")} of {index.data.count.toLocaleString("en-US")} test cases checked.</p>
        <p>Each catalog measurement uses one reference target selected for the measurement source or rig when available, or for the headphone type. Select a case to compare the five Tuning fitters at each band limit.</p>
        <label className="catalog-search" htmlFor={searchId}>Headphone name, source or rig
          <input id={searchId} type="search" value={query} placeholder="Search headphones or IEMs" onChange={event=>{setQuery(event.currentTarget.value);setShown(pageSize);setActive(undefined);}} />
        </label>
        <div className="fitter-ranking-options" role="group" aria-label="Headphone type">
          {(["all","ie","oe"] as const).map(value=><button key={value} type="button" aria-pressed={type===value} onClick={()=>{setType(value);setShown(pageSize);setActive(undefined);}}>
            {value==="all"?"All":value==="ie"?"In-ear":"Over-ear"}
          </button>)}
        </div>
        <p role="status">{matches.length.toLocaleString("en-US")} matching {matches.length===1?"case":"cases"}.</p>
        <div className="catalog-result-list">
          {matches.slice(0,shown).map(entry=><button key={entry.id} type="button" aria-pressed={active?.id===entry.id} onClick={()=>choose(entry)}>
            <strong>{entry.name}</strong>
            <small>{entry.source} · {entry.rig??"Rig unlisted"}</small>
            <small>{entry.target}</small>
          </button>)}
        </div>
        {matches.length>shown && <button className="catalog-more" type="button" onClick={()=>setShown(count=>count+pageSize)}>Show more cases</button>}
        {active && <section className="catalog-case" aria-label={active.name+" benchmark results"}>
          <h3>{active.name}</h3>
          <p>{active.source} · {active.rig??"Rig unlisted"}</p>
          <p>Target · {active.target}</p>
          {active.assignment==="AKG K52 tuning regression" && <p>Replay with a +0.3 dB mids adjustment.</p>}
          {active.state==="pending" && <p role="status">This case is still waiting to be tested.</p>}
          {active.state==="failed" && <p role="status">This case produced no valid fits.</p>}
          {active.state!=="pending" && active.state!=="failed" && scores.status==="loading" && <p role="status">Loading scores…</p>}
          {scores.status==="error" && <p role="status">The scores for this case could not load. <button type="button" onClick={()=>{setScores({status:"loading"});setActive({...active});}}>Retry</button></p>}
          {scores.status==="ready" && <>
            {active.state==="partial" && <p>Some fits were unavailable or used a fallback.</p>}
            <div className="fitter-ranking-options" role="group" aria-label="Band limit">
              {FIT_BANDS.map(value=><button key={value} type="button" aria-pressed={value===bands} onClick={()=>setBands(value)}>{value} bands</button>)}
            </div>
            <table className="fitter-score-table">
              <caption>Level-matched RMS compares curve shape from 20 Hz to 20 kHz, with less weight below 40 Hz and above 10 kHz. The 1 kHz score uses the fixed reference in update233.</caption>
              <thead><tr><th scope="col">Fitter</th><th scope="col">Level-matched RMS</th><th scope="col">1 kHz RMS</th><th scope="col">Peak boost</th></tr></thead>
              <tbody>{results.map(row=><tr key={row.method}>
                <th scope="row">{fitterNames[row.method]}{row.fallbackReason && <span className="fitter-reference-note">Fallback</span>}</th>
                <td>{row.shapeRms.toFixed(3)} dB</td>
                <td>{row.displayedRms.toFixed(3)} dB</td>
                <td>{row.peakBoost.toFixed(1)} dB</td>
              </tr>)}</tbody>
            </table>
            {failures.map(row=><p key={row.method}>{fitterNames[row.method]} did not return a fit.</p>)}
          </>}
        </section>}
      </>}
    </details>
  );
}
