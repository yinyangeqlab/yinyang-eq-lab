"use client";

import { useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

const defaultTheme = { id: "yinyangeq", name: "YinYangEQ theme", color: "#56d6c4" } as const;
const themes = [
  defaultTheme,
  { id: "blue", name: "Blue", color: "#9ab7ff" },
  { id: "amoled", name: "AMOLED black", color: "#000" },
  { id: "light", name: "Light", color: "#f3f4f6" },
  { id: "green", name: "Green", color: "#76e3ba" },
] as const;

const tour = [
  { group: "EQ", id: "main-eq", name: "Main EQ", title: "Take a PEQ file from Android to your DAC",
    detail: "Import a tuning, edit its frequency, gain and Q in the filter table, and export a Qudelix-format copy. Save to your phone for later or to a hardware slot for listening.", alt: "The Main EQ editor and its filter and preset controls" },
  { group: "EQ", id: "main-grid", name: "Filter table", title: "Edit the response one filter at a time",
    detail: "Change the preamp, filter type, frequency, gain and Q in the grid. This 5K Plus example uses all 20 Main EQ bands available alongside ten left and ten right corrections.", alt: "Main EQ preamp and the editable rows of a 20-band filter table" },
  { group: "EQ", id: "channel-match", name: "Channel Match", title: "Keep 20 Main EQ bands and correct each ear",
    detail: "This 5K Plus preset uses 20 shared bands and ten corrections per ear. See both gains on one row when frequency, type and Q match, or open one side to change its filter shape.", alt: "Channel Match showing left and right gain cells in the filter table" },
  { group: "EQ", id: "channel-50", name: "50 settings · Plus", title: "Tune 50 filter settings across the stereo pair",
    detail: "Here the Plus reserves ten shared Main EQ bands and all twenty independent Channel Match bands on each side. Each ear hears ten shared filters and its own twenty corrections.", alt: "5K Plus Channel Match screen showing Left 20 of 20, Right 20 of 20 and Main EQ capacity 10" },
  { group: "EQ", id: "main-30", name: "30-band · Plus", title: "Use all 30 bands for one listening EQ",
    detail: "When you don’t need a separate earpiece correction, the Plus can devote all 30 bands to Main EQ. This example fills the dedicated 30-band bank with a single response for both ears.", alt: "5K Plus Main only editor showing the Full-range reference preset with 30 of 30 bands used" },
  { group: "EQ", id: "presets", name: "Presets", title: "Recall your tuning and channel correction together",
    detail: "Keep Main EQ and Channel Match as a named pair. You can also load either stage on its own when you want a new listening EQ with the same earpiece correction.", alt: "Preset controls in the EQ editor" },
  { group: "EQ", id: "blind-compare", name: "Blind A/B · 5K", title: "Pick a preset by ear on the original 5K",
    detail: "Connect an original 5K to audition A and B with their names hidden. Loudness matching keeps the hardware volume fixed. Choose your favorite, then reveal which EQ you heard.", alt: "Original 5K blind comparison with Loudness match on, Hear A and Hear B controls, and a prompt to reconnect the DAC" },
  { group: "Auto EQ", id: "auto-eq", name: "Measurements", title: "Fit a headphone or IEM offline",
    detail: "Attach a single measurement or a left/right pair and a target. The same fitters used on the YinYangEQ website run on the phone. With internet access you can also search the measurement and target indexes.",
    tip: "For Bluetooth listening, measure your headphones with the codec you normally use. Auto EQ can compensate for repeatable changes in frequency response. EQ can’t recover detail lost to lossy codecs such as LC3.",
    alt: "The Auto EQ measurement and target workflow" },
  { group: "Auto EQ", id: "fit-input", name: "Generate PEQ", title: "Fit Main EQ and a separate channel correction",
    detail: "Check your measurement against the selected target. Generate Main PEQ for both ears or add optional Channel Match when you have left and right measurements.", alt: "Measurement and target response with Generate Main PEQ and Generate Optional Channel Match controls" },
  { group: "Auto EQ", id: "fit-results", name: "Fit results", title: "Hear the best fit and the lower-boost alternative",
    detail: "Compare how closely each fit follows the target and how much peak boost it needs. Inspect the 10-, 15-, 20- and 30-band results, then load a fit that your model supports. The last comparison stays on your phone.", alt: "A completed Auto EQ comparison with recommendations" },
  { group: "Auto EQ", id: "fit-rankings", name: "Band limits", title: "Find the band count that earns its place",
    detail: "Compare the best result at each band limit, ranked by stereo RMS error. Each result shows its band limit and remaining error so you can pick a fit your device supports.", alt: "Best fit at 10, 15, 20 and 30 bands ranked by measured response fit" },
  { group: "Auto EQ", id: "fit-detail", name: "Inspect a fit", title: "See the trade-off before you load a fit",
    detail: "Open a recommendation to inspect its predicted response, RMS error, peak boost and preamp. Review the whole preset in Filters or take just its channel correction.", alt: "Expanded Best fit recommendation with a response chart, RMS error, peak boost, preamp and filter review actions" },
  { group: "Audio", id: "audio", name: "Audio levels", title: "See what the phone and amp are doing",
    detail: "Adjust hardware and phone media volume separately. Read input RMS when available and enter headphone sensitivity and impedance to estimate listening level.", alt: "Audio showing hardware and phone volume along with the estimated SPL and input level meters" },
  { group: "Audio", id: "audio-output", name: "Inputs & output", title: "Set up your Plus for a phone, PC or console",
    detail: "Choose a preferred input and a USB mode for normal playback, PlayStation or Nintendo Switch. Android codec and bit-depth shortcuts depend on your phone’s settings.", alt: "Audio input preferences, three USB modes and Android Bluetooth audio settings" },
  { group: "Audio", id: "audio-meters", name: "Signal meters", title: "Read the signal reaching each ear",
    detail: "See left and right input RMS alongside the amplifier’s output voltage and gain. The example uses simulated playback.", alt: "Two input level meters and the output voltage and amplifier gain" },
  { group: "Audio", id: "original-usb", name: "Original 5K USB", title: "Set up the original 5K for USB audio",
    detail: "Choose the USB sample rate and automatic or manual console switching on the original 5K.", alt: "Original 5K USB sample rate and console switching settings" },
  { group: "Audio", id: "original-mic", name: "Original 5K mic", title: "Choose the microphone on the original 5K",
    detail: "Choose a microphone source and adjust its gain. The same screen groups the original 5K’s voice and music pass-through controls.", alt: "Original 5K microphone source, gain, and pass-through settings" },
  { group: "Audio", id: "channel-swap", name: "Original 5K channels", title: "Swap the outputs and their channel corrections",
    detail: "On the original 5K, swapping left and right also exchanges the CH0 and CH1 preamps and all ten Channel Match filters per ear. Main EQ stays in place.", alt: "Original 5K channel routing panel explaining the connection requirement" },
  { group: "Device", id: "device", name: "Device", title: "Connect the Qudelix you’re tuning",
    detail: "On the 5K Plus, Lock automatic pairing closes the DAC’s current Bluetooth pairing window and turns off automatic entry into pairing mode. Previously paired devices can reconnect. To add a new device later, start pairing manually on the DAC.", alt: "Device status and connection controls for the linked Qudelix" },
  { group: "Sync", id: "sync", name: "Link account", title: "Bring your saved EQs and measurements to your phone",
    detail: "Approve the matching code in your browser to link My Collection. With upload permission, save measurements and preset history, including paired Main EQ and Channel Match. Edits stay local until you choose to save them to your collection.", alt: "The companion Sync page for connecting to My Collection" },
  { group: "Sync", id: "sync-library", name: "My library", title: "Open a saved EQ or its matched pair",
    detail: "Browse your EQs, measurements and channel matches after linking your browser account. Choose a listening EQ by itself or load the correction you saved with it.", alt: "Linked sample library with two saved EQs and actions to load EQ alone or with channel matching" },
  { group: "Sync", id: "sync-backup", name: "Back up", title: "Decide which tuning goes into My Collection",
    detail: "With upload permission, name and back up Main EQ, Channel Match, or both as a pair. You can experiment on the phone between saves.", alt: "Preset backup form with Paired Main EQ and Channel Match selected" },
  { group: "Sync", id: "sync-history", name: "Version history", title: "Get back to a version you liked",
    detail: "Recall the current or an earlier version, including its paired correction. Each revision can load Main EQ, Channel Match or the whole pair. Organize or delete saved versions on the website.", alt: "Current and previous versions of a paired preset with separate Main EQ, Channel Match and pair load actions" },
  { group: "Tools", id: "debug", name: "Debug", title: "Check a connection or export a diagnostic log",
    detail: "Open Debug from the top bar to inspect the model’s connection and EQ checks. You can export a log when you need to troubleshoot.", alt: "Debug tools and connection checks" },
  { group: "Tools", id: "themes", name: "Theme picker", title: "Choose the same look across the app",
    detail: "The Theme button in the top bar opens five palettes, including the website’s YinYangEQ theme. Preview all five below.", alt: "The theme picker with all five palettes" },
] as const;
const groups = [...new Set(tour.map(screen => screen.group))];

export function CompanionGallery() {
  const [index, setIndex] = useState(0);
  const [theme, setTheme] = useState<(typeof themes)[number]>(defaultTheme);
  const start = useRef<{ x: number; y: number } | null>(null);
  const screen = tour[index];
  const siblings = tour.filter(item => item.group === screen.group);
  const step = (offset: number) => setIndex(i => (i + offset + tour.length) % tour.length);
  const src = `/android/screens/theme-tour/${theme.id}/${screen.id}.png`;

  return (
    <section id="companion-gallery" className="companion-gallery" aria-labelledby="companion-gallery-title">
      <h2 id="companion-gallery-title">Tour the companion</h2>
      <p className="tour-intro">The tour uses sample measurements, presets and library history. The Audio and Device screens show simulated playback and device readings.</p>
      <fieldset id="themes" className="gallery-themes">
        <legend>Screenshot theme</legend>
        {themes.map(option => <button key={option.id} type="button" aria-pressed={option.id === theme.id} onClick={() => setTheme(option)}>
          <span aria-hidden="true" style={{ background: option.color }}/>{option.name}
        </button>)}
      </fieldset>
      <div className="tour-workspace">
        <div className="tour-copy">
          <div className="tour-groups" role="group" aria-label="Choose an app area">
            {groups.map(group => <button type="button" key={group} aria-pressed={group === screen.group}
              onClick={() => setIndex(tour.findIndex(item => item.group === group))}>{group}</button>)}
          </div>
          {siblings.length > 1 && <div className="tour-screens" role="group" aria-label={`${screen.group} screens`}>
            {siblings.map(item => <button type="button" key={item.id} aria-pressed={item.id === screen.id}
              onClick={() => setIndex(tour.indexOf(item))}>{item.name}</button>)}
          </div>}
          <div className="tour-story" aria-live="polite" aria-atomic="true">
            <h3>{screen.title}</h3>
            <p>{screen.detail}</p>
            {"tip" in screen && <p>{screen.tip}</p>}
          </div>
          <div className="tour-pager" role="group" aria-label="Browse all screenshots">
            <button type="button" aria-label="Previous app screen" onClick={() => step(-1)}><ChevronLeft aria-hidden="true" size={20}/></button>
            <span>{index + 1} of {tour.length}</span>
            <button type="button" aria-label="Next app screen" onClick={() => step(1)}><ChevronRight aria-hidden="true" size={20}/></button>
          </div>
        </div>
        <figure className="tour-figure" onTouchStart={e => {
          const t = e.touches[0]; start.current = e.touches.length === 1 ? { x: t.clientX, y: t.clientY } : null;
        }} onTouchCancel={() => { start.current = null; }} onTouchEnd={e => {
          const t = e.changedTouches[0], from = start.current; start.current = null;
          if (from && Math.abs(t.clientX - from.x) > 48 && Math.abs(t.clientX - from.x) > 1.5 * Math.abs(t.clientY - from.y)) step(t.clientX < from.x ? 1 : -1);
        }}>
          <a href={src} target="_blank" rel="noreferrer" aria-label={`Open full-size ${screen.name} in ${theme.name}`}
            onKeyDown={e => {
              if (e.key === "ArrowLeft" || e.key === "ArrowRight") { e.preventDefault(); step(e.key === "ArrowLeft" ? -1 : 1); }
            }}>
            <img src={src} alt={`${screen.alt} in ${theme.name}`} width="720" height="1440" loading="lazy"/>
          </a>
          <figcaption>{screen.name} · <a href={src} target="_blank" rel="noreferrer">View full size<span className="sr-only"> in a new tab</span></a></figcaption>
        </figure>
      </div>
    </section>
  );
}
