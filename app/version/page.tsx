import ReleaseAvailability from "@/components/release-availability";
import Link from "next/link";
import type { Metadata } from "next";
import { bugReportUrl, releaseInfo, repositoryUrl } from "@/lib/release-info";
import { shareMetadata } from "@/lib/share-metadata";

export const metadata: Metadata = shareMetadata("/version");
const repository = repositoryUrl;

export default function VersionPage() {
  return <main className="alpha-help-page alpha-version-page">
    <span className="alpha-version-eyebrow">YinYang EQ</span>
    <h1>About this version</h1>
    <div className="alpha-release-summary"><strong>{releaseInfo.version}</strong><span>{releaseInfo.channel}</span></div>
    <ReleaseAvailability/><p>Release notes through update{releaseInfo.notesThrough.update} · {releaseInfo.notesThrough.date}. Beta features remain under testing; current access is shown separately above.</p>
    <section className="alpha-help-card" aria-labelledby="version-beta"><h2 id="version-beta">What beta means</h2><p>The beta includes listening, tuning and account tools. Access follows the current testing restrictions shown above. Some features may still be unfinished.</p><p>Found a problem? Include what happened, how to reproduce it, and your browser and device. GitHub reports are public; leave out personal data and private account information.</p><a href={bugReportUrl} target="_blank" rel="noopener noreferrer">Report a bug on GitHub ↗</a></section>
    <section className="alpha-help-card" aria-labelledby="version-changes"><h2 id="version-changes">What changed since the beta began</h2><ul>{releaseInfo.changes.map(change => <li key={change}>{change}</li>)}</ul><details><summary>Beta launch · update104</summary><ul>{releaseInfo.betaLaunch.map(change=><li key={change}>{change}</li>)}</ul></details></section>
    <section className="alpha-help-card" aria-labelledby="version-rights"><h2 id="version-rights">Copyright &amp; reuse</h2>
      <p>© 2026 Yin Yang EQ Lab. Original software code is licensed under Apache 2.0. Original branding, artwork, site copy and visual design are reserved unless separately licensed. Music, target curves, measurements and third-party materials have separate rights.</p>
      <div className="alpha-version-links"><a href={`${repository}/blob/main/LICENSE`}>Apache 2.0 code license</a><a href={`${repository}/blob/main/LICENSE_SCOPE.md`}>What the license covers</a><a href={`${repository}/blob/main/THIRD_PARTY.md`}>Third-party notices</a></div>
    </section>
    <section className="alpha-help-card" aria-labelledby="version-history"><h2 id="version-history">Release history</h2><p>The beta began from update103. Project history was cleaned before publication; this link points to the published source snapshot, whose tree differs from the original deployment records.</p><p>Viewing old source does not change this app, restore old data or change your saved settings.</p><div className="alpha-version-links"><a href={`${repository}/tree/${releaseInfo.baseline.commit}`}>View published {releaseInfo.baseline.label} source snapshot</a><a href={repository}>Current published source</a></div></section>
    <div className="alpha-version-links"><Link href="/">Home</Link><Link href="/shortcuts">Shortcuts &amp; help</Link><Link href="/my-data">My data</Link></div>
  </main>;
}
