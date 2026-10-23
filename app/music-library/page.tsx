"use client";
import { useConsentPrompt } from "@/components/use-consent-prompt";
import { adminMusicChoices, saveAdminMusicChoice } from "@/lib/admin-test-store";

import {musicDisplayTitle,isAnalysisNote} from "@/lib/music-display";
import { Suspense, useEffect, useRef, useState } from "react";
import { musicCandidates as tracks, type MusicCandidate as Track } from "@/lib/music-catalog";
import { rankMusic, musicReview, playbackTarget, type MusicCounts } from "@/lib/music-preferences";
import { cancelMediaRecovery } from "@/lib/media-recovery";
import SongSuggestions from "@/components/song-suggestions";
import { useSearchParams } from "next/navigation";
import LibraryWavePlayer from "@/components/library-wave-player";
import LibraryEqPanel from "@/components/library-eq-panel";
import type { LibraryEq } from "@/lib/music-library-eq";
import "./style.css";

type MusicSnapshot = { testOnly?:boolean; byTrack?: MusicCounts; signedIn: boolean; totals: { keep: number; pass: number }; mine: Record<string, "keep" | "pass">; error?: string };

function licenseName(url: string) {
  if (url.includes("publicdomain/zero")) return "CC0 1.0";
  if (url.includes("publicdomain/mark")) return "Public Domain Mark 1.0";
  if (url.includes("by-sa/3.0/us")) return "CC BY-SA 3.0 US";
  if (url.includes("by-sa/2.0/fr")) return "CC BY-SA 2.0 France";
  if (url.includes("by-nc-sa/3.0/us")) return "CC BY-NC-SA 3.0 US";
  if (url.includes("by-nc-sa/4.0")) return "CC BY-NC-SA 4.0";
  if (url.includes("by-sa")) return "CC BY-SA 3.0";
  if (url.includes("by/3.0")) return "CC BY 3.0";
  return "CC BY 4.0";
}

function QueryLibraryView({onChange}:{onChange:(value:"recordings"|"suggestions")=>void}) {
  const params = useSearchParams();
  const view = params.get("view");
  useEffect(()=>onChange(view === "suggestions" ? "suggestions" : "recordings"),[view,onChange]);
  return null;
}

