"use client";

import { useEffect, useState } from "react";
import {
  type EarPracticeStanding,
} from "@/lib/ear-practice-ranking";
import "./ear-practice-leaderboard.css";

type OwnProfile = { canPublish: boolean; username: string | null };
type Distribution = { level: number; count: number };
type Board = { rows: EarPracticeStanding[]; distribution: Distribution[]; participants: number };
const levelRanges = [
  { label: "0", from: 0, to: 0 },
  { label: "1–9", from: 1, to: 9 },
  ...Array.from({ length: 9 }, (_, index) => ({
    label: `${10 + index * 10}–${19 + index * 10}`, from: 10 + index * 10, to: 19 + index * 10,
  })),
  { label: "100", from: 100, to: 100 },
];
const publicApi = "/api/ear-practice";

export default function EarPracticeLeaderboard({ owner = false }: { owner?: boolean }) {
  const [pageIndex, setPageIndex] = useState(0);
  const [loadedPage, setLoadedPage] = useState(-1);
  const [rows, setRows] = useState<EarPracticeStanding[] | null>(null);
  const [distribution, setDistribution] = useState<Distribution[]>([]);
  const [participants, setParticipants] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);
  const [profile, setProfile] = useState<OwnProfile | null>(null);
  const [username, setUsername] = useState("");
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    const endpoint = owner ? "/api/owner-research/ear-practice" : publicApi;
    fetch(endpoint + "?page=" + pageIndex, { signal: controller.signal, cache: "no-store" })
      .then(async response => {
        if (!response.ok) throw Error();
        const result = await response.json() as Board;
        if (!controller.signal.aborted) {
          setRows(result.rows);
          setLoadedPage(pageIndex);
          setDistribution(result.distribution ?? []);
          setParticipants(result.participants ?? result.rows.length);
          setError(null);
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) setError("The leaderboard is temporarily unavailable.");
      });
    return () => controller.abort();
  }, [owner, revision, pageIndex]);

  async function loadProfile() {
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch(publicApi + "?mine=1", { cache: "no-store" });
      if (!response.ok) throw Error();
      const result = await response.json() as OwnProfile;
      setProfile(result);
      setUsername(result.username ?? "");
    } catch {
      setMessage("Your leaderboard entry could not be loaded.");
    } finally {
      setBusy(false);
    }
  }

  async function save(method: "PATCH" | "DELETE") {
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch(publicApi, {
        method,
        ...(method === "PATCH" ? { headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username }) } : {}),
      });
      const result = await response.json() as { error?: string; username?: string };
      if (!response.ok) throw Error(result.error || "Your leaderboard entry could not be changed.");
      const next = result.username ?? null;
      setProfile({ canPublish: true, username: next });
      setUsername(next ?? "");
      setConfirm(false);
      setMessage(next ? "Your leaderboard username was updated." : "Your ranked scores and public username were withdrawn.");
      setPageIndex(0);
      setLoadedPage(-1);
      setRows(null);
      setDistribution([]);
      setParticipants(0);
      setError(null);
      setRevision(value => value + 1);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Your leaderboard entry could not be changed.");
    } finally {
      setBusy(false);
    }
  }

  function changePage(next: number) {
    setError(null);
    setPageIndex(next);
  }

  function levelPercentile(level: number) {
    const below = distribution.filter(item => item.level < level).reduce((sum, item) => sum + item.count, 0);
    const tied = distribution.find(item => item.level === level)?.count ?? 0;
    return participants ? 100 * (below + tied / 2) / participants : 0;
  }

  const loadingPage = loadedPage !== pageIndex;
  const ranges = levelRanges.map(range => ({
    ...range,
    count: distribution.filter(item => item.level >= range.from && item.level <= range.to)
      .reduce((sum, item) => sum + item.count, 0),
  }));
  const maxCount = Math.max(1, ...ranges.map(range => range.count));
  const distributionId = owner ? "ear-practice-admin-distribution" : "ear-practice-distribution";

  return <section id={owner ? "ear-practice-participants" : "ear-practice-rankings"} className="ear-practice-board"
    aria-labelledby={owner ? "ear-practice-admin-title" : "ear-practice-board-title"}>
    <h2 id={owner ? "ear-practice-admin-title" : "ear-practice-board-title"}>{owner ? "Ranked practice participants" : "Ranked Practice Challenge results"}</h2>
    <p>Compare wins, losses and frequency accuracy. Everyone follows the same randomized Level 1–100 progression.</p>
    {owner ? <p>Private participant IDs remain the same when a public username changes. Anonymous labels use the same account links.</p>
      : <p><a href="/ear-tuning">Try the Ranked Practice Challenge</a></p>}
    {error ? <p role="status">{error} <button type="button" onClick={() => { setError(null); setRevision(value => value + 1); }}>Try again</button></p> : !rows ? <p role="status">Loading scores…</p>
      : <>
        {participants > 0 && <figure className="ear-practice-distribution" aria-labelledby={distributionId}>
          <figcaption id={distributionId}>
            <strong>Players by level cleared</strong>
            <span>All {participants.toLocaleString("en-US")} opted-in {participants === 1 ? "player" : "players"}, including anonymous entries. Level 100 earns Grandmaster in this challenge.</span>
          </figcaption>
          <ol className="ear-practice-distribution-bars">
            {ranges.map(range => <li key={range.label}>
              <span className="ear-practice-distribution-label">{range.label === "100" ? "100 ★" : range.label}<span className="ear-practice-sr-only"> levels cleared</span></span>
              <span className="ear-practice-distribution-track" aria-hidden="true"><span style={{ width: `${100 * range.count / maxCount}%` }}/></span>
              <span className="ear-practice-distribution-count">{range.count.toLocaleString("en-US")}<span className="ear-practice-sr-only"> players</span> <small>({(100 * range.count / participants).toFixed(1)}%)</small></span>
            </li>)}
          </ol>
        </figure>}
        <div className="ear-practice-board-heading"><h3>Leaderboard · W / L / A</h3>
          <p>More wins first, then fewer losses, higher frequency accuracy and higher level. Accuracy is compared to one decimal place; identical results share a rank.</p>
        </div>
        {loadingPage && <p role="status">Loading page {pageIndex + 1}…</p>}
        {rows.length ? <>
          <p>Showing {(loadedPage * 100 + 1).toLocaleString("en-US")}–{(loadedPage * 100 + rows.length).toLocaleString("en-US")} of {participants.toLocaleString("en-US")} players. The chart includes every page.</p>
          <div className="ear-practice-table" aria-busy={loadingPage} tabIndex={0} role="region" aria-label="Ranked practice scores, scroll horizontally for all columns">
            <table>
              <thead><tr><th scope="col">Rank</th><th scope="col">Username</th><th scope="col">Wins</th><th scope="col">Losses</th><th scope="col">Accuracy</th><th scope="col">Win rate</th><th scope="col">Level cleared</th><th scope="col">Level percentile</th>{owner && <th scope="col">Participant ID</th>}</tr></thead>
              <tbody>{rows.map(row => {
                const ratio = row.correct / row.attempts;
                return <tr key={row.username}>
                  <td>{row.rank}</td><th scope="row">{row.username}</th>
                  <td>{row.correct}</td><td>{row.attempts - row.correct}</td><td>{row.accuracy.toFixed(1)}%</td>
                  <td>{(100 * ratio).toFixed(1)}%</td><td>{row.furthest === 100 ? "100 · Grandmaster" : row.furthest}</td><td>{levelPercentile(row.furthest).toFixed(1)}th</td>
                  {owner && <td><code>{row.participantId}</code></td>}
                </tr>;
              })}</tbody>
            </table>
          </div>
          {participants > 100 && <nav className="ear-practice-pagination" aria-label="Ranked practice result pages">
            <button type="button" disabled={loadingPage || pageIndex === 0} onClick={() => changePage(pageIndex - 1)}>Previous page</button>
            <span>Page {loadedPage + 1} of {Math.ceil(participants / 100)}</span>
            <button type="button" disabled={loadingPage || (pageIndex + 1) * 100 >= participants} onClick={() => changePage(pageIndex + 1)}>Next page</button>
          </nav>}
        </> : <p>No published scores yet. Start a ranked challenge to begin your record.</p>}
        <details className="ear-practice-scoring">
          <summary>How wins, losses and accuracy work</summary>
          <p><strong>W / L:</strong> Find every peak or dip at the right frequency to win. Wrong answers, giving up and unfinished attempts count as losses. Win rate is wins divided by all started challenges.</p>
          <p><strong>A — frequency accuracy:</strong> Exact placement earns 100%; a quarter octave away earns 75%; an octave or more away earns 0%. We average the location scores for all hidden changes, then across every started challenge. Missing guesses and unfinished challenges contribute zero.</p>
          <p><strong>Level percentile:</strong> Your cleared level compared with all opted-in players, including anonymous entries. Tied levels share the midpoint of their group: if everyone has the same level, everyone is at the 50th percentile. This comparison changes as people play and can move sharply in a small group. It is separate from the W / L / A order.</p>
          <p>You can locate a change precisely but choose the wrong type. That earns location accuracy, but the challenge is still a loss. Grandmaster marks completion of this game; it is not a hearing assessment.</p>
        </details>
      </>}
    {!owner && <details onToggle={event => {
      if (event.currentTarget.open && !profile && !busy) void loadProfile();
    }}>
      <summary>Manage my leaderboard entry</summary>
      {profile?.username && <form onSubmit={event => { event.preventDefault(); if (!busy) void save("PATCH"); }}>
        <label>Public username <input required minLength={3} maxLength={24} value={username} onChange={event => setUsername(event.target.value)}/></label>
        <button type="submit" disabled={busy || username.trim() === profile.username}>Save username</button>
        {confirm ? <button type="button" disabled={busy} onClick={() => void save("DELETE")}>Confirm withdrawal of all scores</button>
          : <button type="button" disabled={busy} onClick={() => setConfirm(true)}>Withdraw my scores</button>}
      </form>}
      {profile && !profile.username && <p>This session has no public leaderboard entry.</p>}
      {busy && <p role="status">Working…</p>}
      {message && <p role="status">{message}</p>}
    </details>}
  </section>;
}
