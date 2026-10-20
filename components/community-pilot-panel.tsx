"use client";
import { useState } from 'react';
export default function CommunityPilotPanel() { const [view, setView] = useState<{
    catalogs: {
        id: string;
        period: string;
        headphone_type: string;
    }[];
    analysis: unknown;
    adaptive?: unknown;
    records?: {
        kind: string;
        id: string;
        headphone_type: string;
        excluded: number;
    }[];
} | null>(null), [error, setError] = useState(''), [note, setNote] = useState(''); async function load(id = '') { try {
    const r = await fetch('/api/owner-research/community-pilot' + (id ? '?catalog=' + encodeURIComponent(id) : ''), { cache: 'no-store' });
    if (!r.ok)
        throw Error('Pilot analysis unavailable.');
    setView(await r.json());
    setError('');
}
catch (e) {
    setError(String(e));
} } return <section><h2>Community Preferences · private validation pilot</h2><p>Public numeric release is disabled. Review completion, selection bias, coverage, ties, cycles and uncertainty before any release decision. Small cohorts and exact diagnostics stay admin-only.</p><button onClick={() => void load()}>Load pilot catalogs</button>{view?.catalogs.map(c => <button key={c.id} onClick={() => void load(c.id)}>{c.period} · {c.headphone_type}</button>)}{error && <p role="status">{error}</p>}{view && <><details><summary>Adaptive supporting evidence</summary><pre style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{JSON.stringify(view.adaptive, null, 2)}</pre></details><label>Moderation reason<input value={note} maxLength={240} onChange={e => setNote(e.target.value)}/></label>{view.records?.map(r => <p key={r.kind + r.id}>{r.kind} · {r.headphone_type} · {r.id.slice(0, 8)} <button disabled={!note.trim()} onClick={() => void fetch("/api/owner-research/community-pilot", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kind: r.kind, id: r.id, excluded: !r.excluded, note }) }).then(async (response) => { if (!response.ok)
    throw Error("Moderation failed."); await load(); }).catch(e => setError(String(e)))}>{r.excluded ? "Restore eligibility" : "Exclude from pilot analysis"}</button></p>)}</>}{view?.analysis != null && <details open><summary>Private diagnostics</summary><pre style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', maxHeight: 500, overflow: 'auto' }}>{JSON.stringify(view.analysis, null, 2)}</pre></details>}</section>; }
