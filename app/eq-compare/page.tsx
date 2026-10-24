"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import BlindEqEditor from "@/components/blind-eq-editor";
import BlindEqListener, { type EqSong, type ListeningEvidence } from "@/components/blind-eq-listener";
import { createBlindSession, recordBlindRound, revealBlindSession, type BlindChoice, type BlindSession, type EqPreset } from "@/lib/blind-eq";
import { listeningPool } from "@/lib/music-catalog";
import "./style.css";

const pool: EqSong[] = listeningPool.map((track, index) => ({ id: `pool-${index}`, title: track.title, artist: track.artist, url: track.fileUrl }));
const emptyEvidence = (): ListeningEvidence => ({ heard: [0, 0], start: 0, seconds: 15 });

export default function BlindEqCompare() {
  const [presets, setPresets] = useState<[EqPreset | null, EqPreset | null]>([null, null]);
  const [localSongs, setLocalSongs] = useState<EqSong[]>([]), [selectedIds, setSelectedIds] = useState<string[]>([]), [search, setSearch] = useState("");
  const [match, setMatch] = useState(true), [session, setSession] = useState<BlindSession | null>(null), [queue, setQueue] = useState<EqSong[]>([]);
  const [evidence, setEvidence] = useState<ListeningEvidence>(emptyEvidence), [error, setError] = useState(""), [confirmReveal, setConfirmReveal] = useState(false), [confirmReset, setConfirmReset] = useState(false);
  const transition = useRef(false), heading = useRef<HTMLHeadingElement>(null);
  const songs = [...localSongs, ...pool];
  const song = session && !session.revealed ? queue[session.rounds.length] : undefined;
  const count = session?.rounds.length || 0;
  const blindPresets = useMemo(() => session ? session.order.map(index => session.presets[index]) as [EqPreset, EqPreset] : null, [session]);
  const comparisonReady = evidence.heard.every(seconds => seconds >= 5);
  const finished = Boolean(session && !song);

  useEffect(() => {
    if (!session || session.revealed) return;
    const beforeUnload = (event: BeforeUnloadEvent) => { event.preventDefault(); };
    window.addEventListener("beforeunload", beforeUnload);
    return () => window.removeEventListener("beforeunload", beforeUnload);
  }, [session]);
  useEffect(() => { transition.current = false; if (session) heading.current?.focus(); }, [count, session]);

  function choosePreset(index: number, preset: EqPreset | null) { setPresets(current => { const next: typeof current = [...current]; next[index] = preset; return next; }); }
  function toggleSong(id: string) { setSelectedIds(current => current.includes(id) ? current.filter(value => value !== id) : [...current, id]); }
  function addFiles(files: FileList | null) {
    if (!files) return;
    setError("");
    const next: EqSong[] = [];
    for (const file of Array.from(files)) {
      if (file.size > 100_000_000) { setError("Some files were omitted because they exceed 100 MB each."); continue; }
      if (localSongs.length + next.length >= 30) { setError("Use at most 30 local songs per session."); break; }
      next.push({ id: crypto.randomUUID(), title: file.name.replace(/\.[^.]+$/, ""), artist: "Local audio · stays in this tab", file });
    }
    setLocalSongs(current => [...current, ...next]); setSelectedIds(current => [...current, ...next.map(song => song.id)]);
  }
  function start() {
    setError("");
    try {
      if (!presets[0] || !presets[1]) throw Error("Load or save both presets first.");
      const selected = selectedIds.map(id => songs.find(song => song.id === id)).filter((value): value is EqSong => Boolean(value));
      if (!selected.length) throw Error("Choose at least one song.");
      if (selected.length > 30) throw Error("Choose at most 30 songs per session.");
      setQueue(selected); setEvidence(emptyEvidence()); setSession(createBlindSession([presets[0], presets[1]]));
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not start the comparison."); }
  }
  function vote(choice: BlindChoice) {
    if (!session || !song || transition.current) return;
    try {
      const next = recordBlindRound(session, { song: song.title, artist: song.artist, start: evidence.start, seconds: evidence.seconds, choice, heard: evidence.heard });
      transition.current = true; setSession(next); setEvidence(emptyEvidence()); setError("");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not save this choice."); }
  }
  function reveal() {
    if (!session) return;
    try { setSession(revealBlindSession(session)); setConfirmReveal(false); setError(""); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Complete a comparison first."); }
  }
  function reset() { setSession(null); setQueue([]); setEvidence(emptyEvidence()); setConfirmReset(false); setConfirmReveal(false); setError(""); }
  function download() {
    if (!session?.revealed) return;
    const result = { version: 1, mode: "private-blind-eq", levelMatching: match ? "passage-stereo-RMS" : "preset-preamps", revealedAt: new Date().toISOString(), labels: { A: session.presets[session.order[0]], B: session.presets[session.order[1]] }, rounds: session.rounds };
    const url = URL.createObjectURL(new Blob([JSON.stringify(result, null, 2)], { type: "application/json" }));
    const link = document.createElement("a"); link.href = url; link.download = "private-eq-comparison.json"; link.click(); window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  const query = search.trim().toLowerCase();
  const shown = songs.filter(song => selectedIds.includes(song.id) || `${song.title} ${song.artist}`.toLowerCase().includes(query));
  const decisive = session?.rounds.filter(round => round.choice === "A" || round.choice === "B").length || 0;
  return <div className="eq-compare">
    <header className="eq-header"><a href="/home">YinYang EQ</a><nav aria-label="EQ comparison navigation"><a href="/shootout/personal">Tournament</a><a href="/music-library">Listening Pool</a></nav></header>
    <main>
      <p className="eq-eyebrow">Private listening room</p>
      <h1 ref={heading} tabIndex={-1}>{session?.revealed ? "The reveal" : "Blind EQ comparison"}</h1>
      <p className="eq-intro">{session?.revealed ? "Your choices are locked. Here’s which preset you heard on each side." : session ? "Listen, switch and choose. Preset names stay hidden until you end the session." : "Two presets. The same music. Find your preference before you see whose EQ is whose."}</p>
      <p className="eq-privacy">Presets, local audio and choices stay in this tab. They aren’t sent to research, rankings or Account Sync. Refreshing or closing the page clears the session; download your results after the reveal.</p>

      {!session && <>
        <div className="eq-format-note"><p>Upload <strong>Equalizer APO / Peace parametric TXT</strong> or <strong>Qudelix / PEQdB TXT</strong>, or enter filters manually. Both shared and separate Left / Right settings work.</p><details><summary>Supported settings &amp; how to prepare</summary><p>Supports preamp, peak (PK/PEQ) and center-frequency low/high shelves (LS/LSC, HS/HSC) with Q. Up to 32 enabled filters per channel. Export parametric TXT from Peace; native .peace, GraphicEQ, convolution, includes and slope/BW modifiers need a supported export or manual entry.</p><p>Use the same headphones throughout. Disable EQ in your system, player and DAC to avoid applying it twice. No headphone measurement is required. The page hides names and curves during listening; someone inspecting browser tools could discover the mapping.</p></details></div>
        <div className="eq-editors"><BlindEqEditor title="Preset 1" initialName="My EQ" initialPreset={presets[0]} onChange={preset => choosePreset(0, preset)} /><BlindEqEditor title="Preset 2" initialName="Friend’s EQ" initialPreset={presets[1]} onChange={preset => choosePreset(1, preset)} /></div>
        <section className="eq-card" aria-labelledby="eq-songs"><h2 id="eq-songs">Choose your songs</h2><p>One choice per song, in the order you select them. Choose up to 30 songs; each uses a looping 15-second passage you can move.</p>
          <label className="eq-upload">Add local audio files<input type="file" accept="audio/*,.flac,.wav,.mp3,.m4a,.ogg,.aac" multiple onChange={event => { addFiles(event.target.files); event.target.value = ""; }} /></label>
          <p className="eq-muted">Local files stay on this device. Supported codecs depend on your browser. Listening Pool access uses your existing site sign-in.</p>
          <label htmlFor="eq-song-search">Search Listening Pool and local songs</label><input id="eq-song-search" type="search" value={search} onChange={event => setSearch(event.target.value)} />
          <p className="eq-selected" role="status">{selectedIds.length} selected <button type="button" disabled={!selectedIds.length} onClick={() => setSelectedIds([])}>Clear selection</button></p>
          <div className="eq-song-list" role="group" aria-label="Songs">{shown.map(song => <label className="eq-song" key={song.id}><input type="checkbox" checked={selectedIds.includes(song.id)} disabled={selectedIds.length >= 30 && !selectedIds.includes(song.id)} onChange={() => toggleSong(song.id)} /><span><strong>{song.title}</strong><small>{song.artist}</small></span>{selectedIds.includes(song.id) && <span aria-hidden="true" className="eq-song-order">{selectedIds.indexOf(song.id) + 1}</span>}</label>)}{!shown.length && <p>No songs match this search.</p>}</div>
        </section>
        <section className="eq-card"><h2>Comparison settings</h2><label className="eq-check"><input type="checkbox" checked={match} onChange={event => setMatch(event.target.checked)} />Match the EQs’ playback levels (recommended)</label><p className="eq-muted">Matches measured stereo RMS after applying each EQ to the selected passage. Perceived loudness can still differ. Both receive common sample-peak headroom; EQ shapes and Left / Right balance are preserved.</p><p>Starting hides both presets and assigns A / B randomly. The mapping stays fixed across songs. Listen to five seconds of each side before choosing A, B or no preference.</p><button type="button" className="eq-primary" disabled={!presets[0] || !presets[1] || !selectedIds.length} onClick={start}>Hide presets &amp; start</button></section>
      </>}

      {session && !session.revealed && <>
        <p className="eq-progress">{song ? `Song ${count + 1} of ${queue.length}` : "Playlist complete"} · {count} choices saved in this tab</p>
        {song && blindPresets && <><BlindEqListener key={`${song.id}-${count}`} song={song} presets={blindPresets} match={match} onEvidence={setEvidence} />
          <section className="eq-card"><h2>Your preference for this song</h2><p>Choose after hearing both EQs, or skip a song you can’t compare.</p><div className="eq-votes"><button type="button" disabled={!comparisonReady} onClick={() => vote("A")}>Prefer A</button><button type="button" disabled={!comparisonReady} onClick={() => vote("tie")}>No preference</button><button type="button" disabled={!comparisonReady} onClick={() => vote("B")}>Prefer B</button></div><button type="button" className="eq-text-button" onClick={() => vote("skip")}>Skip this song</button></section></>}
        {finished && <section className="eq-card"><h2>You’ve reached the end</h2><p>{session.rounds.some(round => round.choice !== "skip") ? "Reveal the presets and see your choices across all songs." : "All songs were skipped. Start again to make a comparison."}</p></section>}
        <div className="eq-actions"><button type="button" className="eq-primary" disabled={!session.rounds.some(round => round.choice !== "skip")} onClick={() => finished ? reveal() : setConfirmReveal(true)}>Finish &amp; reveal</button><button type="button" onClick={() => setConfirmReset(true)}>Discard session</button></div>
        {confirmReveal && <section className="eq-card" aria-label="Confirm early reveal"><h2>End this session now?</h2><p>The remaining {queue.length - count} songs will be left unanswered. Revealing ends blind listening for this session.</p><div className="eq-actions"><button type="button" onClick={reveal}>End &amp; reveal presets</button><button type="button" onClick={() => setConfirmReveal(false)}>Keep listening</button></div></section>}
      </>}

      {session?.revealed && <>
        <div className="eq-reveal-grid">{(["A", "B"] as const).map((label, index) => { const preset = session.presets[session.order[index]]; return <section className="eq-card" key={label}><p className="eq-eyebrow">{label} was</p><h2>{preset.name}</h2><strong className="eq-result-count">{session.rounds.filter(round => round.choice === label).length} preferred</strong><p className="eq-muted">Left {preset.channels[0].filters.length} / Right {preset.channels[1].filters.length} filters</p><details><summary>Reveal filter settings</summary>{preset.channels.map((channel, index) => <div key={index}><h3>{index === 0 ? "Left" : "Right"} · preamp {channel.preampDb} dB</h3>{channel.filters.length ? <ul>{channel.filters.map((filter, i) => <li key={i}>{filter.type} · {filter.hz} Hz · {filter.gain} dB · Q {filter.q}</li>)}</ul> : <p>Flat reference</p>}</div>)}</details></section>; })}</div>
        <p>{session.rounds.filter(round => round.choice === "tie").length} no preference · {session.rounds.filter(round => round.choice === "skip").length} skipped · {queue.length - count} unanswered</p>
        <p className="eq-muted">These are your preferences across {decisive} decisive choices in this session. This is not an ABX identification test or a statistical proof of a better EQ.</p>
        <div className="eq-results-wrap"><table className="eq-results"><caption>Your song-by-song choices</caption><thead><tr><th scope="col">Song</th><th scope="col">Passage</th><th scope="col">Choice</th></tr></thead><tbody>{session.rounds.map((round, index) => <tr key={index}><td>{round.song}<small>{round.artist}</small></td><td>{Math.floor(round.start)}–{Math.floor(round.start + round.seconds)} s</td><td>{round.choice === "A" || round.choice === "B" ? `${round.choice} · ${session.presets[session.order[round.choice === "A" ? 0 : 1]].name}` : round.choice === "tie" ? "No preference" : "Skipped"}</td></tr>)}</tbody></table></div>
        <div className="eq-actions"><button type="button" className="eq-primary" onClick={download}>Download private results</button><button type="button" onClick={() => setConfirmReset(true)}>New blind session</button></div>
      </>}
      {confirmReset && <section className="eq-card" aria-label="Confirm clearing session"><h2>Clear this session?</h2><p>Its choices will be removed from this tab. {session?.revealed && "Download your results first if you want to keep them."} Your setup stays available.</p><div className="eq-actions"><button type="button" onClick={reset}>Clear session</button><button type="button" onClick={() => setConfirmReset(false)}>Keep session</button></div></section>}
      {error && <p className="eq-error" role="alert">{error}</p>}
    </main>
  </div>;
}
