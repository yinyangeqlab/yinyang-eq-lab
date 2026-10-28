"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import BlindEqEditor from "@/components/blind-eq-editor";
import BlindEqListener, { type EqSong, type ListeningEvidence } from "@/components/blind-eq-listener";
import { validateEqSampleRate, createBlindSession, recordBlindRound, revealBlindSession, type BlindChoice, type BlindRound, type BlindSession, type EqPreset } from "@/lib/blind-eq";
import { listeningPool } from "@/lib/music-catalog";
import { searchRows } from "@/lib/search";
import { bugReportUrl, formatRequestUrl } from "@/lib/release-info";
import "./style.css";

const pool: EqSong[] = listeningPool.map((track, index) => ({ id: `pool-${index}`, title: track.title, artist: track.artist, url: track.fileUrl }));
const emptyEvidence = (): ListeningEvidence => ({ heard: [0, 0], start: 0, seconds: 15 });

function choiceText(session: BlindSession, round: BlindRound) {
  if (round.choice === "skip") return "Skipped";
  if (round.choice === "tie") return "No preference";
  const index = round.order[round.choice === "A" ? 0 : 1], label = `Preset ${index + 1}`, name = session.presets[index].name;
  return `${round.choice} · ${label}${name === label ? "" : ` · ${name}`}`;
}

