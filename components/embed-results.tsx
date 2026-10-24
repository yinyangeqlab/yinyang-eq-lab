"use client";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { EMBED_LISTENER_KINDS, EMBED_SIGNAL_CODES, KIND_LABELS, SIGNAL_LABELS } from "@/lib/embed-shootout";
import { TARGET_COLORS, copyText, embedSnippet, forgetShootout, readSaved, saveShootout, siteOrigin, type EmbedResults } from "@/components/embed-common";
import "./embed-shootout.css";
import "./embed-manage.css";

const pct = (value: number) => `${Math.round(value * 100)}%`;
const day = (ms: number) => new Date(ms).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });

function download(name: string, type: string, text: string) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const link = document.createElement("a");
  link.href = url; link.download = name; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function EmbedResultsView({ id }: { id: string }) {
  const [key, setKey] = useState("");
  const [pasted, setPasted] = useState("");
  const [data, setData] = useState<EmbedResults | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleted, setDeleted] = useState(false);
  const [keySaved, setKeySaved] = useState(true);
  const origin = siteOrigin();

  const load = useCallback(async (manageKey: string) => {
    setLoading(true); setError("");
    try {
      const response = await fetch(`/api/embed-shootouts/${id}/results`, { headers: { Authorization: `Bearer ${manageKey}` }, cache: "no-store" });
      const body = await response.json().catch(() => ({})) as EmbedResults & { error?: string };
      if (!response.ok) { setError(body.error || "Results could not be loaded."); setData(null); return; }
      setData(body); setKey(manageKey);
      const saved = saveShootout({ id, key: manageKey, title: body.title, created: body.createdAt });
      setKeySaved(saved);
      // The fragment is never sent to a server; remove it from the address bar once it is saved on this device.
      if (saved && location.hash) history.replaceState(null, "", location.pathname + location.search);
    } catch { setError("Results could not be loaded. Check your connection."); }
    finally { setLoading(false); }
  }, [id]);

  useEffect(() => {
    const fragment = new URLSearchParams(location.hash.slice(1)).get("key");
    const stored = readSaved().find(item => item.id === id)?.key;
    const found = fragment || stored;
    queueMicrotask(() => { if (found) void load(found); else setLoading(false); });
  }, [id, load]);

  async function setShare(enabled: boolean) {
    setBusy(true); setError("");
    try {
      const response = await fetch(`/api/embed-shootouts/${id}/results`, { method: "PATCH", headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" }, body: JSON.stringify({ ownerShare: enabled }) });
      const body = await response.json().catch(() => ({})) as EmbedResults & { error?: string };
      if (!response.ok) setError(body.error || "Your choice could not be saved."); else setData(body);
    } catch { setError("Your choice could not be saved. Check your connection."); }
    finally { setBusy(false); }
  }

  async function remove() {
    setBusy(true); setError("");
    try {
      const response = await fetch(`/api/embed-shootouts/${id}/results`, { method: "DELETE", headers: { Authorization: `Bearer ${key}` } });
      if (!response.ok) { setError("The shootout could not be deleted. Try again."); return; }
      forgetShootout(id); setDeleted(true); setData(null);
    } catch { setError("The shootout could not be deleted. Check your connection."); }
    finally { setBusy(false); }
  }

  const copy = async (label: string, text: string) => { if (await copyText(text)) { setCopied(label); setTimeout(() => setCopied(""), 1800); } };

  const rows = useMemo(() => {
    if (!data) return [];
    const names = data.targets.map(t => t.name);
    return data.runs.map(run => run.picks.map((pick, round) => ({ hour: run.hour, kind: run.kind, sighted: run.sighted, round: round + 1, a: names[pick[0]], b: names[pick[1]], result: pick[2] === 2 ? "tie" : pick[2] === 0 ? names[pick[0]] : names[pick[1]], aShownSecond: pick[3] === 1, sound: EMBED_SIGNAL_CODES[pick[4]] })));
  }, [data]);

  const shareUrl = `${origin}/s/${id}`;
  if (deleted) return <div className="em-root"><main className="em-card em-center"><h1>Shootout deleted</h1><p>The link, its results and every anonymous run were removed.</p><a className="es-button es-primary" href="/share-shootout">Make a new shootout</a></main></div>;

  return <div className="em-root">
    <header className="es-top"><Link className="es-brand" href="/" prefetch={false}>YinYang <span>EQ</span></Link><a className="es-make" href="/share-shootout">Make another shootout</a></header>
    <main className="em-wrap" aria-busy={loading}>
      {!keySaved && data && <p className="es-error" role="alert">Browser storage could not save your private results key. Keep the private results link bookmarked or copied before leaving.</p>}
      {loading && <p className="es-status">Loading results…</p>}

      {!loading && !data && <section className="em-card"><h1>Private results</h1>
        <p>{error || "This page needs the private results link you saved when you created the shootout."}</p>
        <form onSubmit={event => { event.preventDefault(); const match = pasted.match(/key=([A-Za-z0-9_-]{43})/) || pasted.trim().match(/^([A-Za-z0-9_-]{43})$/); if (match) void load(match[1]); else setError("That does not look like a results link or key."); }}>
          <label className="em-label" htmlFor="em-paste">Paste your results link or key</label>
          <input id="em-paste" className="em-input" value={pasted} onChange={event => setPasted(event.target.value)} autoComplete="off" spellCheck={false} />
          <button className="es-button es-primary" type="submit">Open results</button>
        </form></section>}

      {data && <>
        <section className="em-card em-head">
          <p className="es-eyebrow">Your private results</p>
          <h1>{data.title}</h1>
          <p className="em-muted">{data.targets.length} targets · created {day(data.createdAt)} · kept until {day(data.expiresAt)} (opening this page extends it)</p>
          <div className="em-links">
            <div><span className="em-label">Share link</span><div className="em-copy"><input readOnly value={shareUrl} aria-label="Share link" onFocus={event => event.currentTarget.select()} /><button className="es-button" type="button" onClick={() => void copy("link", shareUrl)}>{copied === "link" ? "Copied" : "Copy"}</button></div></div>
            <div><span className="em-label">Embed code</span><div className="em-copy"><input readOnly value={embedSnippet(id, origin)} aria-label="Embed code" onFocus={event => event.currentTarget.select()} /><button className="es-button" type="button" onClick={() => void copy("embed", embedSnippet(id, origin))}>{copied === "embed" ? "Copied" : "Copy"}</button></div></div>
          </div>
          <p className="em-note">Paste the share link in Discord, Slack or a message and a preview card appears. Discord cannot play interactive embeds, so the card opens the shootout in the browser; the embed code works on pages that allow iframes.</p>
        </section>

        <section className="em-kpis" aria-label="Totals">
          <div><strong>{data.summary.runs}</strong><span>blind listeners</span></div>
          <div><strong>{data.summary.decided}</strong><span>decided rounds</span></div>
          <div><strong>{data.summary.sightedRuns}</strong><span>sighted runs (excluded)</span></div>
          <div><strong>{data.summary.repeatAgreement && data.summary.repeatAgreement.total ? pct(data.summary.repeatAgreement.agree / data.summary.repeatAgreement.total) : "–"}</strong><span>listeners consistent across rounds</span></div>
        </section>

        {data.summary.runs === 0 ? <section className="em-card"><h2>Waiting for the first listener</h2><p>Share the link above. Results appear here as soon as someone finishes. Only completed runs are counted; people who leave halfway send nothing.</p></section> : <>
          <section className="em-card"><h2>How the targets rank</h2>
            <p className="em-muted">Score is the share of rounds a target won (a tie counts half). Whiskers show a 95% range; wide whiskers mean more votes are needed before trusting the order.</p>
            <ol className="em-bars">{[...data.summary.targets].sort((a, b) => b.score - a.score).map(stat => <li key={stat.index}>
              <div className="em-bar-label"><span className="es-dot" style={{ background: TARGET_COLORS[stat.index] }} aria-hidden="true" /><strong>{data.targets[stat.index]?.name}</strong><span>{pct(stat.score)} · {stat.wins}W {stat.losses}L {stat.ties}T</span></div>
              <div className="em-track" role="img" aria-label={`${data.targets[stat.index]?.name}: score ${pct(stat.score)}, 95% range ${pct(stat.low)} to ${pct(stat.high)}`}>
                <i style={{ width: pct(stat.score), background: TARGET_COLORS[stat.index] }} />
                <b style={{ left: pct(stat.low), width: `${Math.max(0.5, (stat.high - stat.low) * 100)}%` }} />
                <u />
              </div>
              <small>Chosen as favorite by {pct(data.summary.runs ? stat.favorite / data.summary.runs : 0)} of listeners</small>
            </li>)}</ol>
          </section>

          <section className="em-card"><h2>Head to head</h2>
            <ul className="em-pairs">{data.summary.pairs.map(pair => { const total = pair.aWins + pair.bWins + pair.ties || 1; return <li key={`${pair.a}-${pair.b}`}>
              <div className="em-pair-names"><span>{data.targets[pair.a]?.name}</span><span>{data.targets[pair.b]?.name}</span></div>
              <div className="em-split" role="img" aria-label={`${data.targets[pair.a]?.name} won ${pair.aWins}, tied ${pair.ties}, ${data.targets[pair.b]?.name} won ${pair.bWins}`}>
                <i style={{ flex: pair.aWins / total, background: TARGET_COLORS[pair.a] }} /><i style={{ flex: pair.ties / total, background: "#3a4d55" }} /><i style={{ flex: pair.bWins / total, background: TARGET_COLORS[pair.b] }} />
              </div>
              <div className="em-pair-names"><span>{pair.aWins} wins</span><span>{pair.ties} ties</span><span>{pair.bWins} wins</span></div></li>; })}</ul>
          </section>

          <section className="em-grid">
            <div className="em-card"><h2>Position bias</h2>
              <p className="em-big">{data.summary.sideBias.decided ? pct(data.summary.sideBias.pickedFirstShown / data.summary.sideBias.decided) : "–"}</p>
              <p className="em-muted">of decided picks were the option shown as <b>A</b>. Sides are shuffled every round, so this should sit near 50%.</p></div>
            <div className="em-card"><h2>Activity</h2>
              {data.summary.timeline.length ? <div className="em-spark" role="img" aria-label={`Completed runs per day, ${data.summary.timeline.length} days`}>{data.summary.timeline.map(point => <i key={point.day} title={`${new Date(point.day * 86400000).toLocaleDateString()}: ${point.runs}`} style={{ height: `${Math.max(8, point.runs / Math.max(...data.summary.timeline.map(p => p.runs)) * 100)}%` }} />)}</div> : null}
              <p className="em-muted">Completed runs per day (UTC).</p></div>
          </section>

          <section className="em-card"><h2>By listening setup</h2>
            <table className="em-table"><thead><tr><th scope="col">Setup</th><th scope="col">Listeners</th><th scope="col">Top scoring target</th></tr></thead><tbody>
              {EMBED_LISTENER_KINDS.flatMap(kind => { const tally = data.summary.byKind[kind]; if (!tally) return []; const best = tally.scores.indexOf(Math.max(...tally.scores)); return [<tr key={kind}><th scope="row">{KIND_LABELS[kind]}</th><td>{tally.runs}</td><td>{data.targets[best]?.name}</td></tr>]; })}
            </tbody></table>
            <h2 className="em-sub">By sound</h2>
            <table className="em-table"><thead><tr><th scope="col">Sound</th><th scope="col">Listeners</th><th scope="col">Top scoring target</th></tr></thead><tbody>
              {EMBED_SIGNAL_CODES.flatMap(signal => { const tally = data.summary.bySignal[signal]; if (!tally) return []; const best = tally.scores.indexOf(Math.max(...tally.scores)); return [<tr key={signal}><th scope="row">{SIGNAL_LABELS[signal]}</th><td>{tally.runs}</td><td>{data.targets[best]?.name}</td></tr>]; })}
            </tbody></table>
          </section>
        </>}

        <section className="em-card"><h2>Your data</h2>
          <p>Each run is stored as the hour it finished, the A/B picks, the optional setup the listener chose, whether they peeked at the curves, and which sound played. Nothing else: no IP address, cookie, account, device or exact time. The site&rsquo;s general abuse protection counts hashed requests briefly to limit spam, as it does everywhere on the site.</p>
          <p className="em-note">Because nothing identifies listeners, one person could vote more than once by clearing their browser data. Treat small counts with care.</p>
          <div className="es-actions">
            <button className="es-button" type="button" disabled={!data.runs.length} onClick={() => download(`shootout-${id}.csv`, "text/csv", ["hour_utc,setup,sighted,round,option_a,option_b,winner,a_shown_second,sound", ...rows.flat().map(r => [new Date(r.hour * 3600000).toISOString(), r.kind, r.sighted, r.round, r.a, r.b, r.result, r.aShownSecond, r.sound].map(cell => `"${String(cell).replaceAll('"', '""')}"`).join(","))].join("\n"))}>Download CSV</button>
            <button className="es-button" type="button" onClick={() => download(`shootout-${id}.json`, "application/json", JSON.stringify({ id, title: data.title, targets: data.targets.map(({ id: targetId, name, credit, license }) => ({ id: targetId, name, credit, license })), summary: data.summary, runs: data.runs }, null, 2))}>Download JSON</button>
          </div>
        </section>

        <section className="em-card em-consent" aria-labelledby="em-consent-title">
          <h2 id="em-consent-title">Share this data with the YinYang EQ Lab owner?</h2>
          <p>Your results are private to you by default. If you choose to share, the lab owner can read this shootout&rsquo;s totals and the anonymous run rows described above, to learn which targets listeners prefer. Because no identifiers are stored, there is nothing more to share. You can switch this off at any time and the owner will no longer see it; anything already exported before you did cannot be recalled. Deleting the shootout removes it entirely.</p>
          <label className="em-switch"><input type="checkbox" role="switch" checked={data.ownerShare.enabled} disabled={busy} onChange={event => void setShare(event.target.checked)} /><span>{data.ownerShare.enabled ? "Sharing with the lab owner" : "Not shared"}</span></label>
          {data.ownerShare.enabled && data.ownerShare.at && <p className="em-note">Sharing since {day(data.ownerShare.at)} (notice {data.ownerShare.notice}).</p>}
        </section>

        <section className="em-card em-danger"><h2>Delete this shootout</h2>
          <p>Removes the link, the results and every anonymous run permanently. People who open the link afterwards see that it has ended.</p>
          {confirmDelete ? <div className="es-actions"><button className="es-button em-delete" type="button" disabled={busy} onClick={() => void remove()}>Yes, delete everything</button><button className="es-button" type="button" onClick={() => setConfirmDelete(false)}>Keep it</button></div>
            : <button className="es-button" type="button" onClick={() => setConfirmDelete(true)}>Delete shootout…</button>}
        </section>
      </>}
      {error && data && <p className="es-error" role="alert">{error}</p>}
    </main>
  </div>;
}
