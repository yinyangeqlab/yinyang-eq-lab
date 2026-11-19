import { shareMetadata } from "@/lib/share-metadata";
import { CompanionAppIcons, DownloadAppManager } from "@/components/companion-app-brand";
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
        <h1 id="companion-title">YinYang Companion App <span>for Qudelix 5K</span></h1>
        <h2 className="companion-file-title">Import and export EQ files right from your phone</h2>
        <p className="companion-intro">Open a PEQ file from Android, edit or rename it offline, and export a Qudelix-format copy. Connect your 5K to audition the changes and save them to a hardware slot.</p>
        <div className="companion-install" id="install">
          <DownloadAppManager className="companion-features-link"/>
          <ShareCompanion/>
          <p className="companion-availability">On Android 9 or later, open App Manager and choose YinYang Companion to install it. Return to the manager for updates. It verifies the Lab’s signing certificate before opening the Android installer.</p>
          {download === "testing" && <p role="status">Public downloads will open when the Lab publishes its Android release. <a href={repository}>View the project on GitHub</a>.</p>}
          {download === "unavailable" && <p role="status">The download service is unavailable. Check <a href={repository + "/releases"}>GitHub Releases</a> or try again later.</p>}
        </div>
        <dl className="companion-features">
          <div><dt>Link EQ with Channel Match as a preset</dt><dd>Save a pair under one name on your phone. Open both stages together, or change the listening EQ while keeping the left and right corrections for your earpieces.</dd></div>
          <div><dt>Compare two presets blind</dt><dd>Switch between A and B on the 5K. Loudness matching keeps a louder preset from getting an easy advantage. Reveal the names after you pick a favorite.</dd></div>
          <div><dt>Send an EQ from browser Tuning</dt><dd>In the private preview, pair your phone by name. Send it an EQ from the browser and review the draft in the companion before applying it.</dd></div>
        </dl>
        <p className="companion-availability">Qudelix 5K Plus support is coming soon. Use at your own risk and check your volume and EQ before listening.</p>
        <aside className="companion-hardware">
          <a href="https://www.qudelix.com/products/qudelix-5k">
            <img src="/android/qudelix-5k.png" width="112" height="84" alt="Front and back of the original Qudelix 5K" />
            <span>Qudelix 5K product page ↗</span>
          </a>
          <p>YinYang EQ Lab is independent and is not affiliated with Qudelix, Inc. Product photo by Qudelix.</p>
        </aside>
        <a className="companion-guide-link" href={repository + "/blob/main/FEATURES.md"}>Read the feature guide</a>
      </div>
      <CompanionGallery/>
      <section className="companion-controls" aria-labelledby="companion-controls-title">
        <h2 id="companion-controls-title">The 5K controls you use every day</h2>
        <dl className="companion-features">
          <div><dt>Edit, audition, and restore</dt><dd>Browse named hardware slots, adjust ten bands and preamp, and try an edit before saving. Restore the saved EQ or choose from up to eight earlier versions of a loaded custom slot.</dd></div>
          <div><dt>Keep a low-latency USB audio path</dt><dd>Play from your computer over USB and adjust EQ from your phone over Bluetooth. The 5K processes the audio, so the companion adds no playback buffer.</dd></div>
          <div><dt>See and control what’s playing</dt><dd>Set the 5K volume and Android media volume separately. Choose USB or Bluetooth input priority. Check codec, bit depth, sample rate, battery, and charge limit while you listen.</dd></div>
          <div><dt>Swap earpieces with their corrections</dt><dd>Reverse left and right playback and their Channel Match filters in one action. Your original files keep their channel order.</dd></div>
          <div><dt>Mix files with a live USB input</dt><dd>The phone preview can mix local audio files and one compatible USB mic or capture input. Set the level of each source and send the mix to one output.</dd></div>
          <div><dt>Open your listening library</dt><dd>Use My Collection, Personal Tuning and headphone search inside the app. Browser Sync shares saved Lab data with devices you approve.</dd></div>
          <div><dt>Check firmware and troubleshoot</dt><dd>Run a read-only compatibility check, export an active EQ snapshot or a diagnostic log, and open the official Qudelix app for firmware updates.</dd></div>
          <div><dt>Set up the app your way</dt><dd>Choose Blue, YinYang Green, AMOLED or Light. Display the familiar USR and SPK names or use PEQ Filters and Channel Match.</dd></div>
        </dl>
      </section>
    </main>
  );
}
