import { Download } from "lucide-react";
import { shareMetadata } from "@/lib/share-metadata";
import { CompanionAppIcons } from "@/components/companion-app-brand";
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
      <div className="companion-copy">
        <CompanionAppIcons/>
        <h1 id="companion-title">YinYangEQ Qudelix 5k and 5K Plus <span>Companion App</span></h1>
        <h2 className="companion-file-title">EQ and channel matching from your phone</h2>
        <p className="companion-intro">Link one Qudelix to your phone. The companion opens that device’s Main EQ, Channel Match and Audio controls, and keeps its drafts available offline.</p>
        <div className="companion-install" id="install">
          <div className="companion-downloads">
            <div className="companion-download-option">
              <a className="companion-download companion-download-primary" href={repository + "/releases/latest/download/YinYang-Companion.apk"} aria-describedby="companion-download-note"><Download size={20} aria-hidden="true"/> YinYangEQ Q5K Companion App</a>
              <p id="companion-download-note">Companion 0.16.1 · Android 8 or later</p>
            </div>
            <div className="companion-download-option">
              <a className="companion-download companion-download-secondary" href="/android/download" aria-describedby="manager-download-note">
                <Download size={20} aria-hidden="true"/> Download App Manager APK
              </a>
              <p id="manager-download-note">App Manager 1.6.0 · Android 9 or later</p>
            </div>
          </div>
          <p className="companion-availability">Already use the separate 5K Plus preview? Export phone-only presets there, then import them in the unified app. Hardware presets stay on your Qudelix.</p>
          <a className="companion-guide-link" href="#companion-gallery">Explore the five themes</a>
          <ShareCompanion/>
          {download === "testing" && <p role="status">Public downloads will open when the Lab publishes its Android release. <a href={repository}>View the project on GitHub</a>.</p>}
          {download === "unavailable" && <p role="status">The download service is unavailable. Check <a href={repository + "/releases"}>GitHub Releases</a> or try again later.</p>}
        </div>
        <dl className="companion-features">
          <div><dt>Main EQ · USR</dt><dd>Import or export a PEQ, edit its filters in place, and reload a saved preset. Link Main EQ with a Channel Match preset or save either one on its own.</dd></div>
          <div><dt>Channel Match · SPK</dt><dd>See both gains on one row when the filter type, frequency and Q match. The original 5K supports 10 independent bands per ear. The Plus supports 20 per ear with up to 10 Main EQ bands, or 10 per ear with 20 Main EQ bands. All 30 bands can serve Main EQ when no channel correction is needed.</dd></div>
          <div><dt>Offline Auto EQ</dt><dd>Choose an IEM or headphone measurement and a target. Compare the closest fit with a close fit that needs less peak boost. Local files work offline, including paired left and right measurements.</dd></div>
        </dl>
        <section className="companion-hardware" aria-label="Supported Qudelix models">
          <div className="companion-models">
            <a href="https://www.qudelix.com/products/qudelix-5k">
              <img src="/android/qudelix-5k-angle.webp" width="420" height="286" alt="Original 5K with its headphone outputs facing forward"/>
              <strong>Qudelix 5K</strong>
            </a>
            <a href="https://www.qudelix.com/products/qudelix-5k-plus-bluetooth-dac-amp">
              <img src="/android/qudelix-5k-plus-angle.webp" width="420" height="286" alt="5K Plus with its screen and headphone outputs visible"/>
              <strong>Qudelix 5K Plus</strong>
            </a>
          </div>
          <p>Product images by Qudelix. YinYang EQ Lab develops this independent companion.</p>
        </section>
        <a className="companion-guide-link" href={repository + "/blob/main/FEATURES.md"}>Read the feature guide</a>
      </div>
      <CompanionGallery/>
      <TrailerPlayer/>
      <section className="companion-controls" aria-labelledby="companion-controls-title">
        <h2 id="companion-controls-title">Audio, sync and appearance</h2>
        <dl className="companion-features">
          <div><dt>Audio levels and output</dt><dd>Adjust hardware and phone media volume separately. Read the input RMS when available and estimate SPL from your headphone specifications. The Audio tab shows gain, DAC profile and input options supported by your model.</dd></div>
          <div><dt>Sync with My Collection</dt><dd>Confirm the matching code in your browser to link the companion. With upload permission, save measurements, EQs and paired preset history. Live filter edits stay local. Organize or delete saved entries on the website.</dd></div>
          <div><dt>Connect one Qudelix</dt><dd>The companion identifies your 5K or 5K Plus before choosing its controls. Drafts and device settings belong to the linked unit. Open the official Qudelix app for firmware updates.</dd></div>
          <div><dt>Choose your theme</dt><dd>Open Theme at the top of the app to choose Blue, AMOLED black, Light, Green, or the fifth option, YinYangEQ theme, which uses the website palette.</dd></div>
        </dl>
      </section>
    </main>
  );
}
