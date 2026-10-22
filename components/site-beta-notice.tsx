import { bugReportUrl } from "@/lib/release-info";

export default function SiteBetaNotice() {
  return <aside className="site-beta-notice" aria-labelledby="site-beta-heading">
    <div className="site-beta-copy">
      <strong id="site-beta-heading">Beta testing</strong>
      <p>We’re still refining the experience. Bugs and unfinished features may appear.</p>
    </div>
    <div className="site-beta-actions">
      <a href={bugReportUrl} target="_blank" rel="noopener noreferrer" aria-label="Report a bug on GitHub (opens in a new tab)">Report a bug <span aria-hidden="true">↗</span></a>
      <small>GitHub reports are public. Leave out personal data.</small>
    </div>
  </aside>;
}
