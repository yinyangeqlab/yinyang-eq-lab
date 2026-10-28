"use client";

import { searchRows } from "@/lib/search";
import { useEffect, useRef, useState } from "react";

type ParentTarget = { id: string; name: string; creator: string };

export default function TargetLineagePicker({ targets, kind, parentId, onKind, onParent }: {
  targets: ParentTarget[];
  kind: "original" | "preference";
  parentId: string;
  onKind: (kind: "original" | "preference") => void;
  onParent: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const host = useRef<HTMLDivElement>(null);
  const selected = targets.find(target => target.id === parentId);
  const matches = searchRows(targets, query, target => [target.name, target.creator]).slice(0, 30);
  useEffect(() => {
    if (!open) return;
    const dismiss = (event: PointerEvent) => { if (host.current && !host.current.contains(event.target as Node)) setOpen(false); };
    document.addEventListener("pointerdown", dismiss);
    return () => document.removeEventListener("pointerdown", dismiss);
  }, [open]);

  return <fieldset className="target-lineage">
    <legend>Curve origin</legend>
    <div className="target-lineage-options">
      <label><input type="radio" name="curveKind" checked={kind === "original"} onChange={() => { onKind("original"); onParent(""); setOpen(false); }} />Original curve</label>
      <label><input type="radio" name="curveKind" checked={kind === "preference"} onChange={() => onKind("preference")} />Preference based on another target</label>
    </div>
    {kind === "preference" && <div className="target-parent-field" ref={host}>
      <label htmlFor="parent-target-search">Based on target</label>
      <input id="parent-target-search" type="search" aria-controls="parent-target-results" autoComplete="off" placeholder="Search available targets" value={open ? query : selected?.name ?? query} onFocus={() => { setQuery(""); setOpen(true); }} onChange={event => { setQuery(event.target.value); onParent(""); setOpen(true); }} onKeyDown={event => { if (event.key === "Escape") setOpen(false); }} />
      {open && <div className="target-parent-results" id="parent-target-results" role="region" aria-label="Available parent targets" onKeyDown={event => { if (event.key === "Escape") { event.preventDefault(); host.current?.querySelector<HTMLInputElement>("input")?.focus(); setOpen(false); } }}>
        {matches.length ? matches.map(target => <button type="button" aria-pressed={target.id === parentId} key={target.id} onClick={() => { onParent(target.id); setQuery(target.name); setOpen(false); }}><strong>{target.name}</strong><small>by {target.creator}</small></button>) : <p>No available targets match.</p>}
      </div>}
      {!parentId && <small className="target-parent-hint">Select a target from the results before uploading.</small>}
    </div>}
  </fieldset>;
}