export default function BlindEqCompare() {
  const [presets, setPresets] = useState<[EqPreset | null, EqPreset | null]>([null, null]);
  const [localSongs, setLocalSongs] = useState<EqSong[]>([]), [selectedIds, setSelectedIds] = useState<string[]>([]), [search, setSearch] = useState("");
  const [downloadRequested, setDownloadRequested] = useState(false);
  const [listeningVolume, setListeningVolume] = useState(.25);
  const [match, setMatch] = useState(true), [session, setSession] = useState<BlindSession | null>(null), [queue, setQueue] = useState<EqSong[]>([]);
  const [evidence, setEvidence] = useState<ListeningEvidence>(emptyEvidence), [error, setError] = useState(""), [confirmReveal, setConfirmReveal] = useState(false), [confirmReset, setConfirmReset] = useState(false);
  const [sessionContext, setSessionContext] = useState<AudioContext | null>(null);
  const playbackContext = useRef<AudioContext | null>(null);
  useEffect(() => () => { const context = playbackContext.current; playbackContext.current = null; if (context && context.state !== "closed") void context.close(); }, []);
  const wasInSession = useRef(false), transition = useRef(false), heading = useRef<HTMLHeadingElement>(null);
  const confirmationHeading = useRef<HTMLHeadingElement>(null), confirmationOpener = useRef<HTMLElement | null>(null);
  const songs = [...localSongs, ...pool];
  const song = session && !session.revealed ? queue[session.rounds.length] : undefined;
  const count = session?.rounds.length || 0;
  const blindPresets = useMemo(() => session ? session.order.map(index => session.presets[index]) as [EqPreset, EqPreset] : null, [session]);
  const comparisonReady = evidence.heard.every(seconds => seconds >= 5);
  const finished = Boolean(session && !song);

  useEffect(() => {
    if (!session) return;
    const beforeUnload = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", beforeUnload);
    return () => window.removeEventListener("beforeunload", beforeUnload);
  }, [session]);
  useEffect(() => { transition.current = false; if (session || wasInSession.current) heading.current?.focus(); wasInSession.current = Boolean(session); }, [count, session]);

  useEffect(() => { if (confirmReveal || confirmReset) confirmationHeading.current?.focus(); }, [confirmReveal, confirmReset]);
  function requestConfirmation(kind: "reveal" | "reset", opener: HTMLElement) {
    confirmationOpener.current = opener; setConfirmReveal(kind === "reveal"); setConfirmReset(kind === "reset");
  }
  function cancelConfirmation() { setConfirmReveal(false); setConfirmReset(false); confirmationOpener.current?.focus(); }
  function choosePreset(index: number, preset: EqPreset | null) { setPresets(current => { const next: typeof current = [...current]; next[index] = preset; return next; }); }
  function toggleSong(id: string) { setSelectedIds(current => current.includes(id) ? current.filter(value => value !== id) : current.length < 30 ? [...current, id] : current); }
  function addFiles(files: FileList | null) {
    if (!files) return;
    setError("");
    const next: EqSong[] = [];
    for (const file of Array.from(files)) {
      if (file.size > 100_000_000) { setError("Some files were omitted because they exceed 100 MB each."); continue; }
      if (localSongs.length + next.length >= 30) { setError("At most 30 local files can be loaded. Remove a local file before adding another."); break; }
      next.push({ id: crypto.randomUUID(), title: file.name.replace(/\.[^.]+$/, ""), artist: "Local audio · stays in this tab", file });
    }
    setLocalSongs(current => [...current, ...next]);
    const slots = Math.max(0, 30 - selectedIds.length);
    setSelectedIds(current => [...current, ...next.slice(0, Math.max(0, 30 - current.length)).map(song => song.id)]);
    if (next.length > slots) setError("Local files were added, but only 30 songs can be selected. Deselect a song to choose another.");
  }
  function removeLocalSong(id: string) {
    setLocalSongs(current => current.filter(song => song.id !== id)); setSelectedIds(current => current.filter(value => value !== id)); setError("");
  }
  function start() {
    setError("");
    try {
      if (!presets[0] || !presets[1]) throw Error("Load or save both presets first.");
      const selected = selectedIds.map(id => songs.find(song => song.id === id)).filter((value): value is EqSong => Boolean(value));
      if (!selected.length) throw Error("Choose at least one song.");
      if (selected.length > 30) throw Error("Choose at most 30 songs per session.");
      if (!playbackContext.current || playbackContext.current.state === "closed") playbackContext.current = new AudioContext();
      validateEqSampleRate([presets[0], presets[1]], playbackContext.current.sampleRate);
      setSessionContext(playbackContext.current);
      setDownloadRequested(false); setQueue(selected); setEvidence(emptyEvidence()); setSession(createBlindSession([presets[0], presets[1]]));
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not start the comparison."); }
  }
  function vote(choice: BlindChoice) {
    if (!session || !song || transition.current) return;
    try {
      const next = recordBlindRound(session, { sourceId: song.id, song: song.title, artist: song.artist, start: evidence.start, seconds: evidence.seconds, choice, heard: evidence.heard });
      transition.current = true; setConfirmReveal(false); setConfirmReset(false); setSession(next); setEvidence(emptyEvidence()); setError("");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not save this choice."); }
  }
  function reveal() {
    if (!session) return;
    try { setSession(revealBlindSession(session)); setConfirmReveal(false); setError(""); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Complete a comparison first."); }
  }
  function reset() { setSessionContext(null); const context = playbackContext.current; playbackContext.current = null; if (context && context.state !== "closed") void context.close(); setDownloadRequested(false); setSession(null); setQueue([]); setEvidence(emptyEvidence()); setConfirmReset(false); setConfirmReveal(false); setError(""); }
  function download() {
    if (!session?.revealed) return;
    setError("");
    try {
      const result = { version: 2, mode: "private-blind-eq", levelMatching: match ? "passage-stereo-RMS" : "preset-preamps", revealedAt: session.revealedAt, presets: session.presets,
        playlist: queue.map(song => ({ id: song.id, title: song.title, artist: song.artist, source: song.file ? "local" : "listening-pool" })),
        unanswered: queue.length - session.rounds.length, rounds: session.rounds };
      const url = URL.createObjectURL(new Blob([JSON.stringify(result, null, 2)], { type: "application/json" }));
      const link = document.createElement("a"); link.href = url; link.download = `private-eq-comparison-${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
      try { document.body.appendChild(link); link.click(); setDownloadRequested(true); }
      finally { link.remove(); window.setTimeout(() => URL.revokeObjectURL(url), 10_000); }
    } catch { setError("The results download could not be started. Your results are still in this tab; try again before clearing or leaving."); }
  }
  const matchedSongs = searchRows(songs, search, song => [song.title, song.artist]);
  const shown = [...songs.filter(song => selectedIds.includes(song.id)), ...matchedSongs.filter(song => !selectedIds.includes(song.id))];
  const decisive = session?.rounds.filter(round => round.choice === "A" || round.choice === "B").length || 0;
  return <div className="eq-compare">
    <header className="eq-header"><a href="/home">YinYang EQ</a><nav aria-label="EQ comparison navigation"><a href="/shootout">Listen</a><a href="/music-library">Music library</a></nav></header>
    <main>
      <p className="eq-eyebrow">Private listening room</p>
      <h1 ref={heading} tabIndex={-1}>{session?.revealed ? "The reveal" : "Blind EQ comparison"}</h1>
      <p className="eq-intro">{session?.revealed ? "Your choices are locked. Here’s which preset you preferred on each song." : session ? "Listen, switch and choose. Preset names stay hidden until you end the session." : "Two presets. The same music. Find your preference before you see whose EQ is whose."}</p>
      <p className="eq-privacy">Presets, local audio and choices stay in this tab. They aren’t sent to research, rankings or Account Sync. Refreshing or closing the page clears the session; download your results after the reveal.</p>

      {!session && <>
        <div className="eq-format-note"><p>Upload <strong>Equalizer APO / Peace parametric TXT</strong> or <strong>CH: 0 / CH: 1 two-channel TXT</strong>, or enter filters manually. Both shared and separate Left / Right settings work.</p><details><summary>Supported settings &amp; how to prepare</summary><p>Preset import accepts .txt (up to 200 KB), including AutoEq ParametricEQ.txt and FixedBandEQ.txt. Results JSON is a download, not a preset import. CH: 0 / CH: 1 names a supported syntax; compatibility with a particular producer is not verified. Check both channels in the preview.</p><pre>{"Preamp: -6 dB\nFilter 1: ON PK Fc 1000 Hz Gain -2 dB Q 1.4"}</pre><p>Supports preamp, peak (PK/PEQ) and center-frequency low/high shelves (LS/LSC, HS/HSC) with Q. Up to 32 enabled filters per channel. Export parametric TXT from Peace; native .peace, GraphicEQ, convolution, includes and slope/BW modifiers need a supported export or manual entry.</p><p>Use the same headphones throughout. Disable EQ in your system, player and DAC to avoid applying it twice. No headphone measurement is required.  The page hides names and curves during listening; someone inspecting browser tools could discover the mapping.</p><p><a href={formatRequestUrl}>Request a format</a> · <a href={bugReportUrl}>Report an import problem</a> (public GitHub issues)</p><p>Use synthetic examples only; do not attach private presets or audio.</p></details></div>
        <div className="eq-editors"><BlindEqEditor title="Preset 1" initialName="Preset 1" initialPreset={presets[0]} onChange={preset => choosePreset(0, preset)} /><BlindEqEditor title="Preset 2" initialName="Preset 2" initialPreset={presets[1]} onChange={preset => choosePreset(1, preset)} /></div>
        {presets[0] && presets[1] && JSON.stringify(presets[0].channels) === JSON.stringify(presets[1].channels) && <p className="eq-muted" role="status">Both presets currently apply identical filter and preamp settings. Load or edit a preset if you want to compare different settings.</p>}
        <section className="eq-card" aria-labelledby="eq-songs"><h2 id="eq-songs">Choose your songs</h2><p>One choice per song, in the order you select them. Choose up to 30 songs; each uses a looping 15-second passage you can move.</p>
          <label className="eq-upload">Add local audio files<input type="file" accept="audio/*,.flac,.wav,.mp3,.m4a,.ogg,.aac" multiple onChange={event => { addFiles(event.target.files); event.target.value = ""; }} /></label>
          <p className="eq-muted">Local files stay on this device. Supported codecs depend on your browser. Listening Pool access uses your existing site sign-in.</p>
          <label htmlFor="eq-song-search">Search Listening Pool and local songs</label><input id="eq-song-search" type="search" value={search} onChange={event => setSearch(event.target.value)} />
          <div className="eq-selected"><span role="status">{selectedIds.length} selected · {matchedSongs.length} of {songs.length} match{search.trim() ? " (selected songs stay visible)" : ""}</span> <button type="button" disabled={!selectedIds.length} onClick={() => setSelectedIds([])}>Clear selection</button></div>
          <div className="eq-song-list" role="group" aria-label="Songs">{shown.map(song => <div className="eq-song-row" key={song.id}><label className="eq-song"><input type="checkbox" checked={selectedIds.includes(song.id)} disabled={selectedIds.length >= 30 && !selectedIds.includes(song.id)} onChange={() => toggleSong(song.id)} /><span><strong>{song.title}</strong><small>{song.artist}</small></span>{selectedIds.includes(song.id) && <span aria-hidden="true" className="eq-song-order">{selectedIds.indexOf(song.id) + 1}</span>}</label>{song.file && <button type="button" className="eq-song-remove" aria-label={`Remove local file ${song.title}`} onClick={() => removeLocalSong(song.id)}>Remove</button>}</div>)}{!shown.length && <p>No songs match this search.</p>}</div>
        </section>
        <section className="eq-card"><h2>Comparison settings</h2><label className="eq-check"><input type="checkbox" checked={match} onChange={event => setMatch(event.target.checked)} />Match the EQs’ playback levels (recommended)</label><p className="eq-muted">Louder can sound preferable, so matching reduces that bias. Matches measured stereo RMS after applying each EQ to the selected passage. Perceived loudness can still differ. Both receive common sample-peak headroom; EQ shapes and Left / Right balance are preserved.</p><p>Starting hides both presets and assigns A / B randomly. The mapping is randomized independently for each song. Listen to five seconds of each side before choosing A, B or no preference.</p><button type="button" className="eq-primary" disabled={!presets[0] || !presets[1] || !selectedIds.length} onClick={start}>Hide presets &amp; start</button><p className="eq-muted" role="status">{[!presets[0] && "Preset 1 is not ready", !presets[1] && "Preset 2 is not ready", !selectedIds.length && "Choose at least one song"].filter(Boolean).join(" · ") || "Both presets and your playlist are ready."}</p></section>
      </>}

      {session && !session.revealed && <>
        <p className="eq-progress">{song ? `Song ${count + 1} of ${queue.length}` : "Playlist complete"} · {session.rounds.filter(round => round.choice !== "skip").length} compared · {session.rounds.filter(round => round.choice === "skip").length} skipped · {queue.length - count} unanswered</p>
        {song && blindPresets && <><BlindEqListener key={`${song.id}-${count}`} song={song} context={sessionContext ?? undefined} presets={blindPresets} match={match} initialVolume={listeningVolume} onVolumeChange={setListeningVolume} onEvidence={setEvidence} />
          <section className="eq-card"><h2>Your preference for this song</h2><p>Listen to at least 5 seconds of A and B first (shown above). Several passes may help; five seconds is only the minimum. Skip a song you can’t compare.</p><div className="eq-votes"><button type="button" disabled={!comparisonReady} onClick={() => vote("A")}>Prefer A</button><button type="button" disabled={!comparisonReady} onClick={() => vote("tie")}>No preference</button><button type="button" disabled={!comparisonReady} onClick={() => vote("B")}>Prefer B</button></div><button type="button" className="eq-text-button" onClick={() => vote("skip")}>Skip this song</button></section></>}
        {finished && <section className="eq-card"><h2>You’ve reached the end</h2><p>{session.rounds.some(round => round.choice !== "skip") ? "Reveal the presets and see your choices across all songs." : "All songs were skipped. Start again to make a comparison."}</p></section>}
        <div className="eq-actions"><button type="button" className="eq-primary" disabled={!session.rounds.some(round => round.choice !== "skip")} onClick={event => finished ? reveal() : requestConfirmation("reveal", event.currentTarget)}>Finish &amp; reveal</button><button type="button" onClick={event => requestConfirmation("reset", event.currentTarget)}>Discard session</button></div>
        {confirmReveal && <section className="eq-card" aria-label="Confirm early reveal" onKeyDown={event => { if (event.key === "Escape") { event.preventDefault(); cancelConfirmation(); } }}><h2 ref={confirmationHeading} tabIndex={-1}>End this session now?</h2><p>The remaining {queue.length - count} songs will be left unanswered. Revealing ends blind listening for this session.</p><div className="eq-actions"><button type="button" onClick={reveal}>End &amp; reveal presets</button><button type="button" onClick={cancelConfirmation}>Keep listening</button></div></section>}
      </>}

      {session?.revealed && <>
        <div className="eq-reveal-grid">{session.presets.map((preset, index) => { return <section className="eq-card" key={index}><p className="eq-eyebrow">Preset {index + 1}</p><h2>{preset.name}</h2><strong className="eq-result-count">{session.rounds.filter(round => (round.choice === "A" || round.choice === "B") && round.order[round.choice === "A" ? 0 : 1] === index).length} preferred</strong><p className="eq-muted">Left {preset.channels[0].filters.length} / Right {preset.channels[1].filters.length} filters</p><details><summary>Reveal filter settings</summary>{preset.channels.map((channel, index) => <div key={index}><h3>{index === 0 ? "Left" : "Right"} · preamp {channel.preampDb} dB</h3>{channel.filters.length ? <ul>{channel.filters.map((filter, i) => <li key={i}>{filter.type} · {filter.hz} Hz · {filter.gain} dB · Q {Number(filter.q.toPrecision(3))}</li>)}</ul> : <p>Flat reference</p>}</div>)}</details></section>; })}</div>
        <p>{session.rounds.filter(round => round.choice === "tie").length} no preference · {session.rounds.filter(round => round.choice === "skip").length} skipped · {queue.length - count} unanswered</p>
        <p className="eq-muted">These are your preferences across {decisive} decisive choices in this session. This is not an ABX identification test or a statistical proof of a better EQ.</p>
        <div className="eq-results-wrap"><table className="eq-results"><caption>Your song-by-song choices</caption><thead><tr><th scope="col">Song</th><th scope="col">Passage</th><th scope="col">Choice</th></tr></thead><tbody>{session.rounds.map((round, index) => <tr key={index}><td>{round.song}<small>{round.artist}</small></td><td>{round.choice === "skip" ? "Not compared" : `${Math.floor(round.start)}–${Math.floor(round.start + round.seconds)} s`}</td><td>{choiceText(session, round)}</td></tr>)}</tbody></table></div>
        <div className="eq-actions"><button type="button" className="eq-primary" onClick={download}>Download private results</button><button type="button" onClick={event => requestConfirmation("reset", event.currentTarget)}>New blind session</button></div>
        {downloadRequested && <p className="eq-muted" role="status">Download requested. Check that the file saved before clearing or leaving this session. The leave-page warning stays active because this page cannot confirm the browser saved it.</p>}
      </>}
      {confirmReset && <section className="eq-card" aria-label="Confirm clearing session" onKeyDown={event => { if (event.key === "Escape") { event.preventDefault(); cancelConfirmation(); } }}><h2 ref={confirmationHeading} tabIndex={-1}>Clear this session?</h2><p>Its choices will be removed from this tab. {session?.revealed && "Download your results first if you want to keep them."} Your setup stays available.</p><div className="eq-actions"><button type="button" onClick={reset}>Clear session</button><button type="button" onClick={cancelConfirmation}>Keep session</button></div></section>}
      {error && <p className="eq-error" role="alert">{error}</p>}
    </main>
  </div>;
}
