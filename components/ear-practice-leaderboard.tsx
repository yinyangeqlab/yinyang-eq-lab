"use client";

import { useEffect, useState } from "react";
import type { EarPracticeBoard } from "@/lib/ear-practice-ranking";
import "./ear-practice-leaderboard.css";

type OwnProfile = { canPublish: boolean; username: string | null };
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
  const [board, setBoard] = useState<EarPracticeBoard | null>(null);
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
        const result = await response.json() as EarPracticeBoard;
        if (!controller.signal.aborted) {
          const lastPage = Math.max(0, Math.ceil(result.participants / result.pageSize) - 1);
          if (pageIndex > lastPage) {
            setPageIndex(lastPage);
            return;
          }
          setBoard(result);
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
      setBoard(null);
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

  const { distribution, participants } = board ?? { distribution: [], participants: 0 };
  function levelPercentile(level: number) {
    const below = distribution.filter(item => item.level < level).reduce((sum, item) => sum + item.count, 0);
    const tied = distribution.find(item => item.level === level)?.count ?? 0;
    return participants ? 100 * (below + tied / 2) / participants : 0;
  }

  const loadingPage = board?.page !== pageIndex;
  const ranges = levelRanges.map(range => ({
    ...range,
    count: distribution.filter(item => item.level >= range.from && item.level <= range.to)
      .reduce((sum, item) => sum + item.count, 0),
  }));
  const maxCount = Math.max(1, ...ranges.map(range => range.count));
  const distributionId = owner ? "ear-practice-admin-distribution" : "ear-practice-distribution";

  return <section id={owner ? "ear-practice-participants" : "ear-practice-rankings"} className="ear-practice-board"
    aria-labelledby={owner ? "ear-practice-admin-title" : "ear-practice-board-title"}>
    <header className="ear-practice-board-header">
      <div>
        <h2 id={owner ? "ear-practice-admin-title" : "ear-practice-board-title"}>{owner ? "Ranked practice participants" : "Ranked Practice Challenge results"}</h2>
        {owner && <p>Private participant IDs link each account to its published scores, including anonymous entries.</p>}
      </div>
      {!owner && <a className="ear-practice-play-link" href="/ear-tuning">Open Peak &amp; Dip Finder</a>}
    </header>
    {error ? <p role="status">{error} <button type="button" onClick={() => { setError(null); setRevision(value => value + 1); }}>Try again</button></p> : !board ? <p role="status">Loading scores…</p>
      : <>
        {loadingPage && <p role="status">Loading page {pageIndex + 1}…</p>}
        {board.rows.length ? <>
          <div key={board.page} className="ear-practice-table" aria-busy={loadingPage} tabIndex={0} role="region" aria-label="Ranked practice scores">
            <table>
              <caption>{participants > board.pageSize
                ? `Showing ${(board.page * board.pageSize + 1).toLocaleString("en-US")}–${(board.page * board.pageSize + board.rows.length).toLocaleString("en-US")} of ${participants.toLocaleString("en-US")} players`
                : `${participants.toLocaleString("en-US")} ${participants === 1 ? "player" : "players"}`}</caption>
              <thead><tr><th scope="col">Rank / Player</th><th scope="col">Wins / Losses</th><th scope="col">Accuracy</th><th scope="col">Level cleared</th>{owner && <th scope="col">Participant ID</th>}</tr></thead>
              <tbody>{board.rows.map(row => <tr key={row.username}>
                <th scope="row"><span className="ear-practice-player"><span className="ear-practice-rank">#{row.rank}</span><span>{row.username}</span></span></th>
                <td>{row.correct} / {row.attempts - row.correct}<small>{(100 * row.correct / row.attempts).toFixed(1)}% win rate</small></td>
                <td>{row.accuracy.toFixed(1)}%</td>
                <td>{row.furthest}{row.furthest === 100 && <small className="ear-practice-grandmaster">Grandmaster</small>}
                  <small>{levelPercentile(row.furthest).toFixed(1)}th percentile</small></td>
                {owner && <td><code>{row.participantId}</code></td>}
              </tr>)}</tbody>
            </table>
          </div>
          {participants > board.pageSize && <nav className="ear-practice-pagination" aria-label="Ranked practice result pages">
            <button type="button" disabled={loadingPage || pageIndex === 0} onClick={() => changePage(pageIndex - 1)}>Previous page</button>
            <span aria-live="polite">Page {board.page + 1} of {Math.ceil(participants / board.pageSize)}</span>
            <button type="button" disabled={loadingPage || (pageIndex + 1) * board.pageSize >= participants} onClick={() => changePage(pageIndex + 1)}>Next page</button>
          </nav>}
        </> : <p>No published scores yet. Start a ranked challenge to begin your record.</p>}
        {participants > 0 && <details className="ear-practice-distribution-details" open={owner || undefined}>
          <summary>Player level distribution</summary>
          <figure className="ear-practice-distribution" aria-labelledby={distributionId}>
            <figcaption id={distributionId}>
              <span>All {participants.toLocaleString("en-US")} opted-in {participants === 1 ? "player" : "players"}, including anonymous entries. Level 100 earns Grandmaster.</span>
            </figcaption>
            <ol className="ear-practice-distribution-bars">
              {ranges.map(range => <li key={range.label}>
                <span className="ear-practice-distribution-label">{range.label === "100" ? "100 ★" : range.label}<span className="ear-practice-sr-only"> levels cleared</span></span>
                <span className="ear-practice-distribution-track" aria-hidden="true"><span style={{ width: `${100 * range.count / maxCount}%` }}/></span>
                <span className="ear-practice-distribution-count">{range.count.toLocaleString("en-US")}<span className="ear-practice-sr-only"> players</span> <small>({(100 * range.count / participants).toFixed(1)}%)</small></span>
              </li>)}
            </ol>
          </figure>
        </details>}
        <details className="ear-practice-scoring">
          <summary>How wins, losses and accuracy work</summary>
          <p><strong>Leaderboard order.</strong> Most wins first, then fewest losses, highest frequency accuracy and highest level cleared. Identical results share a rank.</p>
          <p><strong>Wins and losses.</strong> Find every peak or dip at the right frequency to win. Wrong answers, giving up and unfinished attempts count as losses. Win rate is wins divided by all started challenges.</p>
          <p><strong>Frequency accuracy</strong> Exact placement earns 100%, a quarter octave away earns 75%, and an octave or more away earns 0%. We average location scores across hidden changes and started challenges, then compare accuracy to one decimal place. Missing guesses and unfinished challenges contribute zero.</p>
          <p><strong>Level percentile.</strong> This compares your cleared level with all opted-in players, including anonymous entries. Tied levels share the midpoint of their group. If everyone clears the same level, everyone is at the 50th percentile. The percentile can move sharply as people play in a small group. Rank uses the cleared level as its last tiebreaker.</p>
          <p>A precise frequency guess earns location credit even if choosing the wrong type costs you the win. Grandmaster marks Level 100 completion in this game.</p>
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
