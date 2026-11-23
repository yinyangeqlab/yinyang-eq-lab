"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { releaseInfo, repositoryUrl } from "@/lib/release-info";
import { archivedDeploymentReceipts, type ReleaseNotes } from "@/lib/release-history";

const releaseUrl = (tag: string) => `${repositoryUrl}/releases/tag/${encodeURIComponent(tag)}`;

function revealEntry(entry: HTMLDetailsElement) {
  entry.open = true;
  entry.scrollIntoView({ block: "start" });
}

export default function ReleaseHistory({ entries, currentUpdate, currentReleaseLink }: {
  entries: readonly ReleaseNotes[];
  currentUpdate: number;
  currentReleaseLink?: ReactNode;
}) {
  const [query, setQuery] = useState("");
  const filteredTarget = useRef<HTMLDetailsElement | null>(null);
  const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const matches = terms.length === 0 ? entries : entries.filter(entry => {
    const text = [`update${entry.update}`, entry.date, entry.title, ...entry.changes].join(" ").toLowerCase();
    return terms.every(term => text.includes(term));
  });
  const visibleUpdates = new Set(matches.map(entry => entry.update));

  useEffect(() => {
    const reveal = () => {
      filteredTarget.current = null;
      const id = window.location.hash.slice(1);
      if (!/^update\d+$/.test(id)) return;
      const entry = document.getElementById(id);
      if (!(entry instanceof HTMLDetailsElement)) return;
      if (entry.hidden) {
        filteredTarget.current = entry;
        setQuery("");
      } else {
        revealEntry(entry);
      }
    };
    reveal();
    window.addEventListener("hashchange", reveal);
    return () => window.removeEventListener("hashchange", reveal);
  }, []);

  useEffect(() => {
    const entry = filteredTarget.current;
    if (!entry || entry.hidden) return;
    filteredTarget.current = null;
    revealEntry(entry);
  }, [query]);

  return (
    <>
      <noscript><div hidden /></noscript>
      <div className="version-history-search">
        <label htmlFor="version-history-query">Search release history</label>
        <input
          id="version-history-query"
          type="search"
          placeholder="Update or keyword"
          autoComplete="off"
          value={query}
          onChange={event => setQuery(event.target.value)}
        />
        <div className="version-history-results" role="status">
          {terms.length > 0 && (matches.length === 0 ? "No matching updates."
            : `${matches.length} matching ${matches.length === 1 ? "update" : "updates"}`)}
        </div>
      </div>
      <div className="version-history-entries">
        {entries.map((entry, index) => {
          const id = `update${entry.update}`;
          const previous = entries[index + 1]?.github;
          const releaseTag = entry.github?.releaseTag ?? entry.publicationTag;
          const baseline = id === releaseInfo.baseline.label;
          const compareRef = entry.github?.commit ?? entry.publicationTag;
          return (
            <details key={id} id={id} open={entry.update === currentUpdate} hidden={!visibleUpdates.has(entry.update)}>
              <summary>
                <span className="version-history-chevron" aria-hidden="true" />
                <span className="version-history-heading">
                  <strong>{id}</strong>
                  <span>{entry.title}</span>
                  <time dateTime={entry.date}>{entry.date}</time>
                </span>
              </summary>
              <div className="version-history-content">
                <ul>{entry.changes.map(change => <li key={change}>{change}</li>)}</ul>
                <div className="alpha-version-links">
                  {releaseTag ? <a href={releaseUrl(releaseTag)}>GitHub release</a>
                    : entry.update === currentUpdate && currentReleaseLink}
                  {entry.refreshReleases?.map(({ tag, label }) => <a key={tag} href={releaseUrl(tag)}>{label}</a>)}
                  {entry.github && !(baseline && entry.github.commit === releaseInfo.baseline.commit) && (entry.github.linkTaggedSource && releaseTag
                    ? <a href={`${repositoryUrl}/tree/${encodeURIComponent(releaseTag)}`}>GitHub source</a>
                    : <a href={`${repositoryUrl}/commit/${entry.github.commit}`}>GitHub commit</a>)}
                  {entry.publicationTag && <a href={`${repositoryUrl}/tree/${encodeURIComponent(entry.publicationTag)}`}>GitHub source</a>}
                  {compareRef && previous && <a href={`${repositoryUrl}/compare/${previous.commit}..${encodeURIComponent(compareRef)}`}>Compare published updates</a>}
                  {entry.github?.pull && <a href={`${repositoryUrl}/pull/${entry.github.pull}`}>Pull request #{entry.github.pull}</a>}
                  {baseline && <a href={`${repositoryUrl}/tree/${releaseInfo.baseline.commit}`}>Published baseline snapshot</a>}
                  {!entry.github && archivedDeploymentReceipts.updates.has(entry.update) && (
                    <a href={`${repositoryUrl}/blob/${archivedDeploymentReceipts.revision}/docs/releases/${id}-verification.json`}>Deployment record</a>
                  )}
                  <a href={`#${id}`}>Link to {id}</a>
                </div>
              </div>
            </details>
          );
        })}
      </div>
    </>
  );
}