export default function MusicLibraryPage() {
  const consent = useConsentPrompt("Browsing the library needs no agreement. Rating a song is saved with your account choices, so we ask once, here.");
  const [libraryView,setLibraryView] = useState<"recordings"|"suggestions">("recordings");
  const [suggestionsOpened,setSuggestionsOpened] = useState(false);
  useEffect(()=>{if(libraryView === "suggestions")setSuggestionsOpened(true);},[libraryView]);
  const [active, setActive] = useState<number | null>(null);
  const [decisions, setDecisions] = useState<Record<string, "keep" | "pass">>({});
  const [ready, setReady] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [byTrack, setByTrack] = useState<MusicCounts>({});
  const [totals, setTotals] = useState({ keep: 0, pass: 0 });
  const [saving, setSaving] = useState<string | null>(null);
  const [voteMessage, setVoteMessage] = useState("");
  const [adminTestOnly,setAdminTestOnly]=useState(false);
  const [votesLoaded, setVotesLoaded] = useState(false);
  const [legacy, setLegacy] = useState<Record<string, "keep" | "pass"> | null>(null);
  const [filter, setFilter] = useState<"all" | "unrated" | "keep" | "pass" | "review">("unrated");
  const [query, setQuery] = useState("");
  const [familyLimit, setFamilyLimit] = useState(12);
  const [reveal, setReveal] = useState<{ index: number } | null>(null);
  const [activePlaying, setActivePlaying] = useState(false);
  const activeAudio = useRef<HTMLAudioElement | null>(null);
  const PAGE_SIZE = 12;
  const [eq, setEq] = useState<LibraryEq | null>(null);
  const root = useRef<HTMLElement>(null);
  const [matchLoudness, setMatchLoudness] = useState(true);
  const families = new Map<string, Track[]>();
  tracks.forEach(track => { const key = track.songFamily || track.url; const versions = families.get(key) ?? []; versions.push(track); families.set(key, versions); });
  const ranked = rankMusic(tracks.filter(t => (byTrack[t.url]?.keep ?? 0) + (byTrack[t.url]?.pass ?? 0) > 0), byTrack);
  const groupRank = (track: Track) => { const index = ranked.findIndex(t => t.url === track.url); return index < 0 ? null : index + 1; };
  const newCount = tracks.filter(track => !decisions[track.url]).length;
  useEffect(() => {
    let cancelled = false;
    async function loadVotes() {
      try {
        const response = await fetch("/api/music-votes", { cache: "no-store" });
        const result = await response.json() as MusicSnapshot;
        if (!response.ok) throw new Error(result.error || "Could not load music votes.");
        if (cancelled) return;
        setVotesLoaded(true);
        setSignedIn(result.signedIn === true);
        setTotals(result.totals);
        setByTrack(result.byTrack ?? {});
        setAdminTestOnly(result.testOnly===true);
    setDecisions(result.testOnly?adminMusicChoices():result.mine);
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
    if(adminTestOnly){setDecisions(saveAdminMusicChoice(trackUrl,choice));setVoteMessage("Private test rating saved locally. Community rankings are unchanged.");return;}
    const response = await fetch("/api/music-votes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ trackUrl, choice }), cache: "no-store" });
    const result = await response.json() as MusicSnapshot;
    if (!response.ok) throw new Error(result.error || "Could not save music vote.");
    setDecisions(result.mine);
    setTotals(result.totals);
        setByTrack(result.byTrack ?? {});
    localStorage.setItem("target-lab-music-shortlist-v1", JSON.stringify(result.mine));
  }
  async function decide(track: Track, value: "keep" | "pass") { await consent.ask(() => void runDecide(track, value)); }
  async function runDecide(track: Track, value: "keep" | "pass") {
    if (!signedIn) { setVoteMessage("Sign in to submit a music vote."); return; }
    setSaving(track.url); setVoteMessage("");
    try { await saveVote(track.url, decisions[track.url] === value ? null : value); }
    catch (error) { setVoteMessage(error instanceof Error ? error.message : "Could not save music vote."); }
    finally { setSaving(null); }
  }
  async function submitMany(source: Record<string, "keep" | "pass">) { await consent.ask(() => void runSubmitMany(source)); }
  async function runSubmitMany(source: Record<string, "keep" | "pass">) {
    if (!signedIn) { setVoteMessage("Sign in to submit music votes."); return; }
    setSaving("import"); setVoteMessage("");
    let count = 0;
    try {
      for (const [trackUrl, choice] of Object.entries(source)) { await saveVote(trackUrl, choice); count++; }
      setLegacy(null);
      setVoteMessage(adminTestOnly?`${count} private test choices saved locally; community ranks unchanged.`:`Submitted ${count} music choices.`);
    } catch (error) { setVoteMessage(`${count} choices submitted. ${error instanceof Error ? error.message : "The rest could not be saved."}`); }
    finally { setSaving(null); }
  }
  function playOnly(index: number, playing: HTMLAudioElement) {
    setActive(index);
    setActivePlaying(true);
    activeAudio.current = playing;
    root.current?.querySelectorAll("audio").forEach(audio => { if (audio !== playing) { cancelMediaRecovery(audio); audio.pause(); } });
  }
  function matchesTrack(track: Track) {
    const term=query.trim().toLocaleLowerCase();
    return (filter === "all" || (filter === "review" ? musicReview(byTrack[track.url]).flagged : filter === "unrated" ? !decisions[track.url] : decisions[track.url] === filter)) && (!term || [track.title,track.artist,track.genre,track.focus].some(value=>value.toLocaleLowerCase().includes(term)));
  }
  const familyEntries = [...families.entries()];
  const matchingFamilies = familyEntries.filter(([, versions]) => versions.some(matchesTrack));
  const visibleCount = tracks.filter(matchesTrack).length;
  const pageFamilies = matchingFamilies.slice(0, familyLimit);
  const pageKeys = new Set(pageFamilies.map(([key]) => key));
  const visibleUrls = new Set(pageFamilies.flatMap(([, versions]) => versions.filter(matchesTrack).map(track => track.url)));
  const remainingFamilies = Math.max(0, matchingFamilies.length - pageFamilies.length);
  const activeTrack = active === null ? null : tracks[active];
  const activeOffPage = !!activeTrack && !visibleUrls.has(activeTrack.url);
  function showTrack(track: Track) {
    const familyIndex = familyEntries.findIndex(([, versions]) => versions.some(version => version.url === track.url));
    setQuery(""); setFilter("all"); setFamilyLimit(Math.max(PAGE_SIZE, Math.ceil((familyIndex + 1) / PAGE_SIZE) * PAGE_SIZE));
    setReveal({ index: tracks.indexOf(track) });
  }
  useEffect(() => {
    const match = /^#candidate-(\d+)$/.exec(window.location.hash);
    const index = match ? Number(match[1]) - 1 : -1;
    if (Number.isInteger(index) && index >= 0 && index < tracks.length) showTrack(tracks[index]);
  }, []);
  useEffect(() => {
    if (reveal) document.getElementById(`candidate-${reveal.index + 1}`)?.scrollIntoView({ block: "center" });
  }, [reveal]);
  const loadMore = <div className="library-load-more"><p role="status">Showing {visibleUrls.size} of {visibleCount} matching recordings · {pageFamilies.length} of {matchingFamilies.length} songs</p>{remainingFamilies > 0 ? <button type="button" onClick={() => setFamilyLimit(limit => limit + PAGE_SIZE)}>Load {Math.min(PAGE_SIZE, remainingFamilies)} more songs <span aria-hidden="true">↓</span></button> : !!visibleCount && <span className="library-list-end">You’re up to date with these results.</span>}</div>;
  function cards(group: Track[]) {
    const visible = group.map(track => ({track,index:tracks.indexOf(track)})).filter(({track,index})=>visibleUrls.has(track.url) || index === active);
    return visible.length ? <div className="library-versions">{visible.map(({ track, index }) => <article hidden={!visibleUrls.has(track.url)} id={`candidate-${index + 1}`} className={`library-track ${active === index ? "is-active" : ""}`} key={track.url}>
      <div className="library-recording-heading"><span className="library-number">{String(index + 1).padStart(2, "0")}</span><div><h3>{musicDisplayTitle(track.title)}</h3><p className="library-artist">{track.artist}</p><p className="library-version-label">{track.versionLabel || "Released recording"}</p><span className="library-genre">{track.genre}</span>{!decisions[track.url] && <span className="library-fresh">Undecided</span>}</div></div>
      <div className="library-recording-audio">      {track.fileUrl ? <LibraryWavePlayer active={active === index} track={{ title: track.versionLabel ? `${musicDisplayTitle(track.title)} · ${track.versionLabel}` : musicDisplayTitle(track.title), artist: track.artist, fileUrl: track.fileUrl, duration: track.duration, integrated_lufs: track.integrated_lufs }} matchLoudness={matchLoudness} targetLufs={playbackTarget(group)} onPlay={audio => playOnly(index, audio)} onPause={audio => { if (activeAudio.current === audio) setActivePlaying(false); }} eq={eq} /> : <iframe className="library-bandcamp-player" title={`Listen to ${musicDisplayTitle(track.title)} by ${track.artist}`} src={`https://bandcamp.com/EmbeddedPlayer/track=${track.playerId}/size=large/bgcol=1b222b/linkcol=55d5c5/tracklist=false/artwork=none/transparent=true/`} loading="lazy" allow="autoplay" />}
      <div className="library-track-meta"><span>{track.lra === undefined ? "LRA not measured" : `${track.lra.toFixed(1)} LU LRA`}</span>{track.crest_db !== undefined && <span>Peak-to-mean {track.crest_db.toFixed(1)} dB</span>}{track.bitrate_kbps !== undefined && <span>{track.bitrate_kbps} kbps {track.filename?.split(".").pop()?.toUpperCase() || "audio"}</span>}{track.playerId && !track.fileUrl ? <span>Bandcamp stream · EQ unavailable</span> : <span>Stereo{track.localOnly ? ` · ${track.filename?.split(".").pop()?.toUpperCase()}` : ""}{track.playerId ? ` · ${track.filename?.endsWith(".flac") ? "FLAC" : track.filename?.endsWith(".m4a") ? "AAC" : "MP3"} · EQ ready` : ""}</span>}</div>
</div>
      <div className="library-recording-rating">      <div className="library-decision" role="group" aria-label={`Decision for ${musicDisplayTitle(track.title)}${track.versionLabel ? ` · ${track.versionLabel}` : ""}`}><button type="button" disabled={!ready || saving !== null} className={decisions[track.url] === "keep" ? "chosen keep" : ""} aria-pressed={decisions[track.url] === "keep"} onClick={() => void decide(track, "keep")}>Upvote</button><button type="button" disabled={!ready || saving !== null} className={decisions[track.url] === "pass" ? "chosen pass" : ""} aria-pressed={decisions[track.url] === "pass"} onClick={() => void decide(track, "pass")}>Downvote</button></div>
      <p className="library-music-rank">{groupRank(track) ? `Preference #${groupRank(track)} · ` : "Not ranked yet · "}{byTrack[track.url]?.keep ?? 0} Upvotes / {byTrack[track.url]?.pass ?? 0} Downvotes · {musicReview(byTrack[track.url]).total} account rating{musicReview(byTrack[track.url]).total===1?"":"s"}</p>
{musicReview(byTrack[track.url]).flagged && <p className="library-review-flag">Marked for review · still in random playback</p>}</div>
      <div className="library-recording-footer"><details className="library-recording-details"><summary>Notes &amp; credits</summary><p className="library-focus"><strong>Listen for</strong> {isAnalysisNote(track.focus) ? "Compare tone, vocal clarity, bass weight and changes between quiet and loud passages." : track.focus}</p>{isAnalysisNote(track.focus) && <p>Provisional audio analysis: {track.focus} This is separate from the community rating review flag.</p>}<p>{({dense_flattened:"Dense / flattened peaks",preserved_peaks:"Preserved peaks",exceptional_dynamics:"Exceptional dynamics"} as Record<string,string>)[track.dynamicsCategory || ""] || "Peak-contrast classification pending"}</p>      <p className="library-credit">“{musicDisplayTitle(track.title)}” by {track.artist}{track.album && track.album !== "-" && track.album !== "Single" ? `, from ${track.album}` : ""}. {track.credits && `${track.credits} `}<a href={track.sourceUrl || track.url} target="_blank" rel="noreferrer">{track.playerId ? "Source and track license" : "Source and download"}</a> · {track.permissionOnly ? <span>Used with permission · All rights reserved. This permission does not grant visitors a license to reuse or redistribute the music</span> : <a href={track.license} target="_blank" rel="noreferrer">{licenseName(track.license)}</a>}. {track.previewNote || "Original audio, no edits."}{track.playerId && " Noncommercial sharing is allowed with credit and a license link; indicate changes, and license adaptations under CC BY-NC-SA 4.0."}</p>
</details><div className="library-source-links"><a href={track.sourceUrl || track.url} target="_blank" rel="noreferrer">Source ↗</a>{track.permissionOnly ? <span>Used with permission · All rights reserved</span> : <a href={track.license} target="_blank" rel="noreferrer">{licenseName(track.license)}</a>}</div></div>
    </article>)}</div> : <p className="library-empty">No tracks match this filter in this group.</p>;
  }
  return <main className="library-page" ref={root}><Suspense fallback={null}><QueryLibraryView onChange={setLibraryView}/></Suspense>
    <header className="library-header"><a href="/home" className="library-back" aria-label="YinYang EQ home"><img src="/brand-avatar-aligned.webp" alt="" /> YinYang EQ</a><nav className="library-nav" aria-label="Main navigation"><a href="/">Welcome</a><a href="/shootout">Tournament</a><a href="/preference-tuning">Preference Tuning</a><span aria-current="page">Listening Pool</span></nav></header>
    {adminTestOnly&&<p className="admin-test-notice" role="status">Private Test Mode · song ratings are saved only in this browser and never affect community rankings.</p>}<section className="library-hero"><div className="library-kicker">MUSIC USED UNDER LICENSE OR WITH PERMISSION</div><h1>Music library</h1><p>Find music for comparisons, explore recordings, or suggest a song.</p><details className="library-pool-explainer"><summary>About the listening pool</summary><p>Explore the music used in Personal Tournament, Blind Research and Open Comparison. Every eligible song stays in the pool, regardless of votes or review flags. Alternate masters are grouped by song; vocal and instrumental mixes are labeled separately. Use Your Music plays a file from your device.</p></details><div className="library-counts"><span><strong>{tracks.length}</strong> versions</span><span><strong>{families.size}</strong> songs</span><span><strong>{newCount}</strong> undecided</span></div></section>
    <nav className="library-view-tabs" aria-label="Music library sections"><button type="button" aria-pressed={libraryView === "recordings"} onClick={()=>setLibraryView("recordings")}>Listening pool</button><button type="button" aria-pressed={libraryView === "suggestions"} onClick={()=>setLibraryView("suggestions")}>Song suggestions</button></nav>
    <div hidden={libraryView !== "recordings"}>
    <div className="library-option-groups"><details className="library-option"><summary>Listening EQ <span>{eq ? "On" : "Off · optional"}</span></summary><LibraryEqPanel onChange={setEq} /></details><details className="library-option"><summary>Community song ratings <span>Top 10 &amp; method</span></summary>    <section className="library-shortlist" aria-label="Listening pool preferences"><div><span className="library-section-label">COMMUNITY SONG RATINGS</span><h2>Top 10 preferred</h2><p>The community’s highest-rated versions so far. Early rankings can change as more people vote. This list never changes which songs play or how often you hear them.</p></div>
    {ranked.length ? <ol className="library-top-ten">{ranked.slice(0,10).map(track => <li key={track.url}><a href={`#candidate-${tracks.indexOf(track)+1}`} onClick={event => { event.preventDefault(); showTrack(track); }}>{musicDisplayTitle(track.title)} · {track.artist}{track.versionLabel ? ` · ${track.versionLabel}` : ""}</a><small>{byTrack[track.url].keep} up / {byTrack[track.url].pass} down · {musicReview(byTrack[track.url]).total} account rating{musicReview(byTrack[track.url]).total===1?"":"s"}</small></li>)}</ol> : <p>{!ready ? "Loading community preferences…" : !votesLoaded ? "Community preferences could not be loaded." : "No ratings yet. The top 10 will appear as people vote."}</p>}
    <p>All participant accounts · {totals.keep} upvotes · {totals.pass} downvotes. Each signed-in account has one current rating per version. Change or undo your vote anytime.</p>
    <p>Once 50 different participant accounts have rated a version, consistently low ratings can mark it for review. It stays in the pool and plays just as often—nothing is removed or played less because of votes.</p>
    <details className="library-preference-method"><summary>How preferences and random playback work</summary><p>Each signed-in account has one current rating per version. Rankings use (Upvotes + 1) / (Upvotes + Downvotes + 2), with more upvotes breaking ties. This softens the effect of a few early votes; it does not make an early ranking conclusive.</p><p>Review starts at 50 current ratings from different accounts for that version. A version is marked when the upper end of its 95% Wilson confidence interval is below 40% approval. This is a prompt for human review, not an automatic removal.</p><p>Random playback shuffles all eligible songs once per cycle and chooses one version at random within each song. Songs with alternate masters do not get extra turns. Your ratings, the top 10 and review marks never change these odds. Use Your Music plays your chosen file; to rate a pool version there, match the exact recording first.</p></details>
</section></details></div>
    <div className="library-browse-controls">    <div className="library-loudness"><label><input type="checkbox" checked={matchLoudness} onChange={event => setMatchLoudness(event.target.checked)} /> Match playback loudness</label><small>−16 LUFS integrated · fixed gain only; peak safety may lower a song family’s shared target</small></div>
    <div className="library-actions"><input className="library-search" type="search" aria-label="Search listening pool" placeholder="Search genre, artist, or song" value={query} onChange={event => { setQuery(event.target.value); setFamilyLimit(PAGE_SIZE); }} /><select aria-label="Filter recordings" value={filter} onChange={event => { setFilter(event.target.value as typeof filter); setFamilyLimit(PAGE_SIZE); }}><option value="unrated">Undecided ({newCount})</option><option value="all">Entire pool ({tracks.length})</option><option value="keep">Upvoted only</option><option value="pass">Downvoted only</option><option value="review">Flagged for review</option></select></div>
    {legacy && <p role="status">This browser has {Object.keys(legacy).length} older choices. <button type="button" disabled={saving !== null} onClick={() => void submitMany(legacy)}>Submit saved browser choices</button></p>}{voteMessage && <p role="status">{voteMessage}</p>}</div>
    <section className="library-section"><div className="library-section-head"><h2 id="library-results-heading">Recordings</h2><p>Each version has its own rating and measured characteristics. Alternate masters can occupy different dynamics categories. Search and filters cover the entire library. Your active recording keeps playing as you browse.</p></div>{!visibleCount&&<div className="library-empty"><p>No recordings match your search and filter.</p><button type="button" onClick={()=>{setQuery("");setFilter("all");setFamilyLimit(PAGE_SIZE);}}>Clear search and show entire pool</button></div>}{activeOffPage && <aside className="library-active-player" aria-label="Playback outside current results"><div><strong>{activePlaying ? "Still playing" : "Paused"} · {musicDisplayTitle(activeTrack!.title)}</strong><small>{activeTrack!.artist} · outside the current results. Playback position is kept.</small></div><button type="button" onClick={() => { const audio = activeAudio.current; if (!audio) return; if (audio.paused) void audio.play().catch(() => setVoteMessage("Playback could not resume. Open the track and try Play.")); else audio.pause(); }}>{activePlaying ? "Pause track" : "Resume track"}</button><button type="button" onClick={() => showTrack(activeTrack!)}>Show track</button></aside>}<div className="library-grid">{familyEntries.map(([key, versions]) => {
      if (!pageKeys.has(key) && !versions.some(track => tracks.indexOf(track) === active)) return null;
      return <div hidden={!pageKeys.has(key)} className={`library-family ${versions.length > 1 ? "has-versions" : ""}`} key={key}>{versions.length > 1 && <div className="library-family-heading"><h3>{musicDisplayTitle(versions[0].title)} · {versions.length} versions</h3><p>{versions[0].artist} · {versions.some(t => t.songFamily === "jmhbm-dreams") ? "Same performance, alternate mastering" : "Vocal / instrumental arrangement comparison"}</p></div>}{cards(versions)}</div>;
    })}</div>{loadMore}</section>
    <section className="library-method"><h2>Dynamics measurements</h2><p>The three provisional categories are dense / flattened peaks, preserved peaks, and exceptional dynamics. They use loud-passage crest, peak-to-short-term-loudness contrast and repeated high-peak plateaus, rather than integrated loudness or LRA alone. Borderline cases and recordings awaiting this analysis remain unclassified and eligible. A category does not prove how a recording was mastered or establish its sound quality.</p><p>Loudness matching applies constant gain without compression or limiting when EQ is off. A shared song-family target may fall below −16 LUFS to leave 1 dB of true-peak headroom; the player shows the actual target. Optional EQ retains its existing protective processing and changes the signal. Original downloads remain unchanged. Source and license links accompany each version.</p><a href="/shootout" className="library-return">Return to listening →</a></section>
  </div><div hidden={libraryView !== "suggestions"}>{activeTrack && <aside className="library-active-player" aria-label="Current library playback"><div><strong>{activePlaying ? "Playing" : "Paused"} · {musicDisplayTitle(activeTrack.title)}</strong><small>{activeTrack.artist} · playback position is kept.</small></div><button type="button" onClick={()=>{const audio=activeAudio.current;if(!audio)return;if(audio.paused)void audio.play().catch(()=>setVoteMessage("Playback could not resume. Open the track and try Play."));else audio.pause();}}>{activePlaying ? "Pause track" : "Resume track"}</button><button type="button" onClick={()=>{setLibraryView("recordings");showTrack(activeTrack);}}>Show recording</button></aside>}{suggestionsOpened && <SongSuggestions testOnly={adminTestOnly} ready={ready && votesLoaded} />}</div>
  {consent.dialog}
  </main>;
}
