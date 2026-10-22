import Link from "next/link";
import type { Metadata } from "next";
import { bugReportUrl, releaseInfo, repositoryUrl } from "@/lib/release-info";

export const metadata: Metadata = { title: "About this version · YinYang EQ" };
const repository = repositoryUrl;

export default function VersionPage() {
  return <main className="alpha-help-page alpha-version-page">
    <span className="alpha-version-eyebrow">YinYang EQ</span>
    <h1>About this version</h1>
    <div className="alpha-release-summary"><strong>{releaseInfo.version}</strong><span>{releaseInfo.channel}</span></div>
    <p>{releaseInfo.published ? "This beta is available for wider testing and feedback." : "This beta candidate is available for local review and has not been published as a release."} It uses the real listening and account tools. The separate layout study uses example audio and illustrative data.</p>
    <section className="alpha-help-card" aria-labelledby="version-beta"><h2 id="version-beta">What beta means</h2><p>The main listening, tuning and account tools are available, while broader testing helps us find bugs and improve the experience. Some features may still be unfinished.</p><p>Found a problem? Include what happened, how to reproduce it, and your browser and device. GitHub reports are public; leave out personal data and private account information.</p><a href={bugReportUrl} target="_blank" rel="noopener noreferrer">Report a bug on GitHub ↗</a></section>
    <section className="alpha-help-card" aria-labelledby="version-changes"><h2 id="version-changes">What changed</h2><ul>{releaseInfo.changes.map(change => <li key={change}>{change}</li>)}</ul></section>
    <section className="alpha-help-card" aria-labelledby="version-rights"><h2 id="version-rights">Copyright &amp; reuse</h2>
      <p>© 2026 Yin Yang EQ Lab. Original software code is licensed under Apache 2.0. Original branding, artwork, site copy and visual design are reserved unless separately licensed. Music, target curves, measurements and third-party materials have separate rights.</p>
      <div className="alpha-version-links"><a href={`${repository}/blob/main/LICENSE`}>Apache 2.0 code license</a><a href={`${repository}/blob/main/LICENSE_SCOPE.md`}>What the license covers</a><a href={`${repository}/blob/main/THIRD_PARTY.md`}>Third-party notices</a></div>
    </section>
    <section className="alpha-help-card" aria-labelledby="version-history"><h2 id="version-history">Release history</h2><p>This candidate starts from verified published source {releaseInfo.baseline.label}. Earlier source remains available for reference.</p><p>Viewing release history does not switch the application, restore old data or change your saved settings.</p><a href={`${repository}/tree/${releaseInfo.baseline.commit}`}>View published {releaseInfo.baseline.label} source</a></section>
    <div className="alpha-version-links"><Link href="/">Home</Link><Link href="/shortcuts">Shortcuts &amp; help</Link><Link href="/my-data">My data</Link></div>
  </main>;
}
