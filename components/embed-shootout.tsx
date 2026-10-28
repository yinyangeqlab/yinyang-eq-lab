"use client";
import { shortcutDecision } from "@/lib/playback-shortcuts";
import { usePlaybackShortcutContext } from "@/lib/use-playback-shortcut-context";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Audition, type SourceKind } from "@/lib/embed-audio";
import { EMBED_LISTENER_KINDS, KIND_LABELS, SIGNAL_LABELS, summarize, type ListenerKind, type StoredPick } from "@/lib/embed-shootout";
import {
  TARGET_COLORS, alreadyVoted, bandX, copyText, markVoted, siteOrigin,
  type EmbedConfig, type EmbedReveal,
} from "@/components/embed-common";
import CurvePlot from "@/components/embed-curve-plot";
import "./embed-shootout.css";

type Phase = "loading" | "error" | "intro" | "listen" | "sending" | "done";
type Side = "a" | "b";
type Pick = { round: number; winner: "a" | "b" | "tie"; flipped: boolean; signal: SourceKind };
const MIN_HEARD = 2;
const SIDE_COLOR = { a: [255, 77, 94], b: [77, 141, 255], none: [88, 216, 201] } as const;

function shuffled(count: number): number[] {
  const order = Array.from({ length: count }, (_, i) => i);
  for (let i = count - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; }
  return order;
}

/** Live spectrum of what is being played, with the hidden curves overlaid only in peek mode. */
function Stage({ audition, side, curves, peek }: { audition: Audition | null; side: Side | null; curves: { a: number[]; b: number[] } | null; peek: boolean }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const live = useRef({ side, curves, peek });
  useEffect(() => { live.current = { side, curves, peek }; });
  useEffect(() => {
    const el = canvas.current;
    if (!el) return;
    const g = el.getContext("2d");
    if (!g) return;
    const POINTS = 180, smoothed = new Float32Array(POINTS).fill(-120);
    let frame = 0, width = 0, height = 0;
    const fit = () => {
      const ratio = Math.min(2, window.devicePixelRatio || 1), box = el.getBoundingClientRect();
      width = Math.max(1, box.width); height = Math.max(1, box.height);
      el.width = Math.round(width * ratio); el.height = Math.round(height * ratio);
      g.setTransform(ratio, 0, 0, ratio, 0, 0);
    };
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(el);
    const padL = 8, padB = 22, logLo = Math.log(25), logHi = Math.log(18000);
    const xAt = (hz: number) => padL + (Math.log(hz) - logLo) / (logHi - logLo) * (width - padL * 2);
    const draw = () => {
      const { side: s, curves: c, peek: showCurves } = live.current, color = SIDE_COLOR[s ?? "none"], rgb = color.join(",");
      g.clearRect(0, 0, width, height);
      const plotH = height - padB;
      const bg = g.createLinearGradient(0, 0, 0, height); bg.addColorStop(0, "#050d11"); bg.addColorStop(1, "#02070a");
      g.fillStyle = bg; g.fillRect(0, 0, width, height);
      g.fillStyle = `rgba(${rgb},.07)`; g.font = `800 ${Math.min(plotH * 0.9, 200)}px Arial, sans-serif`; g.textAlign = "center"; g.textBaseline = "middle";
      if (s) g.fillText(s.toUpperCase(), width / 2, plotH / 2 + 6);
      g.textBaseline = "alphabetic"; g.font = "11px Arial, sans-serif";
      for (const [hz, label] of [[50, "50"], [100, "100"], [500, "500"], [1000, "1k"], [5000, "5k"], [10000, "10k"]] as const) {
        const x = xAt(hz);
        g.strokeStyle = "rgba(88,216,201,.12)"; g.lineWidth = 1; g.beginPath(); g.moveTo(x, 6); g.lineTo(x, plotH); g.stroke();
        g.fillStyle = "#7f96a6"; g.fillText(label, x, height - 6);
      }
      if (audition && audition.ctx.state === "running") {
        const raw = audition.spectrum(POINTS);
        for (let i = 0; i < POINTS; i++) smoothed[i] = Math.max(raw[i], smoothed[i] - 1.1);
        const yFor = (db: number) => plotH - Math.max(0, Math.min(1, (db + 92) / 70)) * (plotH - 14);
        g.beginPath();
        for (let i = 0; i < POINTS; i++) { const x = xAt(25 * (18000 / 25) ** (i / (POINTS - 1))), y = yFor(smoothed[i]); if (i) g.lineTo(x, y); else g.moveTo(x, y); }
        g.save();
        g.shadowColor = `rgba(${rgb},.9)`; g.shadowBlur = 14; g.strokeStyle = `rgba(${rgb},1)`; g.lineWidth = 2.2; g.stroke(); g.restore();
        g.lineTo(xAt(18000), plotH); g.lineTo(xAt(25), plotH); g.closePath();
        const fill = g.createLinearGradient(0, 0, 0, plotH); fill.addColorStop(0, `rgba(${rgb},.5)`); fill.addColorStop(1, `rgba(${rgb},.02)`);
        g.fillStyle = fill; g.fill();
      }
      if (showCurves && c) {
        for (const [key, gains] of [["a", c.a], ["b", c.b]] as const) {
          const active = key === s, tone = SIDE_COLOR[key].join(",");
          g.beginPath();
          const pts = gains.map((db, band) => [padL + bandX(band, width - padL * 2), plotH / 2 - Math.max(-18, Math.min(18, db)) / 18 * (plotH * 0.38)] as const);
          pts.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y));
          g.save(); g.shadowColor = `rgba(${tone},.9)`; g.shadowBlur = active ? 12 : 0; g.strokeStyle = `rgba(${tone},${active ? 1 : 0.4})`; g.lineWidth = active ? 3 : 1.6; g.stroke(); g.restore();
        }
      }
      frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);
    return () => { cancelAnimationFrame(frame); observer.disconnect(); };
  }, [audition]);
  return <canvas ref={canvas} className="es-stage" role="img" aria-label="Live spectrum of the sound you are hearing" />;
}

