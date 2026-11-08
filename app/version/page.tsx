import ReleaseAvailability from "@/components/release-availability";
import Link from "next/link";
import type { Metadata } from "next";
import { bugReportUrl, buildLabel, releaseInfo, repositoryUrl } from "@/lib/release-info";
import { shareMetadata } from "@/lib/share-metadata";
import { candidateChanges, releaseHistory } from "@/lib/release-history";
import "./style.css";

export const metadata: Metadata = shareMetadata("/version");
const repository = repositoryUrl;

export default function VersionPage() {
  return <main className="alpha-help-page alpha-version-page">
    <span className="alpha-version-eyebrow">YinYang EQ</span>
    <h1>About this version</h1>
    <div className="alpha-release-summary"><strong>{buildLabel}</strong><span>{releaseInfo.build.preview ? "Preview" : "Release build"}</span></div>
    <p>Beta version {releaseInfo.version} · based on update{releaseInfo.build.basedOn} · <time dateTime={releaseInfo.build.date}>{releaseInfo.build.date}</time></p>
    <ReleaseAvailability/>
    <section className="alpha-help-card" aria-labelledby="version-beta"><h2 id="version-beta">What beta means</h2><p>The beta includes listening, tuning and account tools. Access follows the current testing restrictions shown above. Some features may still be unfinished.</p><p>Found a problem? Include what happened, how to reproduce it, and your browser and device. GitHub reports are public; leave out personal data and private account information.</p><a href={bugReportUrl} target="_blank" rel="noopener noreferrer">Report a bug on GitHub ↗</a></section>
    <section className="alpha-help-card version-build-notes" aria-labelledby="build-notes">
      <h2 id="build-notes">Changes in this build</h2>
      <ul>{candidateChanges.map(change => <li key={change}>{change}</li>)}</ul>
    </section>
    <section className="alpha-help-card version-history" aria-labelledby="version-changes">
      <h2 id="version-changes">Release history</h2>
      <p>Open any recorded update to see what changed. Updates with published source link to their GitHub changes.</p>
      <div className="alpha-version-links">
        <a href={`${repository}/commits/main/`}>Commit history on GitHub</a>
        <a href={repository}>Published source</a>
      </div>
      {releaseHistory.map((entry, index) => {
        const previous = releaseHistory[index + 1]?.github;
        return <details key={entry.update} open={index === 0 && entry.update !== releaseInfo.build.update} id={`update${entry.update}`}>
          <summary><strong>update{entry.update}</strong><span>{entry.title}</span><time dateTime={entry.date}>{entry.date}</time></summary>
          <ul>{entry.changes.map(change => <li key={change}>{change}</li>)}</ul>
          <div className="alpha-version-links">
            {entry.github && <a href={`${repository}/commit/${entry.github.commit}`}>GitHub commit</a>}
            {entry.github && previous && <a href={`${repository}/compare/${previous.commit}..${entry.github.commit}`}>Compare published updates</a>}
            {entry.github?.pull && <a href={`${repository}/pull/${entry.github.pull}`}>Pull request #{entry.github.pull}</a>}
            {entry.update === 103 && <a href={`${repository}/tree/${releaseInfo.baseline.commit}`}>Published baseline snapshot</a>}
          </div>
        </details>;
      })}
    </section>
    <section className="alpha-help-card" aria-labelledby="version-rights"><h2 id="version-rights">Copyright &amp; reuse</h2>
      <p>© 2026 Yin Yang EQ Lab. Original software code is licensed under Apache 2.0. Original branding, artwork, site copy and visual design are reserved unless separately licensed. Music, target curves, measurements and third-party materials have separate rights.</p>
      <div className="alpha-version-links"><a href={`${repository}/blob/main/LICENSE`}>Apache 2.0 code license</a><a href={`${repository}/blob/main/LICENSE_SCOPE.md`}>What the license covers</a><a href={`${repository}/blob/main/THIRD_PARTY.md`}>Third-party notices</a></div>
    </section>

    <div className="alpha-version-links"><Link href="/">Home</Link><Link href="/shortcuts">Help &amp; hotkeys</Link><Link href="/my-data">My data</Link></div>
  </main>;
}
