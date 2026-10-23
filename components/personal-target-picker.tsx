"use client";

import { useId, useMemo, useState } from "react";
import { MAX_SHARED_POOL, MIN_CUSTOM_POOL, personalPool, type LocalPoolTarget, type PoolChoice, type PoolTarget } from "@/lib/personal-target-pool";
import type { HeadphoneType } from "@/lib/target-type";
import "./personal-target-picker.css";

type Props = {
  publicTargets: PoolTarget[];
  localTargets: LocalPoolTarget[];
  choice: PoolChoice;
  type: HeadphoneType | undefined;
  onChange: (choice: PoolChoice) => void;
  /** Names of public targets stay out of "all" mode; they are listed only when the person builds their own pool. */
  disabled?: boolean;
};

export default function PersonalTargetPicker({ publicTargets, localTargets, choice, type, onChange, disabled = false }: Props) {
  const id = useId();
  const [query, setQuery] = useState("");
  const custom = choice.mode === "custom";
  const eligiblePublic = useMemo(() => personalPool(publicTargets, [], { mode: "all" }, type), [publicTargets, type]);
  const eligibleLocal = useMemo(() => personalPool([], localTargets, { mode: "custom", ids: localTargets.map(row => row.id) }, type) as LocalPoolTarget[], [localTargets, type]);
  const chosen = useMemo(() => new Set(choice.mode === "custom" ? choice.ids : []), [choice]);
  const pool = personalPool(publicTargets, localTargets, choice, type);
  const privateInPool = pool.filter(row => "local" in row).length;
  const needle = query.trim().toLowerCase();
  const match = (row: PoolTarget) => !needle || row.name.toLowerCase().includes(needle);
  const toggle = (rowId: string) => {
    if (!custom) return;
    const next = chosen.has(rowId) ? choice.ids.filter(item => item !== rowId) : [...choice.ids, rowId];
    onChange({ mode: "custom", ids: next });
  };
  const summary = custom ? `Your own pool · ${pool.length} target${pool.length === 1 ? "" : "s"}${privateInPool ? ` (${privateInPool} private)` : ""}` : `All ${eligiblePublic.length} public targets`;
  const tooSmall = custom && pool.length < MIN_CUSTOM_POOL;
  return <details className="target-pool" open={custom && tooSmall ? true : undefined}>
    <summary><span className="target-pool-label">Targets to compare</span><span className="target-pool-summary">{summary}</span></summary>
    <div className="target-pool-body">
      <div className="target-pool-modes" role="radiogroup" aria-label="Which targets to compare">
        <label className={!custom ? "is-on" : ""}><input type="radio" name={`${id}-mode`} checked={!custom} disabled={disabled} onChange={() => onChange({ mode: "all" })}/><span><strong>All public targets</strong><small>The shared pool ({eligiblePublic.length} for this headphone type). Your private targets are not included.</small></span></label>
        <label className={custom ? "is-on" : ""}><input type="radio" name={`${id}-mode`} checked={custom} disabled={disabled} onChange={() => onChange({ mode: "custom", ids: custom ? choice.ids : eligibleLocal.map(row => row.id) })}/><span><strong>Choose my own pool</strong><small>Pick any number of public targets and your own uploads, at least {MIN_CUSTOM_POOL}. Names stay hidden while you listen.</small></span></label>
      </div>
      {custom && <>
        <div className="target-pool-tools">
          <input type="search" aria-label="Find a target by name" placeholder="Find a target" value={query} onChange={event => setQuery(event.target.value)} disabled={disabled}/>
          <button type="button" disabled={disabled || !eligibleLocal.length} onClick={() => onChange({ mode: "custom", ids: eligibleLocal.map(row => row.id) })}>Only my targets</button>
          <button type="button" disabled={disabled || !chosen.size} onClick={() => onChange({ mode: "custom", ids: [] })}>Clear</button>
        </div>
        <p className={`target-pool-count${tooSmall ? " is-short" : ""}`} role="status">{pool.length} chosen · {tooSmall ? `choose at least ${MIN_CUSTOM_POOL} to start` : pool.length > MAX_SHARED_POOL ? "large pool · stays on this device" : "any number works"}</p>
        <fieldset className="target-pool-group"><legend>Your targets <small>private to you</small></legend>
          {eligibleLocal.length ? eligibleLocal.filter(match).map(row => <label key={row.id} className="target-pool-item"><input type="checkbox" checked={chosen.has(row.id)} disabled={disabled} onChange={() => toggle(row.id)}/><span>{row.name}</span><em>{row.pending ? "Pending review" : "Private"}</em></label>) : <p className="footnote">None for this headphone type yet. Add one on the Open comparison page under Upload.</p>}
        </fieldset>
        <fieldset className="target-pool-group"><legend>Public targets <small>{eligiblePublic.length}</small></legend>
          <div className="target-pool-list">{eligiblePublic.filter(match).map(row => <label key={row.id} className="target-pool-item"><input type="checkbox" checked={chosen.has(row.id)} disabled={disabled} onChange={() => toggle(row.id)}/><span>{row.name}</span></label>)}</div>
        </fieldset>
        <p className="target-pool-note">Comparisons that include a private target stay on this device: nothing from that run is sent to research or community sharing, even if you opted in elsewhere.</p>
      </>}
    </div>
  </details>;
}
