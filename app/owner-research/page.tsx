"use client";
import TargetRemovalPanel from "@/components/target-removal-panel";
import CommunityPilotPanel from "@/components/community-pilot-panel";
import RankingChangeLog from "@/components/ranking-change-log";
import AdminPageHeader from "@/components/admin-page-header";
import YinYangAccountPanel from "@/components/yinyangeq-account-panel";
import TestAccountControls from "@/components/test-account-controls";
import AdminTestPanel from "@/components/admin-test-panel";
import ActivityMonitoringPanel from "@/components/activity-monitoring-panel";
import EarPracticeLeaderboard from "@/components/ear-practice-leaderboard";
import ServiceStatusPanel from "@/components/service-status-panel";
import { targetDisplayName } from "@/lib/target-labels";
import "./admin-layout.css";
import {AdminLegacyReview} from "@/components/legacy-review";
import { AdminBrowserOwnershipProof } from "@/components/browser-ownership-proof";
import { useCallback, useEffect, useMemo, useState } from "react";
import StatisticsArchivePanel from "@/components/statistics-archive";
import AdminReview from "@/components/admin-review";
import { AdminTable, adminDate, identityColumns, type SubmissionIdentity } from "@/components/admin-table";
import { moderationIndex, type ModerationEvent } from "@/lib/moderation";
import NameFilterLab from "@/components/name-filter-lab";
import { TesterInvites } from "@/components/tester-invites";
import { listeningPool, musicCandidates as musicTracks } from "@/lib/music-catalog";

