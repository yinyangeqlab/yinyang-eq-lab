"use client";
import ActivityMonitoringPanel from "@/components/activity-monitoring-panel";
import ServiceStatusPanel from "@/components/service-status-panel";
import { targetDisplayName } from "@/lib/target-labels";
import "./admin-layout.css";
import {AdminLegacyReview} from "@/components/legacy-review";
import { useCallback, useEffect, useMemo, useState } from "react";
import StatisticsArchivePanel from "@/components/statistics-archive";
import AdminReview from "@/components/admin-review";
import { moderationIndex, type ModerationEvent } from "@/lib/moderation";
import NameFilterLab from "@/components/name-filter-lab";
import { TesterInvites } from "@/components/tester-invites";
import { musicCandidates as musicTracks } from "@/lib/music-catalog";

type Target = { id: string; name: string; creator: string };
type Vote = { id: string; winnerId: string; loserId: string; voterId: string; createdAt: number; testMode: string; headphoneType: string | null; songTitle: string | null; songArtist: string | null; songAlbum: string | null; recordingId: string | null; reasonSide: string | null; reasonTags: string | null; otherReason: string | null };
type Feedback = { id: string; participantId: string; comparisonId: string; testMode: string; headphoneType: string; side: string; targetAId: string; targetBId: string; reasonTags: string; otherReason: string | null; songTitle: string | null; songArtist: string | null; songAlbum: string | null; createdAt: number; reviewStatus: string };
type OpenChoice = { id: string; participantId: string; targetAId: string; targetBId: string; result: string; testMode: string; headphoneType: string; songTitle: string | null; songArtist: string | null; songAlbum: string | null; createdAt: number };
type ListeningRun = { id: string; voterId: string; testMode: string; headphoneType: string; targetAId: string; targetBId: string; targetAName: string; targetBName: string; result: string; intervals: string; heardA: number; heardB: number; overlapSeconds: number; songTitle: string | null; songArtist: string | null; songAlbum: string | null; createdAt: number };
type ResearchMeasurement = { id: string; contributorId: string; name: string; device: string; type: string; rig: string; fit: string; driverType: string | null; nozzleDiameterMm: number | null; files: string; createdAt: number };
type PreferenceExport = { id: string; targetName: string; targetCreator: string; measurementName: string | null; exportKind: string; format: string; filename: string; contents: string; settings: string; curve: string; bands: number | null; method: string | null; priority: string | null; preamp: number | null; rms: number | null; filters: string | null; createdAt: number };
type MusicVote = { userId: string; userEmail: string; userName: string; trackUrl: string; choice: string; updatedAt: number };
type Data = { deletionTotals: { day: string; recordKind: string; deletedCount: number }[]; moderationEvents: ModerationEvent[]; votes: Vote[]; feedback: Feedback[]; targets: Target[]; openChoices: OpenChoice[]; listeningRuns: ListeningRun[]; researchMeasurements: ResearchMeasurement[]; preferenceExports: PreferenceExport[]; musicVotes: MusicVote[] };
function handle(id: string) { return `Listener ${id.replace(/-/g, "").slice(0, 16)}`; }
function songKey(row: { songTitle?: string | null; songArtist?: string | null; songAlbum?: string | null }) { return [row.songTitle || "", row.songArtist || "", row.songAlbum || ""].map(x => x.trim().toLowerCase()).join("\u001f"); }
function songLabel(row: { songTitle?: string | null; songArtist?: string | null; songAlbum?: string | null }) { return row.songTitle ? `${row.songTitle}${row.songArtist ? ` — ${row.songArtist}` : ""}${row.songAlbum ? ` · ${row.songAlbum}` : ""}` : "Track not shared"; }
function tags(value: string | null) { try { const parsed = JSON.parse(value || "[]"); return Array.isArray(parsed) ? parsed.filter(x => typeof x === "string").join(", ") : ""; } catch { return ""; } }
function ExportCurvePreview({ curve }: { curve: string }) {
  let points: [number, number][] = [];
  try { const parsed = JSON.parse(curve); if (Array.isArray(parsed)) points = parsed.filter(point => Array.isArray(point) && point.length === 2 && point.every((value: unknown) => typeof value === "number" && Number.isFinite(value))) as [number, number][]; } catch {}
  if (points.length < 2) return <span>Curve unavailable</span>;
  const low = Math.min(...points.map(point => point[1])), high = Math.max(...points.map(point => point[1]));
  const height = Math.max(1, high - low);
  const path = points.map(([hz, db]) => `${(Math.log(Math.max(20, hz) / 20) / Math.log(1000) * 150).toFixed(1)},${(46 - (db - low) / height * 40).toFixed(1)}`).join(" ");
  return <svg className="owner-export-curve" viewBox="0 0 150 52" role="img" aria-label={`Exported curve from ${low.toFixed(1)} to ${high.toFixed(1)} dB`}><line x1="0" y1="26" x2="150" y2="26" stroke="#33575b"/><polyline points={path} fill="none" stroke="#68e8d8" strokeWidth="2" vectorEffect="non-scaling-stroke"/></svg>;
}

