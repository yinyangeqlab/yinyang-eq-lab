"use client";
import { useState } from "react";
const reasons: Record<string, string> = { "records-removed": "Comparison records removed", "moderation": "Moderation updated", "target-revision": "Target response revised", "eligibility": "Evidence eligibility changed", "method-update": "Scoring method updated" };
export default function RankingChangeLog() { const [rows, setRows] = useState<{
    day: string;
    reason: string;
    method_version: string;
}[] | null>(null), [error, setError] = useState(""); async function load() { try {
    const r = await fetch('/api/owner-research/ranking-changes', { cache: 'no-store' });
    if (!r.ok)
        throw Error('Could not load ranking changes.');
    setRows((await r.json() as {
        rows: {
            day: string;
            reason: string;
            method_version: string;
        }[];
    }).rows);
    setError('');
}
catch (e) {
    setError(String(e));
} } return <section id="ranking-changes"><h2>Ranking change history</h2><p>Site-wide UTC dates and broad causes. Entries can include operations that did not change the current ranking filter. They do not establish the cause of a particular target’s movement. No erased records, target lists, exact times, counts or identities are retained.</p><button type="button" onClick={() => void load()}>Load change history</button>{error && <p role="status">{error}</p>}{rows && <ul>{rows.map(r => <li key={r.day + r.reason + r.method_version}>{r.day} · {reasons[r.reason] ?? r.reason} · {r.method_version}</li>)}{!rows.length && <li>No changes recorded since this history was introduced. Earlier events are not backfilled.</li>}</ul>}</section>; }
