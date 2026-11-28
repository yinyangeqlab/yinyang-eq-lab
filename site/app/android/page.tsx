import { DownloadAppManager, phoneEqIconSrc } from "@/components/companion-app-brand";
import { shareMetadata } from "@/lib/share-metadata";
import { TrailerPlayer } from "./trailer-player";
import { CompanionGallery } from "./gallery";
import { ShareCompanion } from "./share-button";
import "./style.css";

export const metadata = shareMetadata("/android");
const repository = "https://github.com/yinyangeqlab/yinyang-android";
const releaseTag = "android-20261125-0169";

export default async function AndroidPage({ searchParams }: { searchParams: Promise<{ download?: string }> }) {
  const { download } = await searchParams;
  return (
    <main className="companion-page" aria-labelledby="companion-title">
      <header className="companion-hero">
        <div className="companion-copy">
          <p className="companion-identity">
            <img src="/android/companion.svg" width="44" height="44" alt=""/>
            YinYangEQ Qudelix 5K Companion
          </p>
          <h1 id="companion-title">Build and manage EQs on Android.</h1>
          <p className="companion-intro">Import, edit and export parametric EQ files. Create an EQ offline from your headphone or IEM measurements, then save it with your left and right Channel Match as a paired preset.</p>
          <p className="companion-plus-pitch">On the <strong>5K Plus</strong>, use <strong>up to 30 Main EQ bands</strong> or split the available slots between Main EQ and separate left and right correction.</p>
          <div className="companion-install" id="install">
            <DownloadAppManager className="companion-download companion-download-primary" describedBy="manager-download-note"/>
            <p id="manager-download-note">App Manager requires Android 9 or newer. Use it to install and update YYEQ 5K and YYEQ PhoneEQ.</p>
            <dl className="companion-app-versions" aria-label="Android app versions">
              <div><dt>YYEQ App Manager</dt><dd>1.6.8 (Build 30)</dd></div>
              <div><dt>YYEQ 5K</dt><dd>0.16.9 (Build 70)</dd></div>
              <div><dt>YYEQ PhoneEQ</dt><dd>0.3.5 (Build 10)</dd></div>
            </dl>
            <a className="companion-release-link" href={repository + "/releases/tag/" + releaseTag}>View this Android release on GitHub</a>
            {(download === "testing" || download === "unavailable") &&
              <p role="status">The App Manager download is temporarily unavailable. Try again later.</p>}
          </div>
          <nav className="companion-jumps" aria-label="Explore the Android apps">
            <a href="#phone-eq">Phone EQ</a>
            <a href="#trailer">Watch trailer</a>
            <a href="#companion-gallery">Tour the app</a>
            <a href="#themes">Try five themes</a>
          </nav>
        </div>

        <div className="companion-models" aria-label="Supported Qudelix models">
          <a href="https://www.qudelix.com/products/qudelix-5k">
            <img src="/android/qudelix-5k-cutout.webp" width="420" height="286" alt="Original 5K with its headphone outputs facing forward"/>
            <span>Qudelix 5K</span>
          </a>
          <a href="https://www.qudelix.com/products/qudelix-5k-plus-bluetooth-dac-amp">
            <img src="/android/qudelix-5k-plus-cutout.webp" width="420" height="286" alt="5K Plus upright with its display and audio ports visible"/>
            <span>Qudelix 5K Plus</span>
          </a>
        </div>
      </header>

      <section className="phone-eq" id="phone-eq" aria-labelledby="phone-eq-title">
        <div className="phone-eq-copy">
          <h2 id="phone-eq-title"><img src={phoneEqIconSrc} width="48" height="48" alt=""/>YYEQ PhoneEQ</h2>
          <p>Apply system-wide parametric EQ to media and games on your Android phone without a Qudelix. Import a TXT file or open a fit from YYEQ 5K. Save and search Main EQ, Channel Match, and paired presets in your on-device library.</p>
          <a className="companion-download companion-download-primary" href={repository + "/releases/latest/download/YinYang-Phone-EQ.apk"} aria-describedby="phone-eq-requirements">Download Phone EQ</a>
          <p id="phone-eq-requirements">Android 13 or newer. Also available in <a href="/android/download">App Manager</a>. Playback requires Shizuku.</p>
          <p className="phone-eq-credits">The audio engine is adapted from <a href="https://github.com/nanbeimerco/Quve/releases/tag/v1.0.2">Quve by nanbeimerco</a>. <a href={repository + "/tree/" + releaseTag + "/android-playback"}>Phone EQ source and license</a></p>
        </div>
        <div className="phone-eq-setup">
          <h3>Set up Shizuku</h3>
          <ol>
            <li>Install Shizuku from <a href="https://play.google.com/store/apps/details?id=moe.shizuku.privileged.api">Google Play</a> or <a href="https://github.com/RikkaApps/Shizuku/releases">GitHub</a>.</li>
            <li>Start Shizuku using wireless debugging. <a href="https://shizuku.rikka.app/guide/setup/">Shizuku setup guide</a></li>
            <li>Open Phone EQ and allow Shizuku access. Select a preset and tap <strong>Start phone EQ</strong>.</li>
          </ol>
        </div>
      </section>

      <TrailerPlayer/>

      <section className="companion-allocation" aria-labelledby="allocation-title">
        <h2 id="allocation-title">How the 5K Plus shares its bands</h2>
        <table className="companion-band-table">
          <caption className="sr-only">Example allocations on the 5K Plus. Each ear processes up to 30 bands.</caption>
          <thead><tr><th scope="col">Main EQ</th><th scope="col">Left match</th><th scope="col">Right match</th><th scope="col">Total settings</th></tr></thead>
          <tbody>
            <tr><td>30</td><td>0</td><td>0</td><td>30</td></tr>
            <tr><td>20</td><td>10</td><td>10</td><td>40</td></tr>
            <tr><td>10</td><td>20</td><td>20</td><td>50</td></tr>
          </tbody>
        </table>
        <p>Each ear hears Main EQ plus its own correction, up to 30 bands. Each extra Main EQ band above ten uses one match slot on <em>each</em> side.</p>
      </section>

      <CompanionGallery/>

      <section className="companion-support" aria-labelledby="supported-title">
        <div>
          <h2 id="supported-title">Where the models differ</h2>
          <p>YinYang EQ Lab develops this independent companion. Device photos by Qudelix.</p>
          <a className="companion-guide-link" href={repository + "/blob/main/FEATURES.md"}>Read the feature guide</a>
          <ShareCompanion/>
        </div>
        <dl>
          <div><dt>Qudelix 5K</dt><dd>Control it over Bluetooth. Use 10 Main EQ bands plus 10 Channel Match bands per ear. The companion can swap the audio outputs and carry the CH0 and CH1 corrections with them.</dd></div>
          <div><dt>Qudelix 5K Plus</dt><dd>Control it over USB or Bluetooth. Share band slots between Main EQ and the two ears, or use the full 30-band Main EQ bank. On firmware 1.0.3, the companion can turn off automatic pairing at the DAC and close an open pairing window. Previously paired devices can reconnect, and you can start a new pairing manually on the 5K Plus. <a href="https://support-qudelix.github.io/Qudelix-5K_Plus_User_Manual_EN.pdf">5K Plus manual</a>.</dd></div>
        </dl>
      </section>
    </main>
  );
}