export default function OwnerResearch() {
  const [rawData, setData] = useState<Data | null>(null);
  const data = useMemo(() => {
    if (!rawData) return null;
    const latest = moderationIndex(rawData.moderationEvents);
    const active = (kind: string, id: string) => latest.get(`${kind}:${id}`)?.action !== "remove";
    return { ...rawData, votes: rawData.votes.filter(r => active("vote", r.id)), openChoices: rawData.openChoices.filter(r => active("open", r.id)), listeningRuns: rawData.listeningRuns.filter(r => active("run", r.id)), feedback: rawData.feedback.filter(r => active("feedback", r.id)), researchMeasurements: rawData.researchMeasurements.filter(r => active("measurement", r.id)), preferenceExports: rawData.preferenceExports.filter(r => active("export", r.id)) };
  }, [rawData]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [song, setSong] = useState("");
  const [query, setQuery] = useState("");
  const [exportQuery, setExportQuery] = useState("");
  const [musicQuery, setMusicQuery] = useState("");
  const [mode, setMode] = useState("all");
  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const response = await fetch("/api/owner-research", { cache: "no-store" });
      const result = await response.json() as Data & { error?: string };
      if (!response.ok) throw new Error(result.error || "Could not load private research.");
      setData(result);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not load private research."); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);
  async function downloadFile(id: string, kind: string, name: string) {
    setError("");
    try {
      const response = await fetch(`/api/owner-research-measurement?id=${encodeURIComponent(id)}&kind=${encodeURIComponent(kind)}`, { cache: "no-store" });
      if (!response.ok) throw new Error((await response.json() as { error?: string }).error || "Could not download measurement.");
      const objectUrl = URL.createObjectURL(await response.blob());
      const link = document.createElement("a"); link.href = objectUrl; link.download = name; link.click();
      setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not download measurement."); }
  }
  function downloadRecordedExport(row: PreferenceExport) {
    const objectUrl = URL.createObjectURL(new Blob([row.contents], { type: row.format === "csv" ? "text/csv" : "text/plain" }));
    const link = document.createElement("a"); link.href = objectUrl; link.download = row.filename; link.click();
    setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
  }
  const exports = useMemo(() => (data?.preferenceExports || []).filter(row => !exportQuery || [row.targetName, row.targetCreator, row.measurementName, row.exportKind, row.format, row.filename, row.method, row.priority].join(" ").toLowerCase().includes(exportQuery.toLowerCase())).sort((a,b) => b.createdAt-a.createdAt), [data, exportQuery]);
  const musicByUrl = useMemo(() => new Map(musicTracks.map(track => [track.url, track])), []);
  const musicRows = useMemo(() => (data?.musicVotes || []).filter(row => {
    const track = musicByUrl.get(row.trackUrl);
    return !musicQuery || [row.userName, row.userEmail, track?.title, track?.artist, row.choice, row.choice === "keep" ? "upvote" : "downvote"].join(" ").toLowerCase().includes(musicQuery.toLowerCase());
  }).sort((a,b) => a.userEmail.localeCompare(b.userEmail) || a.choice.localeCompare(b.choice) || a.trackUrl.localeCompare(b.trackUrl)), [data, musicQuery, musicByUrl]);
  const name = useMemo(() => new Map(data?.targets.map(target => [target.id, target.name]) || []), [data]);
  const songs = useMemo(() => {
    const map = new Map<string, string>();
    data?.votes.forEach(row => map.set(songKey(row), songLabel(row)));
    data?.feedback.forEach(row => map.set(songKey(row), songLabel(row)));
    data?.openChoices.forEach(row => map.set(songKey(row), songLabel(row)));
    return [...map].sort((a,b) => a[1].localeCompare(b[1]));
  }, [data]);
  const filteredVotes = useMemo(() => (data?.votes || []).filter(row => (mode === "all" || row.testMode === mode) && (!song || songKey(row) === song) && (!query || [handle(row.voterId), name.get(row.winnerId), name.get(row.loserId), songLabel(row), row.otherReason].join(" ").toLowerCase().includes(query.toLowerCase()))), [data, mode, song, query, name]);
  const filteredOpen = useMemo(() => (data?.openChoices || []).filter(row => (mode === "all" || mode === "open") && (!song || songKey(row) === song) && (!query || [handle(row.participantId), name.get(row.targetAId), name.get(row.targetBId), songLabel(row)].join(" ").toLowerCase().includes(query.toLowerCase()))), [data, mode, song, query, name]);
  const standings = useMemo(() => {
    const map = new Map<string, { id: string; wins: number; losses: number; ties: number }>();
    for (const vote of filteredVotes) {
      if (!(["blind", "bring"].includes(vote.testMode))) continue;
      for (const id of [vote.winnerId, vote.loserId]) if (!map.has(id)) map.set(id, { id, wins: 0, losses: 0, ties:0 });
      map.get(vote.winnerId)!.wins++;
      map.get(vote.loserId)!.losses++;
    }
    for (const choice of filteredOpen) {
      for (const id of [choice.targetAId, choice.targetBId]) if (!map.has(id)) map.set(id, { id, wins:0, losses:0, ties:0 });
      if (choice.result === "tie") {map.get(choice.targetAId)!.ties++;map.get(choice.targetBId)!.ties++;}
      else {const winner=choice.result === "a" ? choice.targetAId : choice.targetBId, loser=choice.result === "a" ? choice.targetBId : choice.targetAId;map.get(winner)!.wins++;map.get(loser)!.losses++;}
    }
    const rate=(row:{wins:number;losses:number}) => row.wins+row.losses ? row.wins/(row.wins+row.losses) : -1;
    return [...map.values()].sort((a,b) => rate(b)-rate(a) || b.wins-a.wins || (name.get(a.id) || "").localeCompare(name.get(b.id) || ""));
  }, [filteredVotes, filteredOpen, name]);
  const choiceById = useMemo(() => new Map<string,string>([...(data?.votes || []).map(row => [row.id, name.get(row.winnerId) || row.winnerId] as [string,string]),...(data?.openChoices || []).map(row => [row.id, row.result === "tie" ? "Tie" : name.get(row.result === "a" ? row.targetAId : row.targetBId) || "Unknown"] as [string,string])]), [data,name]);
  const feedback = useMemo(() => (data?.feedback || []).filter(row => (mode === "all" || row.testMode === mode) && (!song || songKey(row) === song) && (!query || [handle(row.participantId), name.get(row.targetAId), name.get(row.targetBId), songLabel(row), row.otherReason, tags(row.reasonTags)].join(" ").toLowerCase().includes(query.toLowerCase()))).sort((a,b) => b.createdAt-a.createdAt), [data, mode, song, query, name]);
  const grouped = useMemo(() => {
    const map = new Map<string, { a?: Feedback; b?: Feedback }>();
    for (const row of feedback) { const key = `${row.participantId}|${row.comparisonId}`; const group = map.get(key) || {}; group[row.side === "a" ? "a" : "b"] = row; map.set(key, group); }
    return [...map.values()];
  }, [feedback]);
  const runs = useMemo(() => (data?.listeningRuns || []).filter(row => (mode === "all" || row.testMode === mode) && (!song || songKey(row) === song) && (!query || [handle(row.voterId), targetDisplayName(row.targetAId,row.targetAName), targetDisplayName(row.targetBId,row.targetBName), songLabel(row)].join(" ").toLowerCase().includes(query.toLowerCase()))).sort((a,b) => b.createdAt-a.createdAt), [data, mode, song, query]);
  return <main className="owner-research"><div className="owner-top"><a className="owner-back-link" href="/home" aria-label="YinYang EQ League home"><img src="/brand-avatar-aligned.webp" alt="" /> YinYang EQ League</a><nav aria-label="Main navigation"><a href="/">Welcome</a><a href="/shootout">Shootout</a><a href="/preference-tuning">Preference Tuning</a><a href="/music-library">Listening pool</a><span aria-current="page">Admin view</span></nav></div><header><h1>Private listening research</h1><p>Admin access only. Listener handles are stable labels derived from browser IDs; they are not verified identities. Audio files and raw IP addresses are not stored here.</p></header>
    {!data ? <div className="owner-login"><p>{loading ? "Loading private research…" : "Private research could not be loaded."}</p>{!loading && <button type="button" onClick={() => void load()}>Try again</button>}</div> : <>
      <nav className="admin-section-nav" aria-label="Admin sections"><a href="#site-notice">Site notice</a><a href="#submission-review">Review submissions</a><a href="#activity-monitoring">Test activity</a><a href="#legacy-review">Legacy ownership</a><a href="#protected-archive">Statistics archive</a><a href="#tester-access">Tester access</a><a href="#research-records">Research records</a><a href="#deletion-totals">Deletion totals</a></nav>
      <ServiceStatusPanel /><div id="submission-review">{rawData && <AdminReview data={rawData} reload={load} />}</div>
      <ActivityMonitoringPanel /><section id="deletion-totals" aria-label="Deletion statistics"><h2>Deletion statistics</h2><p>Private totals by UTC date and data category. Counts describe erased database records, not unique submissions or people. Linked comparison records, file chunks and admin notes are counted separately. No identity, deleted content or individual deletion history is retained here.</p><div className="owner-table-wrap"><table><thead><tr><th>UTC date</th><th>Data category</th><th>Records deleted</th></tr></thead><tbody>{[...(data.deletionTotals || [])].sort((a,b)=>b.day.localeCompare(a.day)||a.recordKind.localeCompare(b.recordKind)).map(row=><tr key={`${row.day}:${row.recordKind}`}><td>{row.day}</td><td>{row.recordKind}</td><td>{row.deletedCount}</td></tr>)}{!data.deletionTotals?.length && <tr><td colSpan={3}>No recorded deletions yet. Earlier deletions are not backfilled.</td></tr>}</tbody></table></div></section>
      <div id="legacy-review"><AdminLegacyReview /></div>
      <div id="protected-archive"><StatisticsArchivePanel /></div>
      <div id="tester-access"><TesterInvites /></div>
      <NameFilterLab />
      <section id="research-records" aria-label="Music library votes"><h2>Music library votes</h2><p>{data.musicVotes?.length || 0} current choices from {new Set((data.musicVotes || []).map(row => row.userId)).size} signed-in listeners. Only this admin view shows who chose each track.</p><label className="owner-export-search">Find a listener or track<input value={musicQuery} onChange={event => setMusicQuery(event.target.value)} placeholder="Email, name, artist, track, choice…" /></label><div className="owner-table-wrap"><table><thead><tr><th>Listener</th><th>Track</th><th>Choice</th><th>Updated</th></tr></thead><tbody>{musicRows.map(row => { const track = musicByUrl.get(row.trackUrl); return <tr key={`${row.userId}:${row.trackUrl}`}><td><strong>{row.userName}</strong>{row.userEmail && <><br />{row.userEmail}</>}</td><td>{track ? `${track.title} — ${track.artist}` : row.trackUrl}</td><td>{row.choice === "keep" ? "Upvote" : "Downvote"}</td><td>{new Date(row.updatedAt).toLocaleString()}</td></tr>; })}{!musicRows.length && <tr><td colSpan={4}>No music votes match.</td></tr>}</tbody></table></div></section>
      <section className="owner-preference-exports" aria-label="Exported preference curves and EQ files">
        <h2>Exported preference curves and EQ files</h2>
        <p>{data.preferenceExports.length} recorded downloads. Each row keeps the curve, tuning settings, and exact downloaded file. Earlier downloads were not recorded.</p>
        <label className="owner-export-search">Find an export<input value={exportQuery} onChange={event => setExportQuery(event.target.value)} placeholder="Target, headphone, format…" /></label>
        <div className="owner-table-wrap"><table><thead><tr><th>Downloaded</th><th>Target and headphone</th><th>Curve</th><th>File</th><th>Details</th></tr></thead><tbody>
          {exports.map(row => <tr key={row.id}><td>{new Date(row.createdAt).toLocaleString()}</td><td><strong>{row.targetName}</strong><br />{row.targetCreator}<br />{row.measurementName || "No headphone measurement"}</td><td><ExportCurvePreview curve={row.curve}/></td><td><strong>{row.exportKind === "eq" ? `${row.bands} band · ${row.method} · ${row.priority}` : row.exportKind === "original-target" ? "Original target" : "Preference target"}</strong><br />{row.format}{row.preamp != null ? ` · ${row.preamp.toFixed(1)} dB preamp` : ""}<br /><button type="button" onClick={() => downloadRecordedExport(row)}>Download recorded file</button></td><td><details><summary>View exact data</summary><strong>Settings</strong><pre>{row.settings}</pre><strong>Curve points</strong><pre>{row.curve}</pre>{row.filters && <><strong>EQ filters</strong><pre>{row.filters}</pre></>}<strong>Downloaded file</strong><pre>{row.contents}</pre></details></td></tr>)}
          {!exports.length && <tr><td colSpan={5}>No recorded exports match.</td></tr>}
        </tbody></table></div>
      </section>
      <div className="owner-filters"><label>Song<select value={song} onChange={event => setSong(event.target.value)}><option value="">All songs</option>{songs.map(([key,label]) => <option key={key} value={key}>{label}</option>)}</select></label><label>Mode<select value={mode} onChange={event => setMode(event.target.value)}><option value="all">All modes</option><option value="blind">Random blind</option><option value="bring">Bring your music</option><option value="open">Open comparison</option></select></label><label>Search<input value={query} onChange={event => setQuery(event.target.value)} placeholder="Listener, target, feedback…" /></label><button onClick={() => void load()} disabled={loading}>Refresh</button></div>
      <section><h2>Raw preference results</h2><p>{song ? songs.find(item => item[0] === song)?.[1] : "All songs"} · {filteredVotes.length} recorded blind votes · {filteredOpen.length} private open choices.</p><p>Sorted by win percentage (wins ÷ (wins + losses)), then total wins. Ties are excluded from the percentage. Each recorded choice counts equally, including repeat choices from the same listener. A target with 1 win out of 1 can appear above one with 9 wins out of 10.</p><p>This is a raw summary of the results matching your filters, not the official public ranking. All modes includes private Open comparisons, where target names are visible. The official ranking uses qualifying blind comparisons and accounts for opponents, repeated choices, vote weights, and uncertainty. Private Open choices never affect it.</p><div className="owner-table-wrap"><table><thead><tr><th>Order by win %</th><th>Target</th><th>Wins</th><th>Losses</th><th>Ties</th><th>Win percentage</th></tr></thead><tbody>{standings.map((row,index) => <tr key={row.id}><td>{index+1}</td><td>{name.get(row.id) || row.id}</td><td>{row.wins}</td><td>{row.losses}</td><td>{row.ties}</td><td>{row.wins+row.losses ? `${Math.round(100*row.wins/(row.wins+row.losses))}%` : "—"}</td></tr>)}</tbody></table></div></section>
      <section><h2>Comparisons and descriptions</h2><p>{grouped.length} comparisons with submitted descriptions. Free text remains pending review and appears only in this admin view.</p><div className="owner-table-wrap"><table><thead><tr><th>Date · listener</th><th>Mode · song · choice</th><th>Sample A</th><th>Sample B</th></tr></thead><tbody>{grouped.map((group,index) => { const row = group.a || group.b!; return <tr key={`${row.comparisonId}-${index}`}><td>{new Date(row.createdAt).toLocaleString()}<br />{handle(row.participantId)}</td><td>{row.testMode}<br />{songLabel(row)}<br />{choiceById.get(row.comparisonId) ? `Preferred: ${choiceById.get(row.comparisonId)}` : "No choice recorded"}</td><td className="owner-a"><strong>{name.get(row.targetAId) || row.targetAId}</strong><br />{group.a ? [tags(group.a.reasonTags),group.a.otherReason].filter(Boolean).join(" · ") : "—"}</td><td className="owner-b"><strong>{name.get(row.targetBId) || row.targetBId}</strong><br />{group.b ? [tags(group.b.reasonTags),group.b.otherReason].filter(Boolean).join(" · ") : "—"}</td></tr>; })}</tbody></table></div></section>
      <section><h2>Recorded choices</h2><div className="owner-table-wrap"><table><thead><tr><th>Date · listener</th><th>Song</th><th>Winner</th><th>Other target</th><th>Earlier vote feedback</th></tr></thead><tbody>{filteredVotes.slice().sort((a,b) => b.createdAt-a.createdAt).map(row => <tr key={row.id}><td>{new Date(row.createdAt).toLocaleString()}<br />{handle(row.voterId)}</td><td>{songLabel(row)}</td><td>{name.get(row.winnerId) || row.winnerId}</td><td>{name.get(row.loserId) || row.loserId}</td><td>{tags(row.reasonTags) || row.otherReason ? `${row.reasonSide?.toUpperCase() || "A"}: ${[tags(row.reasonTags),row.otherReason].filter(Boolean).join(" · ")}` : "—"}</td></tr>)}{filteredOpen.slice().sort((a,b) => b.createdAt-a.createdAt).map(row => <tr key={row.id}><td>{new Date(row.createdAt).toLocaleString()}<br />{handle(row.participantId)}</td><td>{songLabel(row)} · open</td><td>{row.result === "tie" ? "Tie" : name.get(row.result === "a" ? row.targetAId : row.targetBId) || "Unknown"}</td><td>{row.result === "tie" ? `${name.get(row.targetAId) || row.targetAId} / ${name.get(row.targetBId) || row.targetBId}` : name.get(row.result === "a" ? row.targetBId : row.targetAId) || "Unknown"}</td><td>—</td></tr>)}</tbody></table></div></section>
      <section><h2>Completed listening runs</h2><p>{runs.length} completed comparisons across ranked, tie, same-filter, and open tests. Segment times are relative to the selected track.</p><div className="owner-table-wrap"><table><thead><tr><th>Date · listener</th><th>Mode · song</th><th>A / B · choice</th><th>Listening</th><th>Segments (JSON)</th></tr></thead><tbody>{runs.map(row => <tr key={row.id}><td>{new Date(row.createdAt).toLocaleString()}<br />{handle(row.voterId)}</td><td>{row.testMode} · {row.headphoneType}<br />{songLabel(row)}</td><td>{targetDisplayName(row.targetAId,row.targetAName)} / {targetDisplayName(row.targetBId,row.targetBName)}<br />{row.result.toUpperCase()}</td><td>A {row.heardA.toFixed(1)}s · B {row.heardB.toFixed(1)}s<br />Overlap {row.overlapSeconds.toFixed(1)}s</td><td><details className="admin-segment-data"><summary>View playback segments</summary><pre>{row.intervals}</pre></details></td></tr>)}</tbody></table></div></section>
      <section><h2>Contributed raw measurements</h2><p>{data.researchMeasurements.length} contributions. These original files are stored privately for research; the metadata below links them to a pseudonymous listener handle.</p><div className="owner-table-wrap"><table><thead><tr><th>Date · listener</th><th>Measurement</th><th>Details</th><th>Original files</th></tr></thead><tbody>{data.researchMeasurements.slice().sort((a,b) => b.createdAt-a.createdAt).map(row => { const files = JSON.parse(row.files) as { kind: string; name: string; points: number; sha256: string }[]; return <tr key={row.id}><td>{new Date(row.createdAt).toLocaleString()}<br />{handle(row.contributorId)}</td><td>{row.name}<br />{row.device} · {row.type.toUpperCase()}</td><td>{row.rig}{row.fit ? ` · ${row.fit}` : ""}{row.driverType ? ` · ${row.driverType}` : ""}{row.nozzleDiameterMm ? ` · ${row.nozzleDiameterMm} mm nozzle` : ""}</td><td>{files.map(file => <div key={file.kind}><button type="button" onClick={() => void downloadFile(row.id, file.kind, file.name)}>Download {file.name}</button><small> {file.points} points · SHA-256 {file.sha256.slice(0, 12)}…</small></div>)}</td></tr>; })}</tbody></table></div></section>
    </>}{error && <p role="alert">{error}</p>}</main>;
}
