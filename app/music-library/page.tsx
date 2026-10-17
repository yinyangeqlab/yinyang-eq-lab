"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { musicCandidates as tracks, type MusicCandidate as Track } from "@/lib/music-catalog";
import LibraryWavePlayer from "@/components/library-wave-player";
import LibraryEqPanel from "@/components/library-eq-panel";
import type { LibraryEq } from "@/lib/music-library-eq";
import "./style.css";

type MusicSnapshot = { signedIn: boolean; totals: { keep: number; pass: number }; mine: Record<string, "keep" | "pass">; error?: string };

function licenseName(url: string) {
  if (url.includes("publicdomain/zero")) return "CC0 1.0";
  if (url.includes("publicdomain/mark")) return "Public Domain Mark 1.0";
  if (url.includes("by-sa/3.0/us")) return "CC BY-SA 3.0 US";
  if (url.includes("by-sa/2.0/fr")) return "CC BY-SA 2.0 France";
  if (url.includes("by-nc-sa/4.0")) return "CC BY-NC-SA 4.0";
  if (url.includes("by-sa")) return "CC BY-SA 3.0";
  if (url.includes("by/3.0")) return "CC BY 3.0";
  return "CC BY 4.0";
}

export default function MusicLibraryPage() {
  const [active, setActive] = useState<number | null>(null);
  const [decisions, setDecisions] = useState<Record<string, "keep" | "pass">>({});
  const [ready, setReady] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [totals, setTotals] = useState({ keep: 0, pass: 0 });
  const [saving, setSaving] = useState<string | null>(null);
  const [voteMessage, setVoteMessage] = useState("");
  const [legacy, setLegacy] = useState<Record<string, "keep" | "pass"> | null>(null);
  const [filter, setFilter] = useState<"all" | "unrated" | "keep" | "pass">("unrated");
  const [query, setQuery] = useState("");
  const [eq, setEq] = useState<LibraryEq | null>(null);
  const root = useRef<HTMLElement>(null);
  const dynamic = tracks.filter(track => track.group === "dynamic");
  const compact = tracks.filter(track => track.group === "compact");
  const unmeasured = tracks.filter(track => track.group === "unmeasured");
  const newCount = tracks.filter(track => !decisions[track.url]).length;
  useEffect(() => {
    let cancelled = false;
    async function loadVotes() {
      try {
        const response = await fetch("/api/music-votes", { cache: "no-store" });
        const result = await response.json() as MusicSnapshot;
        if (!response.ok) throw new Error(result.error || "Could not load music votes.");
        if (cancelled) return;
        setSignedIn(result.signedIn === true);
        setTotals(result.totals);
        setDecisions(result.mine);
        const saved = JSON.parse(localStorage.getItem("target-lab-music-shortlist-v1") || "{}");
        if (result.signedIn && saved && typeof saved === "object" && !Array.isArray(saved)) {
          const valid = Object.fromEntries(Object.entries(saved).filter(([id, value]) => tracks.some(track => track.url === id) && (value === "keep" || value === "pass"))) as Record<string, "keep" | "pass">;
          if (Object.keys(valid).length && !Object.keys(result.mine).length) setLegacy(valid);
        }
      } catch (error) {
        if (!cancelled) setVoteMessage(error instanceof Error ? error.message : "Could not load music votes.");
      } finally { if (!cancelled) setReady(true); }
    }
    void loadVotes();
    return () => { cancelled = true; };
  }, []);
  async function saveVote(trackUrl: string, choice: "keep" | "pass" | null) {
    const response = await fetch("/api/music-votes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ trackUrl, choice }), cache: "no-store" });
    const result = await response.json() as MusicSnapshot;
    if (!response.ok) throw new Error(result.error || "Could not save music vote.");
    setDecisions(result.mine);
    setTotals(result.totals);
    localStorage.setItem("target-lab-music-shortlist-v1", JSON.stringify(result.mine));
  }
  async function decide(track: Track, value: "keep" | "pass") {
    if (!signedIn) { setVoteMessage("Sign in to submit a music vote."); return; }
    setSaving(track.url); setVoteMessage("");
    try { await saveVote(track.url, decisions[track.url] === value ? null : value); }
    catch (error) { setVoteMessage(error instanceof Error ? error.message : "Could not save music vote."); }
    finally { setSaving(null); }
  }
  async function submitMany(source: Record<string, "keep" | "pass">) {
    if (!signedIn) { setVoteMessage("Sign in to submit music votes."); return; }
    setSaving("import"); setVoteMessage("");
    let count = 0;
    try {
      for (const [trackUrl, choice] of Object.entries(source)) { await saveVote(trackUrl, choice); count++; }
      setLegacy(null);
      setVoteMessage(`Submitted ${count} music choices.`);
    } catch (error) { setVoteMessage(`${count} choices submitted. ${error instanceof Error ? error.message : "The rest could not be saved."}`); }
    finally { setSaving(null); }
  }
  const counts = (group: Track[]) => ({ keep: group.filter(track => decisions[track.url] === "keep").length, pass: group.filter(track => decisions[track.url] === "pass").length });
  const broadCounts = counts(dynamic), compactCounts = counts(compact), unmeasuredCounts = counts(unmeasured);
  const chosen = (group: Track[], value: "keep" | "pass") => group.filter(track => decisions[track.url] === value);
  function playOnly(index: number, playing: HTMLAudioElement) {
    setActive(index);
    root.current?.querySelectorAll("audio").forEach(audio => { if (audio !== playing) audio.pause(); });
  }
  function cards(group: Track[], offset: number) {
    const term = query.trim().toLocaleLowerCase();
    const visible = group.map((track, i) => ({ track, index: i + offset })).filter(({ track }) => {
      const matchesDecision = filter === "all" || (filter === "unrated" ? !decisions[track.url] : decisions[track.url] === filter);
      const matchesSearch = !term || [track.title, track.artist, track.genre, track.focus].some(value => value.toLocaleLowerCase().includes(term));
      return matchesDecision && matchesSearch;
    });
    return visible.length ? <div className="library-grid">{visible.map(({ track, index }) => <article id={`candidate-${index + 1}`} className={`library-track ${active === index ? "is-active" : ""}`} key={track.url}>
      <div className="library-track-top"><span className="library-number">{String(index + 1).padStart(2, "0")}</span>{!decisions[track.url] && <span className="library-fresh">UNDECIDED</span>}<span className="library-genre">{track.genre}</span><span className="library-lra">{track.lra === undefined ? "LRA not measured" : `${track.lra.toFixed(1)} LU LRA`}</span></div>
      <h3>{track.title}</h3><p className="library-artist">{track.artist}</p>
      <p className="library-focus"><strong>Listen for</strong> {track.focus}</p>
      {track.fileUrl ? <LibraryWavePlayer track={{ title: track.title, artist: track.artist, fileUrl: track.fileUrl, duration: track.duration }} onPlay={audio => playOnly(index, audio)} eq={eq} /> : <iframe className="library-bandcamp-player" title={`Listen to ${track.title} by ${track.artist}`} src={`https://bandcamp.com/EmbeddedPlayer/track=${track.playerId}/size=large/bgcol=1b222b/linkcol=55d5c5/tracklist=false/artwork=none/transparent=true/`} loading="lazy" allow="autoplay" />}
      <div className="library-decision" role="group" aria-label={`Decision for ${track.title}`}><button type="button" disabled={!ready || saving !== null} className={decisions[track.url] === "keep" ? "chosen keep" : ""} aria-pressed={decisions[track.url] === "keep"} onClick={() => void decide(track, "keep")}>Keep</button><button type="button" disabled={!ready || saving !== null} className={decisions[track.url] === "pass" ? "chosen pass" : ""} aria-pressed={decisions[track.url] === "pass"} onClick={() => void decide(track, "pass")}>Pass</button></div>
      <div className="library-track-meta"><span>{Math.floor(track.duration / 60)}:{String(Math.floor(track.duration % 60)).padStart(2, "0")}</span>{track.crest_db !== undefined && <span>Peak-to-mean {track.crest_db.toFixed(1)} dB</span>}{track.bitrate_kbps !== undefined && <span>{track.bitrate_kbps} kbps {track.filename?.endsWith(".flac") ? "FLAC" : "MP3"}</span>}{track.playerId && !track.fileUrl ? <span>Bandcamp stream · EQ unavailable</span> : <span>Stereo{track.playerId ? ` · ${track.fileUrl?.endsWith(".flac") ? "FLAC" : track.fileUrl?.endsWith(".m4a") ? "AAC" : "MP3"} · EQ ready` : ""}</span>}</div>
      <p className="library-credit">“{track.title}” by {track.artist}{track.album !== "-" && track.album !== "Single" ? `, from ${track.album}` : ""}. {track.credits && `${track.credits} `}<a href={track.url} target="_blank" rel="noreferrer">{track.playerId ? "Source and track license" : "Source and download"}</a> · <a href={track.license} target="_blank" rel="noreferrer">{licenseName(track.license)}</a>. {track.previewNote || "Original audio, no edits."}{track.playerId && " Noncommercial sharing is allowed with credit and a license link; indicate changes, and license adaptations under CC BY-NC-SA 4.0."}</p>
    </article>)}</div> : <p className="library-empty">No tracks match this filter in this group.</p>;
  }
  return <main className="library-page" ref={root}>
    <header className="library-header"><Link href="/" className="library-back"><img src="/brand-avatar-aligned.webp" alt="" /> YinYang EQ League <span>· Welcome</span></Link><span>OPEN MUSIC / LISTENING LIBRARY</span></header>
    <section className="library-hero"><div className="library-kicker">OPENLY LICENSED LISTENING CANDIDATES</div><h1>Choose the music.</h1><p>Listen, mark Keep or Pass, and shape a final set of 10 dynamic and 10 compressed-group tracks. The Shantae soundtrack is ready for optional listening EQ, but has not been measured or added to the local test pool.</p><div className="library-counts"><span><strong>{tracks.length}</strong> total candidates</span><span><strong>{newCount}</strong> undecided</span></div></section>
    <LibraryEqPanel onChange={setEq} />
    <section className="library-shortlist" aria-label="Your saved music shortlist"><div><span className="library-section-label">YOUR SAVED SHORTLIST</span><h2>Keep what you love.</h2><p>Your choices are saved to your signed-in account. Undecided means any track you have not yet marked Keep or Pass. Only you and the owner can see which tracks you chose. Change a decision anytime.</p></div><div className="library-progress"><span>All listeners · <strong>{totals.keep} approved</strong> · {totals.pass} not approved</span><span>Dynamic <strong>{broadCounts.keep}/10 kept</strong> · {broadCounts.pass} passed</span><span>Compressed <strong>{compactCounts.keep}/10 kept</strong> · {compactCounts.pass} passed</span><span>Shantae <strong>{unmeasuredCounts.keep} kept</strong> · {unmeasuredCounts.pass} passed</span></div><div className="library-saved-lists">{(["dynamic", "compact", "unmeasured"] as const).map(group => { const list = group === "dynamic" ? dynamic : group === "compact" ? compact : unmeasured; return <div key={group}><h3>{group === "dynamic" ? "Dynamic" : group === "compact" ? "Compressed" : "Shantae soundtrack"}</h3><p><strong>Keep:</strong> {chosen(list, "keep").map(track => track.title).join(" · ") || "None yet"}</p><p><strong>Pass:</strong> {chosen(list, "pass").map(track => track.title).join(" · ") || "None yet"}</p></div>; })}</div><div className="library-actions"><input className="library-search" type="search" aria-label="Search music candidates" placeholder="Search genre, artist, or song" value={query} onChange={event => setQuery(event.target.value)} /><select aria-label="Filter candidates" value={filter} onChange={event => setFilter(event.target.value as typeof filter)}><option value="unrated">Undecided ({newCount})</option><option value="all">Entire library ({tracks.length})</option><option value="keep">Kept only</option><option value="pass">Passed only</option></select></div>{legacy && <p role="status">This browser has {Object.keys(legacy).length} older choices that were not submitted. <button type="button" disabled={saving !== null} onClick={() => void submitMany(legacy)}>Submit saved browser choices</button></p>}{voteMessage && <p role="status">{voteMessage}</p>}</section>
    <section className="library-section" aria-labelledby="dynamic-title"><div className="library-section-head"><span className="library-section-label">SET 01 · DYNAMIC</span><h2 id="dynamic-title">Dynamic recordings</h2><p>Measured loudness range: {Math.min(...dynamic.map(t => t.lra ?? Infinity)).toFixed(1)}–{Math.max(...dynamic.map(t => t.lra ?? -Infinity)).toFixed(1)} LU. Listen to quiet passages, peaks, spatial detail and instrument separation.</p></div>{cards(dynamic, 0)}</section>
    <section className="library-section" aria-labelledby="compact-title"><div className="library-section-head"><span className="library-section-label">SET 02 · COMPRESSED</span><h2 id="compact-title">Compressed recordings</h2><p>Measured loudness range: {Math.min(...compact.map(t => t.lra ?? Infinity)).toFixed(1)}–{Math.max(...compact.map(t => t.lra ?? -Infinity)).toFixed(1)} LU. Listen for sustained bass, bright transients and layers competing for space.</p></div>{cards(compact, dynamic.length)}</section>
    <section className="library-section" aria-labelledby="shantae-title"><div className="library-section-head"><span className="library-section-label">SET 03 · UNMEASURED SOUNDTRACK</span><h2 id="shantae-title">Shantae: Half-Genie Hero OST</h2><p>32 tracks by Jake Kaufman under CC BY-NC-SA 4.0. Site-hosted copies play with your optional EQ. Mark Keep or Pass after listening. Loudness range is not yet measured.</p></div>{cards(unmeasured, dynamic.length + compact.length)}</section>
    <section className="library-method"><h2>How the groups were chosen</h2><p>The dynamic and compressed source files were checked for two-channel stereo and analyzed with FFmpeg’s EBU R128 loudness-range measurement. The Shantae tracks have not been analyzed or assigned to either measured group. The dynamic group measured at least {Math.min(...dynamic.map(t => t.lra ?? Infinity)).toFixed(1)} LU; the compressed group measured no more than {Math.max(...compact.map(t => t.lra ?? -Infinity)).toFixed(1)} LU. Peak-to-mean is the decoded file’s maximum level minus its mean level. “Compressed” is a listening-group label for lower measured loudness range, not a verified production technique. Low range can also come from limiting, arrangement, or performance; this measurement cannot prove dynamic-range compression was applied.</p><p>Measured-track previews stream source MP3 or genuine FLAC files; Shantae previews use 26 FLAC and six AAC files from the supplied album downloads, hosted by this site so optional EQ applies. The mariachi card uses Freesound’s public preview and labels its quality. Lossless FLAC is preferable for critical treble and quiet detail; converting MP3 to FLAC would not restore lost information. Start at a comfortable volume because levels differ. Each card links the source and its license or public-domain status. Attribution is required for CC BY and CC BY-SA; CC0 and public-domain recordings have no attribution requirement, though their creators are still credited here. CC BY-SA also applies to adaptations. Shantae tracks use CC BY-NC-SA 4.0, which requires noncommercial use, attribution, a license link, a notice of changes, and the same license for adaptations. “Title” and “Let’s Go Shopping” are all rights reserved and excluded.</p><h2>Using the provisional set for target tests</h2><p>Random blind tests currently draw from 20 provisional tracks while you audition this larger pool. Signed-in Keep / Pass votes guide the final 20-track set. Compare targets across different tracks and listeners, then inspect results by song before generalizing a ranking.</p><a href="/shootout" className="library-return">Return to shootout →</a></section>
  </main>;
}
