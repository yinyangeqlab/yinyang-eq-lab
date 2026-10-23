"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { copyText, embedSnippet, readSaved, saveShootout, siteOrigin, TARGET_COLORS, type SavedShootout } from "@/components/embed-common";
import "./embed-shootout.css";
import "./embed-manage.css";

type Choice = { id: string; name: string; credit: string; license: string };
type Created = { id: string; manageKey: string };

export default function EmbedCreate() {
  const [targets, setTargets] = useState<Choice[] | null>(null);
  const [limits, setLimits] = useState({ min: 2, max: 4 });
  const [picked, setPicked] = useState<string[]>([]);
  const [title, setTitle] = useState("Which sounds better?");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [created, setCreated] = useState<Created | null>(null);
  const [saved, setSaved] = useState<SavedShootout[]>([]);
  const [copied, setCopied] = useState("");
  const origin = siteOrigin();

  useEffect(() => {
    queueMicrotask(() => setSaved(readSaved()));
    fetch("/api/embed-shootouts").then(async response => {
      const body = await response.json().catch(() => ({})) as { targets?: Choice[]; min?: number; max?: number; error?: string };
      if (!response.ok || !body.targets) { setError(body.error || "Targets could not be loaded."); setTargets([]); return; }
      setTargets(body.targets); setLimits({ min: body.min ?? 2, max: body.max ?? 4 });
    }).catch(() => { setError("Targets could not be loaded. Check your connection."); setTargets([]); });
  }, []);

  const toggle = (id: string) => setPicked(current => current.includes(id) ? current.filter(item => item !== id) : current.length < limits.max ? [...current, id] : current);

  async function create() {
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/embed-shootouts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title, targetIds: picked }) });
      const body = await response.json().catch(() => ({})) as Created & { error?: string };
      if (!response.ok) { setError(body.error || "The shootout could not be created."); return; }
      saveShootout({ id: body.id, key: body.manageKey, title: title.trim() || "Blind shootout", created: Date.now() });
      setSaved(readSaved()); setCreated(body);
    } catch { setError("The shootout could not be created. Check your connection."); }
    finally { setBusy(false); }
  }

  const copy = async (label: string, text: string) => { if (await copyText(text)) { setCopied(label); setTimeout(() => setCopied(""), 1800); } };
  const resultsUrl = created ? `${origin}/s/${created.id}/results#key=${created.manageKey}` : "";
  const shareUrl = created ? `${origin}/s/${created.id}` : "";

  return <div className="em-root">
    <header className="es-top"><Link className="es-brand" href="/" prefetch={false}>YinYang <span>EQ</span></Link><a className="es-make" href="/privacy">Privacy</a></header>
    <main className="em-wrap">
      {!created && <>
        <section className="em-card em-hero">
          <p className="es-eyebrow">Shareable shootout</p>
          <h1>Let your friends ear-test targets, blind.</h1>
          <p className="es-lead">Pick two to four headphone targets and get one link. Anyone can open it, listen through loudness-matched A/B comparisons and vote. You see the combined results privately, and you decide whether the lab owner sees them too.</p>
          <ul className="em-points"><li><b>Works in Discord.</b> Paste the link and a preview card appears. It opens the interactive shootout in the browser.</li><li><b>Embeddable.</b> You also get an iframe snippet for sites that allow it.</li><li><b>Anonymous.</b> No accounts, cookies or tracking IDs. Voters send only their picks.</li></ul>
        </section>

        <section className="em-card" aria-labelledby="em-pick">
          <h2 id="em-pick">1. Choose {limits.min}–{limits.max} targets</h2>
          <p className="em-muted">Only targets with an open license (MIT or CC BY 4.0) can be shared this way, because their curve data goes to everyone who opens the link. Credit and license are shown to listeners at the reveal.</p>
          {targets === null && <p className="es-status">Loading targets…</p>}
          {targets && !targets.length && <p className="em-muted">{error || "No targets are available right now."}</p>}
          <ul className="em-choices">{targets?.map(target => { const on = picked.includes(target.id), index = picked.indexOf(target.id); return <li key={target.id}>
            <label className={on ? "on" : ""}><input type="checkbox" checked={on} onChange={() => toggle(target.id)} disabled={!on && picked.length >= limits.max} />
              <span className="em-slot" style={on ? { background: TARGET_COLORS[index], color: "#021012" } : undefined}>{on ? index + 1 : ""}</span>
              <span><strong>{target.name}</strong><small>{target.credit} · {target.license}</small></span></label></li>; })}</ul>
        </section>

        <section className="em-card" aria-labelledby="em-title">
          <h2 id="em-title">2. Name it</h2>
          <label className="em-label" htmlFor="em-title-input">Title shown in the link preview and on the page</label>
          <input id="em-title-input" className="em-input" value={title} maxLength={80} onChange={event => setTitle(event.target.value)} />
          <p className="em-note">The title appears in link previews, so keep it friendly. The targets stay hidden until each listener finishes.</p>
          <button className="es-button es-primary" type="button" disabled={busy || picked.length < limits.min} onClick={() => void create()}>{busy ? "Creating…" : "Create shootout"}</button>
          {error && targets?.length ? <p className="es-error" role="alert">{error}</p> : null}
        </section>

        <section className="em-card"><h2>What happens to the data</h2>
          <ul className="em-points"><li>Listeners send their A/B picks, an optional listening-setup answer and whether they peeked at curves. Time is kept to the hour. No IP address, cookie or account is stored.</li><li>You get a private results link. Whoever has it can see the results, so keep it to yourself.</li><li>Results are private by default. On your results page you can choose to share the anonymous data with the lab owner, and switch that off again later.</li><li>Shootouts are kept for 180 days after you last open your results, and you can delete one any time.</li></ul>
        </section>

        {saved.length > 0 && <section className="em-card"><h2>Your shootouts on this device</h2>
          <ul className="em-saved">{saved.map(item => <li key={item.id}><a href={`/s/${item.id}/results#key=${item.key}`}>{item.title}</a><span>{new Date(item.created).toLocaleDateString()}</span></li>)}</ul>
          <p className="em-note">Saved only in this browser. If you clear it, you will need your private results link.</p></section>}
      </>}

      {created && <section className="em-card em-success" aria-live="polite">
        <p className="es-eyebrow">Your shootout is live</p>
        <h1>Share it.</h1>
        <div className="em-links">
          <div><span className="em-label">Share link (public)</span><div className="em-copy"><input readOnly value={shareUrl} aria-label="Share link" onFocus={event => event.currentTarget.select()} /><button className="es-button" type="button" onClick={() => void copy("link", shareUrl)}>{copied === "link" ? "Copied" : "Copy"}</button></div></div>
          <div><span className="em-label">Embed code</span><div className="em-copy"><input readOnly value={embedSnippet(created.id, origin)} aria-label="Embed code" onFocus={event => event.currentTarget.select()} /><button className="es-button" type="button" onClick={() => void copy("embed", embedSnippet(created.id, origin))}>{copied === "embed" ? "Copied" : "Copy"}</button></div></div>
          <div className="em-private"><span className="em-label">Private results link. Keep this to yourself.</span><div className="em-copy"><input readOnly value={resultsUrl} aria-label="Private results link" onFocus={event => event.currentTarget.select()} /><button className="es-button" type="button" onClick={() => void copy("results", resultsUrl)}>{copied === "results" ? "Copied" : "Copy"}</button></div>
            <p className="em-note">This link is the only way to see your results or delete the shootout, and it cannot be recovered. It is saved in this browser; bookmark it too.</p></div>
        </div>
        <div className="es-actions"><a className="es-button es-primary" href={`/s/${created.id}/results#key=${created.manageKey}`}>Open my results</a><a className="es-button" href={`/s/${created.id}`} target="_blank" rel="noopener">Try it yourself</a></div>
        <p className="em-note">Tip for Discord: paste the share link on its own line. Discord shows a preview card (it cannot run interactive embeds inside a message), and the card opens the shootout in the browser.</p>
      </section>}
    </main>
  </div>;
}
