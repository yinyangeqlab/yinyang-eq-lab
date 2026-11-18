import { Suspense } from "react";
import type { Metadata } from "next";
import ReleaseAvailability from "@/components/release-availability";
import { createPublishedBuildLookup } from "@/lib/github-release";
import { bugReportUrl, buildLabel, releaseInfo, repositoryUrl, updateLabel } from "@/lib/release-info";
import { candidateChanges, releaseHistory } from "@/lib/release-history";
import { shareMetadata } from "@/lib/share-metadata";
import ReleaseHistory from "./release-history";
import "./style.css";

export const metadata: Metadata = shareMetadata("/version");
export const dynamic = "force-dynamic";

const publishedBuildTag = createPublishedBuildLookup(repositoryUrl, updateLabel);

async function PublishedBuildLink() {
  const tag = await publishedBuildTag();
  return tag ? <a href={`${repositoryUrl}/releases/tag/${encodeURIComponent(tag)}`}>GitHub release</a> : null;
}

export default function VersionPage() {
  const { build, version } = releaseInfo;
  const currentEntry = releaseHistory.find(entry => entry.update === build.update);
  const currentReleaseLink = !build.preview && currentEntry && !currentEntry.github?.releaseTag
    ? <Suspense fallback={null}><PublishedBuildLink /></Suspense>
    : undefined;

  return (
    <main className="alpha-help-page alpha-version-page">
      <h1>About this version</h1>
      <div className="alpha-release-summary">
        <strong>{buildLabel}</strong>
        {!build.preview && <span>{releaseInfo.channel}</span>}
      </div>
      <p className="version-build-meta">
        <span>{version} · <time dateTime={build.date}>{build.date}</time></span>
        {build.preview > 0 && <span>Based on <a href={`#update${build.basedOn}`}>update{build.basedOn}</a></span>}
      </p>
      <ReleaseAvailability />
      <nav className="alpha-version-links version-jump-links" aria-label="About this version">
        <a href="#version-beta">Report a bug</a>
        <a href="#version-rights">Copyright &amp; reuse</a>
      </nav>

      {build.preview > 0 && (
        <section className="alpha-help-card" aria-labelledby="build-notes">
          <h2 id="build-notes">Changes in this preview</h2>
          <ul>{candidateChanges.map(change => <li key={change}>{change}</li>)}</ul>
        </section>
      )}

      <section className="alpha-help-card version-history" aria-labelledby="version-changes">
        <h2 id="version-changes">Release history</h2>
        <ReleaseHistory
          entries={releaseHistory}
          currentUpdate={build.preview ? build.basedOn : build.update}
          currentReleaseLink={currentReleaseLink}
        />
        <div className="alpha-version-links">
          <a href={`${repositoryUrl}/releases`}>All GitHub releases</a>
          <a href={`${repositoryUrl}/commits/main/`}>Commit history</a>
          <a href={repositoryUrl}>Source repository</a>
        </div>
      </section>

      <section className="alpha-help-card" aria-labelledby="version-beta">
        <h2 id="version-beta">Beta feedback</h2>
        <p>Some listening, tuning and account features are still in development. If you find a problem, include what happened, how to reproduce it, and your browser and device. GitHub reports are public. Leave out personal and account information.</p>
        <a href={bugReportUrl}>Report a bug on GitHub</a>
      </section>

      <section className="alpha-help-card" aria-labelledby="version-rights">
        <h2 id="version-rights">Copyright &amp; reuse</h2>
        <p>© 2026 Yin Yang EQ Lab. Original software code is licensed under Apache 2.0. Original branding, artwork, site copy and visual design are reserved unless separately licensed. Music, target curves, measurements and third-party materials have separate rights.</p>
        <div className="alpha-version-links">
          <a href={`${repositoryUrl}/blob/main/LICENSE`}>Apache 2.0 code license</a>
          <a href={`${repositoryUrl}/blob/main/LICENSE_SCOPE.md`}>What the license covers</a>
          <a href={`${repositoryUrl}/blob/main/THIRD_PARTY.md`}>Third-party notices</a>
        </div>
      </section>
    </main>
  );
}