export default function EmbedShootout({ id, embed = false }: { id: string; embed?: boolean }) {
  const [phase, setPhase] = useState<Phase>("loading");
  const [error, setError] = useState("");
  const [config, setConfig] = useState<EmbedConfig | null>(null);
  const [kind, setKind] = useState<ListenerKind>("unknown");
  const [peek, setPeek] = useState(false);
  const [fileName, setFileName] = useState("");
  const [fileError, setFileError] = useState("");
  const [useFile, setUseFile] = useState(false);
  const [volume, setVolume] = useState(0.45);
  const [step, setStep] = useState(0);
  const [side, setSide] = useState<Side | null>(null);
  const [playing, setPlaying] = useState(false);
  const [heard, setHeard] = useState({ a: 0, b: 0 });
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<EmbedReveal | null>(null);
  const [picksView, setPicksView] = useState<Pick[]>([]);
  const [copied, setCopied] = useState(false);
  const [repeat, setRepeat] = useState(false);

  const audition = useRef<Audition | null>(null);
  const order = useRef<number[]>([]);
  const flips = useRef<boolean[]>([]);
  const picks = useRef<Pick[]>([]);
  const heardRef = useRef({ a: 0, b: 0 });
  const [auditionState, setAuditionState] = useState<Audition | null>(null);

  useEffect(() => {
    let live = true;
    fetch(`/api/embed-shootouts/${id}`).then(async response => {
      const body = await response.json().catch(() => ({})) as EmbedConfig & { error?: string };
      if (!live) return;
      setRepeat(alreadyVoted(id));
      if (!response.ok) { setError(body.error || "This shootout could not be loaded."); setPhase("error"); return; }
      setConfig(body); setPhase("intro");
    }).catch(() => { if (live) { setError("This shootout could not be loaded. Check your connection and try again."); setPhase("error"); } });
    return () => { live = false; };
  }, [id]);
  useEffect(() => () => { audition.current?.dispose(); audition.current = null; }, []);

  const ensureAudition = useCallback(() => {
    if (!audition.current && config) {
      audition.current = new Audition();
      audition.current.setCurves(config.bands, config.trims);
      audition.current.setVolume(volume);
      setAuditionState(audition.current);
    }
    return audition.current!;
  }, [config, volume]);

  const round = config ? config.rounds[order.current[step]] : undefined;
  const flipped = flips.current[order.current[step]] ?? false;
  // Presented A/B -> hidden target index.
  const targetFor = useCallback((s: Side, plan = round, flip = flipped) => plan ? ((s === "a") !== flip ? plan.a : plan.b) : 0, [round, flipped]);

  const listen = useCallback((s: Side) => {
    const engine = audition.current;
    if (!engine || !round) return;
    engine.select(targetFor(s));
    setSide(s);
    void engine.resume().then(() => setPlaying(true));
  }, [round, targetFor]);

  const beginRound = useCallback(async (index: number) => {
    const engine = audition.current;
    if (!engine || !config) return;
    const plan = config.rounds[order.current[index]], flip = flips.current[order.current[index]];
    setBusy(true);
    try {
      const source: SourceKind = useFile && engine.hasFile() ? "file" : plan.signal;
      await engine.useSource(source);
      const next = config.rounds[order.current[index + 1]];
      if (next && !(useFile && engine.hasFile())) void engine.preload(next.signal).catch(() => undefined);
      engine.select(targetFor("a", plan, flip));
      heardRef.current = { a: 0, b: 0 }; setHeard({ a: 0, b: 0 });
      setSide("a"); setPlaying(true);
    } catch { setError("Audio could not start in this browser."); setPhase("error"); }
    finally { setBusy(false); }
  }, [config, targetFor, useFile]);

  async function start() {
    if (!config) return;
    const engine = ensureAudition();
    await engine.resume().catch(() => undefined);
    order.current = shuffled(config.rounds.length);
    flips.current = config.rounds.map(() => Math.random() < 0.5);
    picks.current = []; setPicksView([]);
    setStep(0); setPhase("listen");
    await beginRound(0);
  }

  // Count how long each side has actually been audible.
  useEffect(() => {
    if (phase !== "listen" || !playing || !side) return;
    const timer = setInterval(() => {
      heardRef.current = { ...heardRef.current, [side]: heardRef.current[side] + 0.25 };
      setHeard(heardRef.current);
    }, 250);
    return () => clearInterval(timer);
  }, [phase, playing, side]);

  useEffect(() => {
    const hide = () => { if (document.hidden && audition.current) { void audition.current.pause().then(() => setPlaying(false)); } };
    document.addEventListener("visibilitychange", hide);
    return () => document.removeEventListener("visibilitychange", hide);
  }, []);

  async function togglePlay() {
    const engine = audition.current;
    if (!engine) return;
    if (playing) { await engine.pause(); setPlaying(false); } else { await engine.resume(); setPlaying(true); }
  }

  const canVote = heard.a >= MIN_HEARD && heard.b >= MIN_HEARD && !busy;

  async function vote(choice: Side | "tie") {
    if (!config || !round || !canVote) return;
    const winner: Pick["winner"] = choice === "tie" ? "tie" : (choice === "a") === !flipped ? "a" : "b";
    const signal: SourceKind = useFile && audition.current?.hasFile() ? "file" : round.signal;
    picks.current = [...picks.current, { round: order.current[step], winner, flipped, signal }];
    setPicksView(picks.current);
    if (step + 1 < config.rounds.length) { setStep(step + 1); await beginRound(step + 1); return; }
    await submit();
  }

  async function submit() {
    setPhase("sending"); setError("");
    audition.current?.select(null);
    try {
      const response = await fetch(`/api/embed-shootouts/${id}/votes`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ picks: picks.current.map(({ round: r, winner, flipped: f, signal }) => ({ round: r, winner, flipped: f, signal })), kind, sighted: peek, practice: repeat }),
      });
      const body = await response.json().catch(() => ({})) as EmbedReveal & { error?: string };
      if (!response.ok) { setError(body.error || "Your picks could not be saved."); setPhase("listen"); return; }
      if (!repeat) markVoted(id);
      void audition.current?.pause(); setPlaying(false);
      setResult(body); setPhase("done");
    } catch { setError("Your picks could not be sent. Check your connection and try again."); setPhase("listen"); }
  }

  const shortcutContext = usePlaybackShortcutContext(".es-card");
  useEffect(() => {
    if (phase !== "listen") return;
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (event.defaultPrevented || event.repeat || event.isComposing || event.ctrlKey || event.metaKey || event.altKey) return;
      if (!["1", "2", "a", "b", "s", " "].includes(event.key.toLowerCase())) return;
      const decision = shortcutDecision(target, event, shortcutContext());
      if (!decision.run) return;
      if (decision.blurTarget) target?.blur();
      const key = event.key.toLowerCase();
      if (key === "1" || key === "a") { event.preventDefault(); listen("a"); }
      else if (key === "2" || key === "b") { event.preventDefault(); listen("b"); }
      else if (key === " " || key === "s") { event.preventDefault(); listen(side === "a" ? "b" : "a"); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase, listen, side, shortcutContext]);

  async function chooseFile(file: File | undefined) {
    if (!file) return;
    setFileError("");
    try {
      const engine = ensureAudition();
      await engine.loadFile(file);
      setFileName(engine.fileName); setUseFile(true);
    } catch (cause) { setFileError(cause instanceof Error ? cause.message : "That file could not be used."); setUseFile(false); }
  }

  function runAgain() {
    setRepeat(true); setResult(null); setSide(null); setPicksView([]); setPhase("intro");
  }

  const mine = useMemo(() => {
    if (!result || !config) return null;
    const stored: StoredPick[] = picksView.map(({ round: r, winner, flipped: f, signal }) => {
      const plan = config.rounds[r];
      return [plan.a, plan.b, winner === "a" ? 0 : winner === "b" ? 1 : 2, f ? 1 : 0, ["noise", "pad", "beat", "file"].indexOf(signal)] as StoredPick;
    });
    return summarize(config.bands.length, [{ hour: 0, kind, sighted: false, picks: stored }]).targets;
  }, [result, config, picksView, kind]);

  const origin = siteOrigin();
  const stageCurves = config && round ? { a: config.bands[targetFor("a")], b: config.bands[targetFor("b")] } : null;
  const roundCount = config?.rounds.length ?? 0;

  const header = !embed && <header className="es-top"><Link className="es-brand" href="/" prefetch={false}>YinYang <span>EQ</span></Link><a className="es-make" href="/share-shootout">Make your own shootout</a></header>;
  const linkProps = embed ? { target: "_blank", rel: "noopener" } : {};

  return <div className={`es-root${embed ? " es-embed" : ""}`}>
    {header}
    <main className="es-card" aria-live="polite" aria-busy={phase === "loading" || busy}>
      {phase === "loading" && <p className="es-status">Loading shootout…</p>}

      {phase === "error" && <div className="es-center"><h1>Shootout unavailable</h1><p>{error}</p>{!embed && <a className="es-button" href="/share-shootout">Make a new shootout</a>}</div>}

      {phase === "intro" && config && <section className="es-intro">
        <p className="es-eyebrow">Blind shootout · {config.bands.length} targets · about {Math.max(1, Math.round(roundCount * 0.75))} min</p>
        <h1>{config.title}</h1>
        <p className="es-lead">You will hear short loops through hidden EQ curves and pick the one that sounds better. Sides are shuffled, and the names appear only after your last pick.</p>
        <p>Target curves are adjusted to the same mean band power across 125 Hz–8 kHz. This is an approximation, not a measurement of perceived playback loudness. No headphone correction is applied, so you hear the target differences on top of your own headphones.</p>
        <ul className="es-tips"><li>Best on headphones. <strong>Start the volume low</strong> and raise it gently.</li><li>Switch between <b className="es-a">A</b> and <b className="es-b">B</b> as often as you like. The music keeps playing.</li><li>No right answers. Trust what you prefer.</li></ul>
        <fieldset className="es-field"><legend>How are you listening? <small>(optional)</small></legend>
          <div className="es-chips">{EMBED_LISTENER_KINDS.map(option => <label key={option} className={kind === option ? "on" : ""}><input type="radio" name="kind" checked={kind === option} onChange={() => setKind(option)} />{KIND_LABELS[option]}</label>)}</div>
        </fieldset>
        <div className="es-field">
          <label className="es-file"><span>{useFile && fileName ? `Using “${fileName}”` : "Use my own audio instead (optional)"}</span>
            <input type="file" accept="audio/*" onChange={event => void chooseFile(event.target.files?.[0])} /></label>
          <p className="es-note">Your file is played in this browser only. It is never uploaded.</p>
          {fileError && <p className="es-error" role="alert">{fileError}</p>}
          {useFile && <button type="button" className="es-link" onClick={() => setUseFile(false)}>Go back to the built-in sounds</button>}
        </div>
        <label className="es-check"><input type="checkbox" checked={peek} onChange={event => setPeek(event.target.checked)} /> Show the curves while I listen <small>(counts as a sighted run, kept out of the blind totals)</small></label>
        {repeat && <p className="es-note">You already sent picks for this shootout from this browser. You can listen again; extra runs are not recorded.</p>}
        <button type="button" className="es-button es-primary" onClick={() => void start()}>Start listening</button>
        <p className="es-privacy">Only your A/B picks (and the optional answers above) are sent. No account, no cookies and no tracking ID. The person who shared this sees combined results.</p>
      </section>}

      {(phase === "listen" || phase === "sending") && config && round && <section className="es-listen">
        <div className="es-progress" role="progressbar" aria-valuemin={1} aria-valuemax={roundCount} aria-valuenow={Math.min(step + 1, roundCount)} aria-label="Round">
          <span>Round {Math.min(step + 1, roundCount)} of {roundCount}</span>
          <ol>{config.rounds.map((_, i) => <li key={i} className={i < step ? "done" : i === step ? "now" : ""} />)}</ol>
          <span className="es-source">{useFile && fileName ? "Your file" : SIGNAL_LABELS[round.signal]}</span>
        </div>
        <Stage audition={auditionState} side={playing ? side : null} curves={stageCurves} peek={peek} />
        <div className="es-switch" role="group" aria-label="Choose which option to hear">
          {(["a", "b"] as const).map(s => <button key={s} type="button" className={`es-side es-side-${s}`} aria-pressed={side === s} onClick={() => listen(s)}>
            <span className="es-letter">{s.toUpperCase()}</span><span className="es-state">{side === s ? (playing ? "Playing" : "Selected") : "Hear " + s.toUpperCase()}</span><kbd>{s === "a" ? "1" : "2"}</kbd></button>)}
        </div>
        <div className="es-controls">
          <button type="button" className="es-mini" onClick={() => void togglePlay()}>{playing ? "Pause" : "Play"}</button>
          <label className="es-volume">Volume<input type="range" min="0" max="1" step="0.01" value={volume} onChange={event => { const v = Number(event.target.value); setVolume(v); audition.current?.setVolume(v); }} aria-label="Volume" /></label>
          <span className="es-hint">Space or S switches A/B (shared shootout)</span>
        </div>
        <div className="es-vote" role="group" aria-label="Which sounds better?">
          <button type="button" disabled={!canVote || phase === "sending"} onClick={() => void vote("a")} className="es-vote-a">A sounds better</button>
          <button type="button" disabled={!canVote || phase === "sending"} onClick={() => void vote("tie")} className="es-vote-tie">Can’t tell</button>
          <button type="button" disabled={!canVote || phase === "sending"} onClick={() => void vote("b")} className="es-vote-b">B sounds better</button>
        </div>
        <p className="es-note es-center-text" role="status">{phase === "sending" ? "Sending your picks…" : busy ? "Preparing the next sound…" : canVote ? "Pick the one you prefer." : `Listen to both for ${MIN_HEARD} seconds each to unlock your pick.`}</p>
        {error && <p className="es-error" role="alert">{error} <button type="button" className="es-link" onClick={() => void submit()}>Try again</button></p>}
      </section>}

      {phase === "done" && result && config && <section className="es-done">
        {(() => {
          const scores = mine ?? [], best = Math.max(...scores.map(t => t.score)), leaders = scores.filter(t => t.score === best);
          const winner = leaders.length === 1 ? result.reveal[leaders[0].index] : null;
          return <>
            <p className="es-eyebrow">The reveal</p>
            <h1>{winner ? <>Your favorite: <span style={{ color: TARGET_COLORS[leaders[0].index] }}>{winner.name}</span></> : "You liked them about equally"}</h1>
            <CurvePlot label={`Frequency response of ${result.reveal.map(t => t.name).join(", ")}`} series={result.reveal.map(t => ({ name: t.name, bands: t.bands }))} />
            <ul className="es-reveal">
              {result.reveal.map((target, index) => {
                const stat = scores[index], crowd = result.crowd.targets[index];
                const share = result.crowd.runs >= 3 ? Math.round(crowd.favorite / result.crowd.runs * 100) : null;
                return <li key={target.id}>
                  <span className="es-dot" style={{ background: TARGET_COLORS[index] }} aria-hidden="true" />
                  <div><strong>{target.name}</strong>
                    <span>You: {stat.wins + stat.ties / 2} of {stat.comparisons} rounds{share !== null ? ` · ${share}% of ${result.crowd.runs} listeners chose it as their favorite` : ""}</span>
                    <small>By {target.credit}. {target.license} <a href={target.licenseUrl} {...linkProps}>license</a> · <a href={target.sourceUrl} {...linkProps}>source</a>. {target.changes}</small></div>
                </li>;
              })}
            </ul>
            {result.crowd.runs < 3 && <p className="es-note">{repeat ? "Extra runs are not recorded." : "You are among the first listeners, so there is no crowd view yet."}</p>}
            <div className="es-actions">
              <button type="button" className="es-button" onClick={async () => { setCopied(await copyText(`${origin}/s/${id}`)); setTimeout(() => setCopied(false), 2000); }}>{copied ? "Link copied" : "Copy link to share"}</button>
              <button type="button" className="es-button" onClick={runAgain}>Listen again (not recorded)</button>
              <a className="es-button es-primary" href="/share-shootout" {...linkProps}>Make your own shootout</a>
            </div>
          </>;
        })()}
      </section>}
    </main>
    {!embed && <footer className="es-foot"><a href="/privacy">Privacy</a><a href="/curve-credits">Curve credits</a><Link href="/" prefetch={false}>YinYang EQ</Link></footer>}
    {embed && phase === "done" && <p className="es-foot es-powered">Powered by <Link href="/" prefetch={false} {...linkProps}>YinYang EQ</Link></p>}
  </div>;
}