type Target = SubmissionIdentity & { id: string; name: string; creator: string; status?: string; createdAt?: number | null; curveKind?: string; submissionKind?: string; headphoneType?: string | null };
type Vote = SubmissionIdentity & { id: string; winnerId: string; loserId: string; voterId: string; createdAt: number; testMode: string; headphoneType: string | null; songTitle: string | null; songArtist: string | null; songAlbum: string | null; recordingId: string | null; reasonSide: string | null; reasonTags: string | null; otherReason: string | null };
type Feedback = SubmissionIdentity & { id: string; participantId: string; comparisonId: string; testMode: string; headphoneType: string; side: string; targetAId: string; targetBId: string; reasonTags: string; otherReason: string | null; songTitle: string | null; songArtist: string | null; songAlbum: string | null; createdAt: number; reviewStatus: string };
type OpenChoice = SubmissionIdentity & { id: string; participantId: string; targetAId: string; targetBId: string; result: string; testMode: string; headphoneType: string; songTitle: string | null; songArtist: string | null; songAlbum: string | null; createdAt: number };
type ListeningRun = SubmissionIdentity & { id: string; voterId: string; testMode: string; headphoneType: string; targetAId: string; targetBId: string; targetAName: string; targetBName: string; result: string; intervals: string; heardA: number; heardB: number; overlapSeconds: number; songTitle: string | null; songArtist: string | null; songAlbum: string | null; createdAt: number };
type ResearchMeasurement = SubmissionIdentity & { id: string; contributorId: string; name: string; device: string; type: string; rig: string; fit: string; driverType: string | null; nozzleDiameterMm: number | null; files: string; createdAt: number };
type PreferenceExport = SubmissionIdentity & { id: string; targetName: string; targetCreator: string; measurementName: string | null; exportKind: string; format: string; filename: string; contents: string; settings: string; curve: string; bands: number | null; method: string | null; priority: string | null; preamp: number | null; rms: number | null; filters: string | null; createdAt: number };
type MusicVote = SubmissionIdentity & { userId: string; userName: string; trackUrl: string; choice: string; updatedAt: number };
type SongSuggestion = SubmissionIdentity & { id: string; title: string; artist: string; album: string; note: string; createdAt: number };
type ResearchChoice = SubmissionIdentity & {
  id: string; targetAId: string; targetBId: string; result: string | null; phase: string; recordingId: string; createdAt: number | null;
};
type Data = { songSuggestions: SongSuggestion[]; personalChoices: ResearchChoice[]; communityChoices: ResearchChoice[]; referenceChoices: ResearchChoice[]; deletionTotals: { day: string; recordKind: string; deletedCount: number }[]; moderationEvents: ModerationEvent[]; votes: Vote[]; feedback: Feedback[]; targets: Target[]; openChoices: OpenChoice[]; listeningRuns: ListeningRun[]; researchMeasurements: ResearchMeasurement[]; preferenceExports: PreferenceExport[]; musicVotes: MusicVote[] };
const newest = <T extends { createdAt?: number | null; id: string }>(a: T, b: T) => (b.createdAt ?? 0) - (a.createdAt ?? 0) || a.id.localeCompare(b.id);
const latestFirst = { key: "date", descending: true };
const byId = <T extends { id: string }>(row: T) => row.id;
const songColumns = [
  { key: "song", label: "Song", value: (row: { songTitle: string | null }) => row.songTitle || "Track not shared" },
  { key: "artist", label: "Artist", value: (row: { songArtist: string | null }) => row.songArtist },
  { key: "album", label: "Album", value: (row: { songAlbum: string | null }) => row.songAlbum },
];
const recordColumn = { key: "record", label: "Record ID", value: byId, render: (row: { id: string }) => <code className="admin-id">{row.id}</code> };
const descriptions = (row?: Feedback) => row ? [tags(row.reasonTags), row.otherReason].filter(Boolean).join(" · ") : "";
function measurementFiles(value: string) {
  try {
    const files = JSON.parse(value) as { kind: string; name: string; points: number; sha256: string }[];
    return Array.isArray(files) ? files : [];
  } catch { return []; }
}
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
  // eslint-disable-next-line react-hooks/set-state-in-effect -- Bootstrap external browser/server state and expose loading or reset feedback before asynchronous completion.
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
  const recordings = useMemo(() => new Map(listeningPool.map(track => [track.filename, track])), []);
  const musicByUrl = useMemo(() => new Map(musicTracks.map(track => [track.url, track])), []);
  const name = useMemo(() => new Map(data?.targets.map(target => [target.id, target.name]) || []), [data]);
  const songs = useMemo(() => {
    const map = new Map<string, string>();
    data?.votes.forEach(row => map.set(songKey(row), songLabel(row)));
    data?.feedback.forEach(row => map.set(songKey(row), songLabel(row)));
    data?.openChoices.forEach(row => map.set(songKey(row), songLabel(row)));
    return [...map].sort((a,b) => a[1].localeCompare(b[1]));
  }, [data]);
  const inScope = useCallback((row: { testMode: string; songTitle: string | null; songArtist: string | null; songAlbum: string | null }) =>
    (mode === "all" || row.testMode === mode) && (!song || songKey(row) === song), [mode, song]);
  const filteredVotes = useMemo(() => (data?.votes ?? []).filter(inScope), [data, inScope]);
  const filteredOpen = useMemo(() => (data?.openChoices ?? []).filter(inScope), [data, inScope]);
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
  const grouped = useMemo(() => {
    const map = new Map<string, { id: string; row: Feedback; a?: Feedback; b?: Feedback }>();
    for (const row of (data?.feedback ?? []).filter(inScope).sort(newest)) {
      const id = JSON.stringify([row.accountId ?? null, row.participantId, row.comparisonId]);
      const group = map.get(id) ?? { id, row };
      const side = row.side === "a" ? "a" : "b";
      group[side] ??= row;
      map.set(id, group);
    }
    return [...map.values()].map(group => ({ ...group.row, ...group, id: group.id }));
  }, [data, inScope]);
  const runs = useMemo(() => (data?.listeningRuns ?? []).filter(inScope).sort(newest), [data, inScope]);
  const target = (id: string) => name.get(id) || id;
  const choices = [
    ...filteredVotes.map(row => ({
      ...row, key: `vote:${row.id}`, winner: target(row.winnerId), other: target(row.loserId),
      description: [tags(row.reasonTags), row.otherReason].filter(Boolean).join(" · "),
    })),
    ...filteredOpen.map(row => ({
      ...row, key: `open:${row.id}`, winner: row.result === "tie" ? "Tie" : target(row.result === "a" ? row.targetAId : row.targetBId),
      other: row.result === "tie" ? `${target(row.targetAId)} / ${target(row.targetBId)}` : target(row.result === "a" ? row.targetBId : row.targetAId),
      description: "",
    })),
  ].sort((a, b) => newest(a, b) || a.key.localeCompare(b.key));
  const reviewCount = data ? data.votes.length + data.openChoices.length + data.feedback.length + data.listeningRuns.length + data.researchMeasurements.length + data.preferenceExports.length : 0;

  return <main className="owner-research">
    <AdminPageHeader />
    <header>
      <h1>Research admin</h1>
      <p>Review submissions, investigate activity and manage site controls. Username shows the current account nickname when available. Browser IDs help group records and do not verify ownership.</p>
    </header>
    {error && <p role="alert">{error}</p>}
    {!data ? <div className="owner-login">
      <p>{loading ? "Loading private research…" : "Private research could not be loaded."}</p>
      {!loading && <button type="button" onClick={() => void load()}>Try again</button>}
    </div> : <>
      <nav className="admin-section-nav" aria-label="Admin sections">
        <a href="#submission-review">Review submissions</a>
        <a href="#research-records">Research records</a>
        <a href="#music-records">Music</a>
        <a href="#target-submissions">Targets</a>
        <a href="#activity-monitoring">Test activity</a>
        <a href="#site-notice">Site notice</a>
        <a href="#admin-tools">More tools</a>
      </nav>
      <div className="admin-workbench-meta">
        <span>{reviewCount.toLocaleString()} active records in submission review</span>
        <span>{data.songSuggestions.length.toLocaleString()} song suggestions</span>
        <button type="button" onClick={() => void load()} disabled={loading}>{loading ? "Refreshing…" : "Refresh records"}</button>
      </div>
      <div id="submission-review">{rawData && <AdminReview data={rawData} reload={load} />}</div>
      <section id="research-records" aria-label="Listening research">
        <h2>Listening research</h2>
        <p>Song and mode apply to the next four tables. Each table has its own keyword filters.</p>
        <div className="owner-filters">
          <label>Song<select value={song} onChange={event => setSong(event.target.value)}>
            <option value="">All songs</option>
            {songs.map(([key,label]) => <option key={key} value={key}>{label}</option>)}
          </select></label>
          <label>Mode<select value={mode} onChange={event => setMode(event.target.value)}>
            <option value="all">All modes</option>
            <option value="blind">Random blind</option>
            <option value="bring">Bring your music</option>
            <option value="open">Open comparison</option>
          </select></label>
        </div>
        <h3>Raw preference results</h3>
        <p>{filteredVotes.length} recorded blind votes · {filteredOpen.length} private open choices. Win percentage excludes ties. Every recorded choice counts equally here, including repeated choices. Official rankings use qualifying blind comparisons and account for opponents, repeat choices, vote weights and uncertainty.</p>
        <AdminTable label="Raw preference results" rows={standings} rowKey={byId} columns={[
          { key: "target", label: "Target", value: row => target(row.id), search: byId },
          { key: "wins", label: "Wins", value: row => row.wins },
          { key: "losses", label: "Losses", value: row => row.losses },
          { key: "ties", label: "Ties", value: row => row.ties },
          { key: "rate", label: "Win percentage", value: row => row.wins + row.losses ? 100 * row.wins / (row.wins + row.losses) : null,
            render: row => row.wins + row.losses ? `${Math.round(100 * row.wins / (row.wins + row.losses))}%` : "—",
            search: row => row.wins + row.losses ? `${Math.round(100 * row.wins / (row.wins + row.losses))}%` : null },
        ]} />
        <h3>Comparisons and descriptions</h3>
        <AdminTable label="Comparisons and descriptions" rows={grouped} rowKey={byId} initialSort={latestFirst} columns={[
          adminDate("Submitted", (row: { createdAt?: number | null }) => row.createdAt), ...identityColumns<Feedback>(), ...songColumns,
          { key: "mode", label: "Mode", value: row => row.testMode },
          { key: "choice", label: "Choice", value: row => choiceById.get(row.comparisonId) ?? "No choice recorded" },
          { key: "a", label: "Sample A", value: row => target(row.targetAId), search: row => descriptions(row.a),
            render: row => <><strong>{target(row.targetAId)}</strong><br />{descriptions(row.a) || "—"}</> },
          { key: "b", label: "Sample B", value: row => target(row.targetBId), search: row => descriptions(row.b),
            render: row => <><strong>{target(row.targetBId)}</strong><br />{descriptions(row.b) || "—"}</> },
          { key: "comparison", label: "Comparison ID", value: row => row.comparisonId, render: row => <code className="admin-id">{row.comparisonId}</code> },
        ]} />
        <h3>Recorded choices</h3>
        <AdminTable label="Recorded choices" rows={choices} rowKey={row => row.key} initialSort={latestFirst} columns={[
          adminDate("Submitted", (row: { createdAt?: number | null }) => row.createdAt), ...identityColumns<Vote | OpenChoice>(), ...songColumns,
          { key: "mode", label: "Mode", value: row => row.testMode },
          { key: "winner", label: "Winner", value: row => row.winner },
          { key: "other", label: "Other target", value: row => row.other },
          { key: "feedback", label: "Earlier vote feedback", value: row => row.description },
          recordColumn,
        ]} />
        <h3>Completed listening runs</h3>
        <AdminTable label="Completed listening runs" rows={runs} rowKey={byId} initialSort={latestFirst} columns={[
          adminDate<ListeningRun>("Completed", row => row.createdAt), ...identityColumns<ListeningRun>(), ...songColumns,
          { key: "mode", label: "Mode", value: row => row.testMode },
          { key: "headphone", label: "Headphone type", value: row => row.headphoneType },
          { key: "a", label: "Sample A", value: row => targetDisplayName(row.targetAId,row.targetAName) },
          { key: "b", label: "Sample B", value: row => targetDisplayName(row.targetBId,row.targetBName) },
          { key: "result", label: "Choice", value: row => row.result.toUpperCase() },
          { key: "heardA", label: "A seconds", value: row => row.heardA },
          { key: "heardB", label: "B seconds", value: row => row.heardB },
          { key: "overlap", label: "Overlap seconds", value: row => row.overlapSeconds },
          recordColumn,
          { key: "segments", label: "Playback segments", render: row => <details className="admin-segment-data"><summary>View</summary><pre>{row.intervals}</pre></details> },
        ]} />
      </section>
      <section id="music-records">
        <h2>Music</h2>
        <h3>Music library votes</h3>
        <AdminTable label="Music library votes" rows={[...data.musicVotes].sort((a,b) => b.updatedAt - a.updatedAt || a.userId.localeCompare(b.userId) || a.trackUrl.localeCompare(b.trackUrl))}
          rowKey={row => JSON.stringify([row.userId, row.trackUrl])} initialSort={latestFirst} columns={[
            adminDate<MusicVote>("Updated", row => row.updatedAt), ...identityColumns<MusicVote>(row => row.userName),
            { key: "song", label: "Song", value: row => musicByUrl.get(row.trackUrl)?.title ?? row.trackUrl, search: row => row.trackUrl },
            { key: "artist", label: "Artist", value: row => musicByUrl.get(row.trackUrl)?.artist },
            { key: "choice", label: "Choice", value: row => row.choice === "keep" ? "Upvote" : "Downvote" },
          ]} />
        <h3>Song suggestions</h3>
        <AdminTable label="Song suggestions" rows={[...data.songSuggestions].sort(newest)} rowKey={byId} initialSort={latestFirst} columns={[
          adminDate("Submitted", (row: { createdAt?: number | null }) => row.createdAt), ...identityColumns<SongSuggestion>(),
          { key: "title", label: "Song", value: row => row.title },
          { key: "artist", label: "Artist", value: row => row.artist },
          { key: "album", label: "Album", value: row => row.album },
          { key: "note", label: "Note", value: row => row.note }, recordColumn,
        ]} />
      </section>
      <section id="target-submissions">
        <h2>Target submissions</h2>
        <p>Targets shared through the upload page. Private uploads stay in the participant’s browser.</p>
        <AdminTable label="Target submissions" rows={data.targets.filter(row => row.status).sort(newest)} rowKey={byId} initialSort={latestFirst} columns={[
          adminDate("Submitted", (row: { createdAt?: number | null }) => row.createdAt), ...identityColumns<Target>(),
          { key: "target", label: "Target", value: row => row.name },
          { key: "creator", label: "Creator", value: row => row.creator },
          { key: "type", label: "Headphone type", value: row => row.headphoneType === "ie" ? "In-Ear" : row.headphoneType === "oe" ? "Over-Ear" : "Any" },
          { key: "kind", label: "Submission type", value: row => row.submissionKind === "device-eq" ? "Device EQ" : row.curveKind === "preference" ? "Preference" : "Original" },
          { key: "status", label: "Status", value: row => row.status }, recordColumn,
        ]} />
      </section>
      <TargetRemovalPanel />
      <section>
        <h2>Measurements and exports</h2>
        <h3>Contributed raw measurements</h3>
        <AdminTable label="Contributed raw measurements" rows={data.researchMeasurements.map(row => ({ ...row, originals: measurementFiles(row.files) })).sort(newest)}
          rowKey={byId} initialSort={latestFirst} columns={[
            adminDate("Submitted", (row: { createdAt?: number | null }) => row.createdAt), ...identityColumns<ResearchMeasurement>(),
            { key: "name", label: "Measurement", value: row => row.name },
            { key: "device", label: "Device", value: row => row.device },
            { key: "type", label: "Headphone type", value: row => row.type.toUpperCase() },
            { key: "rig", label: "Rig", value: row => row.rig },
            { key: "fit", label: "Fit", value: row => row.fit },
            { key: "driver", label: "Driver", value: row => row.driverType },
            { key: "nozzle", label: "Nozzle (mm)", value: row => row.nozzleDiameterMm },
            { key: "files", label: "Original files", value: row => row.originals.map(file => file.name).join(" "),
              render: row => row.originals.map(file => <div key={file.kind}>
                <button type="button" onClick={() => void downloadFile(row.id, file.kind, file.name)}>Download {file.name}</button>
                <small>{file.points} points · SHA-256 {file.sha256.slice(0, 12)}…</small>
              </div>) }, recordColumn,
          ]} />
        <h3>Exported preference curves and EQ files</h3>
        <AdminTable label="Exported preference curves and EQ files" rows={[...data.preferenceExports].sort(newest)} rowKey={byId} initialSort={latestFirst} columns={[
          adminDate<PreferenceExport>("Downloaded", row => row.createdAt), ...identityColumns<PreferenceExport>(),
          { key: "target", label: "Target", value: row => row.targetName },
          { key: "creator", label: "Creator", value: row => row.targetCreator },
          { key: "headphone", label: "Measurement", value: row => row.measurementName },
          { key: "type", label: "Export type", value: row => row.exportKind === "eq" ? "EQ" : row.exportKind === "original-target" ? "Original target" : "Preference target" },
          { key: "format", label: "Format", value: row => row.format },
          { key: "method", label: "Method", value: row => row.method },
          { key: "priority", label: "Priority", value: row => row.priority },
          { key: "preamp", label: "Preamp (dB)", value: row => row.preamp },
          { key: "rms", label: "RMS error", value: row => row.rms },
          { key: "bands", label: "Bands", value: row => row.bands },
          { key: "file", label: "Filename", value: row => row.filename, render: row => <>
            <small>{row.filename}</small><br /><button type="button" onClick={() => downloadRecordedExport(row)}>Download</button>
          </> },
          { key: "curve", label: "Curve and details", render: row => <>
            <ExportCurvePreview curve={row.curve} />
            <details><summary>View exact data</summary><strong>Settings</strong><pre>{row.settings}</pre>
              <strong>Curve points</strong><pre>{row.curve}</pre>
              {row.filters && <><strong>EQ filters</strong><pre>{row.filters}</pre></>}
              <strong>Downloaded file</strong><pre>{row.contents}</pre>
            </details>
          </> }, recordColumn,
        ]} />
      </section>
      <details className="admin-tool-group">
        <summary>Opted-in Personal and Community research <small>{data.personalChoices.length + data.communityChoices.length + data.referenceChoices.length} choices</small></summary>
        {([["Personal research choices", data.personalChoices], ["Community research choices", data.communityChoices], ["Community reference answers", data.referenceChoices]] as const).map(([label, rows]) => <section key={label}>
          <h3>{label}</h3>
          <AdminTable label={label} rows={[...rows].sort(newest)} rowKey={byId} initialSort={latestFirst} columns={[
            adminDate<ResearchChoice>("Submitted", row => row.createdAt), ...identityColumns<ResearchChoice>(),
            { key: "song", label: "Song", value: row => recordings.get(row.recordingId)?.title || "Track not shared" },
            { key: "artist", label: "Artist", value: row => recordings.get(row.recordingId)?.artist },
            { key: "a", label: "Sample A", value: row => target(row.targetAId), search: row => row.targetAId },
            { key: "b", label: "Sample B", value: row => target(row.targetBId), search: row => row.targetBId },
            { key: "result", label: "Choice", value: row => row.result?.toUpperCase() },
            { key: "phase", label: "Phase", value: row => row.phase }, recordColumn,
          ]} />
        </section>)}
      </details>
      <ActivityMonitoringPanel />
      <ServiceStatusPanel />
      <section id="admin-tools" aria-label="More admin tools">
        <h2>More tools</h2>
        <AdminBrowserOwnershipProof />
        <AdminLegacyReview />
        <details className="admin-tool-group"><summary>Ranked practice participants</summary><EarPracticeLeaderboard owner /></details>
        <details className="admin-tool-group" id="protected-archive"><summary>Statistics archive and planning</summary><StatisticsArchivePanel /></details>
        <details className="admin-tool-group" id="tester-access"><summary>Tester access and local tests</summary><TesterInvites /><AdminTestPanel /><TestAccountControls /></details>
        <details className="admin-tool-group"><summary>Listening account recovery</summary><YinYangAccountPanel /></details>
        <details className="admin-tool-group"><summary>Community pilot and ranking history</summary><CommunityPilotPanel /><RankingChangeLog /></details>
        <details className="admin-tool-group"><summary>Name filter lab</summary><NameFilterLab /></details>
        <details className="admin-tool-group" id="deletion-totals">
          <summary>Deletion statistics</summary>
          <p>Private totals by UTC date and data category. Counts include linked records, file chunks and admin notes. These totals contain no identity or deleted content.</p>
          <AdminTable label="Deletion statistics" rows={[...data.deletionTotals].sort((a,b) => b.day.localeCompare(a.day) || a.recordKind.localeCompare(b.recordKind))}
            rowKey={row => JSON.stringify([row.day, row.recordKind])} empty="No recorded deletions yet. Earlier deletions are not backfilled." columns={[
              { key: "day", label: "UTC date", value: row => row.day },
              { key: "kind", label: "Data category", value: row => row.recordKind },
              { key: "count", label: "Records deleted", value: row => row.deletedCount },
            ]} />
        </details>
      </section>
    </>}
  </main>;
}
