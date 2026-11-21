import { Download } from "lucide-react";
import { shareMetadata } from "@/lib/share-metadata";
import { TrailerPlayer } from "./trailer-player";
import { CompanionGallery } from "./gallery";
import { ShareCompanion } from "./share-button";
import "./style.css";

export const metadata = shareMetadata("/q5k4android");
const repository = "https://github.com/yinyangeqlab/yinyang-android";

export default async function AndroidPage({ searchParams }: { searchParams: Promise<{ download?: string }> }) {
  const { download } = await searchParams;
  return (
    <main className="companion-page" aria-labelledby="companion-title">
      <header className="companion-hero">
        <div className="companion-copy">
          <p className="companion-identity">
            <img src="/android/companion.svg" width="44" height="44" alt=""/>
            YinYangEQ Qudelix 5k and 5K Plus Companion App
          </p>
          <h1 id="companion-title">Import and export PEQ right from your phone.</h1>
          <p className="companion-intro">Generate accurate PEQ offline from your measurements. Create left and right Channel Match in the app and save it with your Main EQ as a paired preset.</p>
          <p className="companion-plus-pitch">On the <strong>5K Plus</strong>, put unused Channel Match slots toward <strong>up to 30 Main EQ bands</strong>. Or tune each ear separately with <strong>up to 50 filter settings across the pair</strong>.</p>
          <div className="companion-install" id="install">
            <div className="companion-downloads">
              <div className="companion-download-option">
                <a className="companion-download companion-download-primary" href={repository + "/releases/latest/download/YinYang-Companion.apk"} aria-describedby="companion-download-note">
                  <Download size={18} aria-hidden="true"/> YinYangEQ Q5K Companion App
                </a>
                <p id="companion-download-note">Direct APK · v0.16.2 · Android 8+</p>
              </div>
              <div className="companion-download-option">
                <a className="companion-download companion-download-secondary" href="/android/download" aria-describedby="manager-download-note">
                  <Download size={18} aria-hidden="true"/> Download App Manager APK
                </a>
                <p id="manager-download-note">Install and update · v1.6.2 · Android 9+</p>
              </div>
            </div>
            {download === "testing" && <p role="status">Check the <a href={repository + "/releases"}>published Android releases</a> for the latest signed APK.</p>}
            {download === "unavailable" && <p role="status">The download service is unavailable. Check <a href={repository + "/releases"}>GitHub Releases</a> or try again later.</p>}
          </div>
          <nav className="companion-jumps" aria-label="Explore the Companion">
            <a href="#companion-gallery">Tour the app</a>
            <a href="#themes">Try five themes</a>
          </nav>
        </div>

        <section className="companion-allocation" aria-labelledby="allocation-title">
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
      </header>

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
      <TrailerPlayer/>
    </main>
  );
}
