"use client";
import ShootoutVoteLabel from "@/components/shootout-vote-label";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import BlindEqListener, { type EqSong, type ListeningEvidence } from "./blind-eq-listener";
import MusicTrackPicker from "./music-track-picker";
import { listeningPool } from "@/lib/music-catalog";
import { confirmationComplete, confirmationEvidence, personalStandings } from "@/lib/personal-shootout";
import { GENERATED_EQ_STORAGE, createGeneratedComparison, confirmGeneratedComparison, generatedLeadingResult, generatedPreset, generatedReadiness, generatedRecordingId, recordGeneratedComparison, restoreGeneratedComparison, type GeneratedComparison } from "@/lib/generated-eq-comparison";
import { validateEqSampleRate } from "@/lib/blind-eq";
import { fitterLabel } from "@/lib/fitter-settings";
import type { FinalizedVariant } from "@/lib/preference-finalize";
import type { ChannelMatch } from "@/lib/channel-balance";
import "../app/eq-compare/style.css";
import "./generated-eq-comparison.css";

const emptyEvidence = (): ListeningEvidence => ({ heard: [0, 0], start: 0, seconds: 0 });
export type GeneratedEqContext = { headphones: string; target: string };
type ComparisonSong = EqSong & { recordingId: string };

export default function GeneratedEqComparison({ variants, signature, context, sharedMatch, onClose, onChoose, quick = false }: { variants: FinalizedVariant[]; signature: string; context: GeneratedEqContext; sharedMatch?: ChannelMatch; quick?: boolean; onClose: () => void; onChoose: (fit: FinalizedVariant) => void }) {
  const dialog = useRef<HTMLDialogElement>(null), audio = useRef<AudioContext | null>(null), sourceCache = useRef<{ id: string; buffer: AudioBuffer } | null>(null), active = useRef<GeneratedComparison | null>(null);
  const [sessionContext, setSessionContext] = useState<AudioContext | undefined>();
  const [selected, setSelected] = useState(() => variants.map((_, i) => i));
  const [session, setSession] = useState<GeneratedComparison | null>(null), [saved, setSaved] = useState<GeneratedComparison | null>(null), [storageKey, setStorageKey] = useState("");
  const [loaded, setLoaded] = useState(false), [message, setMessage] = useState(""), [confirmNew, setConfirmNew] = useState(false);
  const [locals, setLocals] = useState<ComparisonSong[]>([]), [songId, setSongId] = useState(""), [readingFile, setReadingFile] = useState(false), [volume, setVolume] = useState(1), [evidence, setEvidence] = useState<ListeningEvidence>(emptyEvidence);
  const live = useRef(true), fileRequest = useRef(0);
  const songs = useMemo<ComparisonSong[]>(() => [...locals, ...listeningPool.map(track => ({ id: track.url, recordingId: generatedRecordingId(track), title: track.title, artist: track.artist, url: track.fileUrl }))], [locals]);
  const song = songs.find(row => row.id === songId);
  const pair = session?.run.pending;
  const presets = useMemo((): [ReturnType<typeof generatedPreset>, ReturnType<typeof generatedPreset>] | null => {
    if (quick) return [generatedPreset(variants[0]), generatedPreset(variants[1])];
    return pair ? [generatedPreset(variants[Number(pair[0])]), generatedPreset(variants[Number(pair[1])])] : null;
  }, [pair, quick, variants]);

  useEffect(() => {
    live.current = true; const element = dialog.current!; element.showModal(); element.querySelector<HTMLElement>("h2")?.focus();
    return () => { live.current = false; element.close(); sourceCache.current = null; const retired = audio.current; audio.current = null; if (retired && retired.state !== "closed") void retired.close(); };
  }, []);
  useEffect(() => {
    if (quick) return;
    let cancelled = false;
    void (async () => {
      try {
        const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(signature));
        const key = `${GENERATED_EQ_STORAGE}:${[...new Uint8Array(bytes)].map(n => n.toString(16).padStart(2, "0")).join("")}`;
        const prior = restoreGeneratedComparison(localStorage.getItem(key), signature, variants);
        if (!cancelled) { setStorageKey(key); setSaved(prior); if (prior) setSelected(prior.selected); }
      } catch { if (!cancelled) setMessage("Saved progress could not be read. This comparison can still run in this tab; download its results before leaving."); }
      finally { if (!cancelled) setLoaded(true); }
    })();
    return () => { cancelled = true; };
  }, [quick, signature, variants]);

  function update(next: GeneratedComparison) {
    active.current = next; setSession(next); setSaved(next); setEvidence(emptyEvidence());
    if (storageKey) { try { localStorage.setItem(storageKey, JSON.stringify(next)); } catch { setMessage("Progress could not be saved in this browser. Download the results before closing this tab."); } }
  }
  function start(resume = false) {
    setMessage("");
    try {
      if (resume && saved?.revealed) { update(saved); return; }
      audio.current ??= new AudioContext(); setSessionContext(audio.current);
      if (resume && saved && saved.sampleRate !== audio.current.sampleRate) throw Error("This saved comparison used a different playback sample rate. Start a new comparison on this device to keep its choices separate.");
      validateEqSampleRate((resume && saved ? saved.selected : selected).map(i => generatedPreset(variants[i])), audio.current.sampleRate);
      const next = resume && saved ? saved : createGeneratedComparison(signature, selected, variants, Math.random, audio.current.sampleRate);
      update(next); setConfirmNew(false);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not start this comparison."); }
  }
  async function addFile(file: File | undefined) {
    if (!file) return; const request = ++fileRequest.current; setReadingFile(true); setMessage("");
    try {
      if (file.size > 100_000_000) throw Error("Choose a recording under 100 MB.");
      const hash = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());
      if (!live.current || request !== fileRequest.current) return;
      const digest = [...new Uint8Array(hash)].map(n => n.toString(16).padStart(2, "0")).join("");
      const id = `local:${digest}`, known = listeningPool.find(track => track.sha256 === digest);
      const item: ComparisonSong = { id, recordingId: known ? generatedRecordingId(known) : `file:${digest}`, title: file.name.replace(/\.[^.]+$/, ""), artist: "Local recording · stays on this device", file };
      setLocals(rows => [...rows.filter(row => row.id !== id), item].slice(-5)); setSongId(id); setEvidence(emptyEvidence());
    } catch (error) { if (live.current && request === fileRequest.current) setMessage(error instanceof Error ? error.message : "Could not read this audio file."); }
    finally { if (live.current && request === fileRequest.current) setReadingFile(false); }
  }
  function vote(result: "a" | "b" | "tie" | "skip") {
    const current = active.current;
    if (!current || current !== session || !song) return;
    try { setMessage(""); update(recordGeneratedComparison(current, result, song.recordingId, evidence)); }
    catch (error) { setMessage(error instanceof Error ? error.message : "Could not save this choice."); }
  }
  function reveal() { if (active.current) update({ ...active.current, revealed: true }); }
  function download() {
    if (!session?.revealed) return;
    try {
    const blob = new Blob([JSON.stringify({ mode: "selected-generated-eq-results", context, levelMatching: "rendered-passage-stereo-RMS", channelMatch: sharedMatch ? "shared-correction" : "off", dynamics: "off", sampleRate: session.sampleRate, session, candidates: session.selected.map(i => ({ id: String(i), ...variants[i] })), leadingResult: generatedLeadingResult(session.run) }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob), link = document.createElement("a"); link.href = url; link.download = "generated-eq-results-comparison.json"; link.click(); window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    setMessage("Results download requested. Check that the file saved before replacing this comparison.");
    } catch { setMessage("The download could not start. Your saved comparison remains available here."); }
  }
  const readiness = session ? generatedReadiness(session.run) : null;
  const complete = session ? confirmationComplete(session.run) : false;
  const leading = session ? generatedLeadingResult(session.run) : null;
  const pairedSongs = session && pair ? confirmationEvidence(session.run, pair) : new Set<string>();
  const eligible = evidence.heard.every(n => n > 0);
  const musicPicker = <section className="eq-card">
    <h3>Music for this comparison</h3>
    <MusicTrackPicker tracks={songs} selectedIndex={songs.findIndex(row => row.id === songId)} onSelect={index => {
      setSongId(songs[index].id);
      setEvidence(emptyEvidence());
    }}/>
    <label className="eq-upload">Choose local audio<input type="file" accept="audio/*,.wav,.mp3,.flac,.m4a,.ogg" disabled={readingFile} onChange={event => {
      void addFile(event.target.files?.[0]);
      event.target.value = "";
    }}/></label>
    {readingFile && <p role="status">Reading local audio…</p>}
    <p className="eq-muted">{quick
      ? "Choose a song and switch between the two EQs while it plays."
      : "Play both versions, then choose whenever you’re ready. Switching songs resets listening progress for this pair. Start with music you know, then use another recording for the finalist checks."}</p>
  </section>;
  const listener = song && presets && <BlindEqListener
    key={`${session?.run.choices.length ?? 0}:${pair?.join(":") ?? "quick"}:${song.id}`}
    song={song} presets={presets} match freeListening context={sessionContext} sourceCache={sourceCache}
    sharedMatch={sharedMatch} initialVolume={volume} onVolumeChange={setVolume} onEvidence={setEvidence}
    sideLabels={quick ? ["Recommended EQ", "Closer fit"] : undefined}
  />;
  return createPortal(<dialog ref={dialog} className="generated-eq-dialog eq-compare" aria-labelledby="generated-eq-title" onCancel={event => { event.preventDefault(); onClose(); }}>
    <header className="generated-eq-header"><div><p className="eq-eyebrow">{quick ? "EQ listening preview" : "Generated results comparison"}</p><h2 id="generated-eq-title" tabIndex={-1}>{quick ? "Recommended EQ and closer fit" : `Compare ${session?.selected.length ?? selected.length} generated EQ results`}</h2></div><button type="button" onClick={onClose}>Close comparison</button></header>
    <p className="generated-eq-scope"><strong>{context.headphones}</strong> → <strong>{context.target}</strong></p>
    {!quick && <p>This compares the selected results from this generation only, for these headphones and this target. Your listening result describes preference within this compared set.</p>}
    <p className="eq-privacy">{quick ? "Local audio stays on this device." : "Progress stays in this browser, outside research, public rankings and Account Sync. Local audio stays on this device. Choose it again to resume after closing."} {sharedMatch ? "The same channel correction is used for every result." : "Channel correction is off for every result."} Dynamics are off.</p>
    {quick && <>
      {musicPicker}
      {listener}
      {song && <div className="eq-actions">
        <button type="button" disabled={!eligible} onClick={() => onChoose(variants[0])}>Select recommended EQ</button>
        <button type="button" disabled={!eligible} onClick={() => onChoose(variants[1])}>Select closer fit</button>
      </div>}
    </>}
    {!quick && !session && <section className="eq-card"><h3>EQ results to include</h3><p>Select at least two results. Names, graphs and recommendation badges will be hidden during listening. Each included result gets at least two comparisons before the leading results are checked on different recordings.</p><div className="eq-actions"><button type="button" onClick={() => setSelected(variants.map((_, i) => i))}>Include all results</button><button type="button" onClick={() => setSelected([])}>Clear selection</button></div><fieldset className="generated-eq-selection"><legend>Select generated results</legend>{variants.map((fit, i) => <label className="eq-check" key={i}><input type="checkbox" checked={selected.includes(i)} onChange={event => setSelected(rows => event.target.checked ? [...rows, i].sort((a, b) => a - b) : rows.filter(n => n !== i))}/><span>{fitterLabel(fit)}{fit.fallbackReason ? " · fallback" : ""}</span></label>)}</fieldset>{saved && <p>A saved comparison of {saved.selected.length} results is available for this exact generated set.</p>}<div className="eq-actions">{saved && <button type="button" disabled={!loaded} onClick={() => start(true)}>{saved.revealed ? "View saved comparison results" : `Resume comparison of ${saved.selected.length} results`}</button>}<button type="button" className="eq-primary" disabled={!loaded || selected.length < 2 || selected.length > 20} onClick={() => saved ? setConfirmNew(true) : start()}>Hide names &amp; compare {selected.length} selected results</button></div>{confirmNew && <div role="group" aria-label="Replace saved comparison"><p>Start a new comparison for this generated set? This replaces its saved comparison progress. Open the saved results and download them first if you want to keep them.</p><button type="button" onClick={() => start()}>Start new comparison</button><button type="button" onClick={() => setConfirmNew(false)}>Keep saved comparison</button></div>}</section>}
    {session && !session.revealed && <>
      <p className="eq-progress">{session.selected.length} selected generated results · {session.run.choices.filter(c => c.result !== "skip").length} comparison{session.run.choices.filter(c => c.result !== "skip").length===1?"":"s"} · {session.run.phase === "confirm" ? "Checking leading results across recordings" : "Comparing the selected set"}</p>
      {musicPicker}
      {session.run.phase === "confirm" && pair && <p className="generated-eq-guidance">This finalist pair has {pairedSongs.size} of 2 different recordings compared. {song && pairedSongs.has(song.recordingId) ? "Choose a different recording to add the missing confirmation; repeating this recording does not complete it." : "Compare this pair on two different recordings."}</p>}
      {song && pair && presets && <>{listener}<section className="eq-card"><h3>Which result do you prefer?</h3><div className="eq-votes"><button type="button" disabled={!eligible} onClick={() => vote("a")}><ShootoutVoteLabel choice="a"/></button><button type="button" disabled={!eligible} onClick={() => vote("tie")}><ShootoutVoteLabel choice="tie"/></button><button type="button" disabled={!eligible} onClick={() => vote("b")}><ShootoutVoteLabel choice="b"/></button></div><button type="button" onClick={() => vote("skip")}>Skip this pair</button></section></>}
      {session.run.phase === "explore" && <section className="eq-card"><p role="status">{readiness?.reason}</p><button type="button" disabled={!readiness?.ready} onClick={() => { try { update(confirmGeneratedComparison(session)); } catch (error) { setMessage(String(error)); } }}>Check leading results across songs</button><p className="eq-muted">A short run can remain inconclusive. Ties do not force an arbitrary shortlist.</p></section>}
      {complete && <section className="eq-card"><h3>Finalist checks complete</h3><p>{leading ? "A leading result emerged within this selected set." : "No clear preference emerged among the checked results."}</p></section>}
      <button type="button" className="eq-primary" onClick={reveal}>{complete ? "Reveal this set’s comparison results" : "End comparison & reveal results so far"}</button><p className="eq-muted">Revealing ends blind listening for this comparison. Closing instead keeps your progress for later.</p>
    </>}
    {session?.revealed && <section className="eq-card"><h3>{leading !== null ? `Leading result from these ${session.selected.length} compared EQs` : "No confirmed leading result within this set"}</h3>{leading !== null && <><strong className="generated-eq-leading">{fitterLabel(variants[Number(leading)])}</strong><p>Preferred directly over the other finalists in completed checks across different recordings. This is a personal result from the selected generated set, not proof of a universally best EQ.</p><button type="button" className="eq-primary" onClick={() => onChoose(variants[Number(leading)])}>Select this generated EQ result</button></>}<p>Compared set: {session.selected.length} generated results · {context.headphones} → {context.target}. Exploration narrows the set; finalist checks compare its leading results. Unfinished checks, ties or cycles can leave no clear preference.</p><div className="generated-eq-table"><table><caption>Results within this compared set · counts include exploration and finalist checks</caption><thead><tr><th>Generated EQ result</th><th>Preferred</th><th>Not preferred</th><th>Ties</th><th>Compared</th></tr></thead><tbody>{personalStandings(session.run).map(row => <tr key={row.id}><th>{fitterLabel(variants[Number(row.id)])}{session.run.finalists.includes(row.id) ? " · finalist" : ""}</th><td>{row.wins}</td><td>{row.losses}</td><td>{row.ties}</td><td>{row.heard}</td></tr>)}</tbody></table></div><p className="eq-muted">Counts come from different matchups and are not percentages of certainty. Numerical fit recommendations and preamp headroom remain separate from these listening choices.</p><button type="button" onClick={download}>Download this comparison’s results</button></section>}
    {message && <p className="eq-error" role="status">{message}</p>}
  </dialog>, document.body);
}
