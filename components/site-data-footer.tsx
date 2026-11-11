import AdminAccountLink from "@/components/admin-account-link";
import SiteBetaNotice from "@/components/site-beta-notice";
import { bugReportUrl, buildLabel, repositoryUrl } from "@/lib/release-info";

const repository = `${repositoryUrl}/blob/main`;

export default function SiteDataFooter({ home }: { home: boolean }) {
  return <footer className="site-data-footer" aria-label="Site footer">
    <div className="site-footer-inner">
      <SiteBetaNotice />
      <nav className="site-footer-links" aria-label="Footer links">
        <div>
          <strong>Project</strong>
          <a href="/about">About Us</a>
          <a className="site-footer-version" href="/version">
            Version &amp; Release Notes
            <small>{buildLabel}</small>
          </a>
          <a href={repositoryUrl} target="_blank" rel="noopener noreferrer">Source code on GitHub</a>
        </div>
        <div>
          <strong>Contact</strong>
          <a href="mailto:yinyangeqlab@gmail.com">Email Yin Yang EQ Lab</a>
          <a href={bugReportUrl} target="_blank" rel="noopener noreferrer">Report a bug on GitHub</a>
          <small>Bug reports are public. Leave out personal data.</small>
        </div>
        <div>
          <strong>Data &amp; Privacy</strong>
          <a href="/terms">Terms of Use</a>
          <a href="/privacy">Privacy notice</a>
          <a href="/my-data">My data, sharing &amp; deletion</a>
          <a href="/sync">Browser Sync</a>
        </div>
        <div>
          <strong>Credits &amp; Licensing</strong>
          <a href="/software-licenses">Software licenses · PEQdB</a>
          <a href="/curve-credits">Curve credits</a>
          <a href={`${repository}/LICENSE_SCOPE.md`}>Reuse &amp; licensing</a>
          <a href={`${repository}/THIRD_PARTY.md`}>Third-party notices</a>
        </div>
      </nav>
      <div className="site-footer-meta">
        <div>
          <p className="site-footer-license">© 2026 Yin Yang EQ Lab. Original software code is reusable under <a href={`${repository}/LICENSE`}>Apache 2.0</a>, including commercially, subject to its terms and notices. Original branding, artwork, site copy and visual design are reserved unless separately licensed. Music, target curves, measurements and third-party materials have their own rights and notices; the code license does not grant permission to reuse them.</p>
          <p className="site-footer-license">AutoEQ engine: © 2026 PEQdB Inc. · LGPL-3.0-or-later.</p>
        </div>
        {home && <AdminAccountLink placement="welcome" />}
      </div>
    </div>
  </footer>;
}
