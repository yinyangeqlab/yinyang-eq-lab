import { releaseInfo } from "@/lib/release-info";

const repository = "https://github.com/yinyangeqlab/yinyang-eq-lab/blob/main";

export default function SiteDataFooter() {
  return <footer className="site-data-footer" aria-label="Data, credits and licensing">
    <a href="/my-data">My data · sharing &amp; deletion</a>
    <a href="/software-licenses">Software licenses · PEQdB</a>
    <a href="/curve-credits">Curve credits</a>
    <a href={`${repository}/LICENSE_SCOPE.md`}>Reuse &amp; licensing</a>
    <a href={`${repository}/THIRD_PARTY.md`}>Third-party notices</a>
    <a href="/version">Version {releaseInfo.version} · {releaseInfo.channel}</a>
    <p className="site-footer-license">© 2026 Yin Yang EQ Lab. Original software code is reusable under <a href={`${repository}/LICENSE`}>Apache 2.0</a>, including commercially, subject to its terms and notices. Original branding, artwork, site copy and visual design are reserved unless separately licensed. Music, target curves, measurements and third-party materials have their own rights and notices; the code license does not grant permission to reuse them.</p>
    <p className="site-footer-license">AutoEQ engine: © 2026 PEQdB Inc. · LGPL-3.0-or-later. <a href="/software-licenses">License texts and matching source</a>.</p>
  </footer>;
}
