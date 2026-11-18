/* eslint-disable @next/next/no-img-element -- These pre-sized guide assets link to their full-resolution originals. */
import { shareMetadata } from "@/lib/share-metadata";
import "../style.css";
import "./guide.css";
import guideRevisions from "./guide-revisions.json";

export const metadata = shareMetadata("/glossary/iem-measurement");

const currentRevision = guideRevisions[0];
const revisionSuffix = String(currentRevision.number).padStart(2, "0");
const technicalGuideFilename = `yinyang-eq-iem-711-measurement-guide-r${revisionSuffix}.pdf`;
const technicalGuidePdf = `/guides/iem-measurement/${technicalGuideFilename}`;
const benchChecklistPdf = `/guides/iem-measurement/yinyang-eq-iem-711-bench-checklist-r${revisionSuffix}.pdf`;

function technicalGuideSection(section: keyof typeof currentRevision.pages) {
  return `${technicalGuidePdf}#page=${currentRevision.pages[section]}`;
}

export default function IemMeasurementGuidePage() {
  return (
    <main className="terms-page iem-measurement-guide">
      <article>
        <header>
          <h1>Your First IEM Measurement With A 711 Coupler</h1>
          <p className="iem-guide-deck">{"Ever wonder why changing ear tips can make the bass sound stronger or the highs sound clearer? Why one side sounds louder than the other? Or what an equalizer setting actually changes? Welcome. We made this guide to help you measure those differences and decide what to try next."}</p>
          <p className="iem-guide-byline">Yin Yang EQ Lab</p>
          <nav className="iem-guide-start" aria-label="Choose where to start">
            <a href="#check-the-playback-and-recording-connections">First measurement</a>
            <a href="#bench-checklist">Bench checklist</a>
            <a href="#find-answers-by-question">Troubleshooting</a>
          </nav>
        </header>
        <h2>Before you measure</h2>
        <p className="iem-guide-intro">{"A 711 coupler stands in for a sealed ear canal. You fit an in-ear monitor (IEM), a small earphone with a sealing tip, into its opening. The free Room EQ Wizard (REW) app plays a test sound, and the coupler microphone records the level from bass to treble. A graph of those levels is called a frequency response."}</p>
        <p className="iem-guide-intro">{"The goal is a measurement you can repeat. On the same setup, you can see whether changing tips alters the bass, whether the two earpieces play at similar levels, or whether equalization (EQ) did what you expected. Change one thing at a time."}</p>
        <p className="iem-guide-intro">{"Your ear shape and the way the tip seals change what reaches your eardrum. The graph helps you decide what to try. Your ears tell you what you enjoy. Be careful with narrow peaks and dips around 8–10 kHz, where tiny fit changes can move them. Above 10 kHz, read the graph as a rough comparison."}</p>
        <p className="iem-guide-intro-sources"><a href={"https://webstore.iec.ch/en/publication/1445"}>{"IEC 60318-4 standard"}</a> · <a href={"https://www.jstage.jst.go.jp/article/jasj/66/2/66_KJ00006063975/_pdf/-char/ja"}>{"Hirahara et al. (2010), 711 and real-ear measurements"}</a></p>
        <p className="iem-guide-intro">{"You can see two ways we set up the bench. We used a Capra Audio holder to steady the earphone. In our makeshift setup, a padded case supported the earphone and we rested the coupler on a pillow to absorb vibrations. Both are shown in the guide so you can see how to hold the earphone still with what you have."} <a href="#figure-02">See the holder</a> or <a href="#figure-04">see the makeshift setup</a>.</p>
        <p className="iem-guide-intro">{"The guide covers common home setups and the problems we could show with our own measurements. Detailed device settings and lab calibration depend on the gear you use, so keep its documentation handy."}</p>
        <p className="iem-guide-intro">{"If a measurement looks odd, think like an IT technician. Check the simplest things first, follow where the test sound goes, and try one change at a time. Each result helps you decide what to check next."} <a href="#isolate-a-measurement-difference">See how to put that into practice</a>.</p>
        <aside className="iem-guide-handbook" aria-labelledby="iem-guide-handbook-intro">
          <h2 id="iem-guide-handbook-intro">711 Coupler Technical Guide</h2>
          <p>The companion PDF goes deeper into wiring, REW settings, and troubleshooting. It includes additional annotated screenshots, ways to check that your sweeps repeat, and an optional Arch Linux and KDE Plasma appendix.</p>
          <a className="iem-guide-handbook-link" href={technicalGuidePdf}>Open the technical guide (PDF)</a>
        </aside>
        <nav className="iem-guide-contents" aria-labelledby="iem-guide-toc">
          <h2 id="iem-guide-toc">Table of contents</h2>
          <div className="iem-guide-contents-groups">
            <div><h3>Take your first measurement</h3>
              <p><a href="#know-what-you-are-measuring">Know what you are measuring</a></p>
              <p><a href="#bench-gear">Gear we use and recommend</a></p>
              <ol>
                <li><a href="#check-the-playback-and-recording-connections">Connect the IEM and coupler</a></li>
                <li><a href="#mount-the-iem-gently">Mount the earpiece</a></li>
                <li><a href="#set-up-room-eq-wizard">Set up REW and take a first sweep</a></li>
                <li><a href="#measure-both-sides-and-repeat-the-fit">Measure both sides and repeat the fit</a></li>
                <li><a href="#save-and-export-your-measurements">Save your first pair</a></li>
              </ol>
            </div>
            <div><h3>Fix a problem</h3>
              <ul>
                <li><a href="#isolate-a-measurement-difference">Troubleshoot a measurement step by step</a></li>
                <li><a href="#common-measurement-mistakes">Common measurement mistakes</a></li>
              </ul>
            </div>
            <div><h3>Compare or make EQ (optional)</h3>
              <ul>
                <li><a href="#compare-your-sweep-to-a-known-measurement">Compare your sweep to a known measurement</a></li>
                <li><a href="#rule-out-fit-problems-before-eq">Rule out fit problems before EQ</a></li>
                <li><a href="#make-an-eq-from-your-measurements-optional">Make an EQ from your measurements (optional)</a></li>
                <li><a href="#generate-target-eq">Generate target EQ</a></li>
                <li><a href="#optional-channel-match">Match left and right (optional)</a></li>
                <li><a href="#check-the-eq-with-a-new-sweep">Check the EQ with a new sweep</a></li>
              </ul>
            </div>
            <div><h3>Bench reference</h3>
              <ul>
                <li><a href="#bench-checklist">Bench checklist</a></li>
                <li><a href="#find-answers-by-question">Find answers by question</a></li>
              </ul>
            </div>
          </div>
        </nav>
        <h2 id="know-what-you-are-measuring">Know what you are measuring</h2>
        <p>A <strong>711 coupler</strong> gives you a consistent place to fit an earphone and measure it. The ear tip seals against the coupler opening, and the coupler microphone records the test sound. This approximates the conditions when an ear tip seals inside your ear.</p>
        <p>In this guide the <strong>fixture</strong> is the coupler plus whatever holds the earphone in place. The <strong>rig</strong> is your whole measurement setup: fixture, cables, adapter, computer and software.</p>
        <p>A <strong>frequency response</strong>, or simply a <strong>response</strong>, measures how loud the earphone plays at each frequency. Bass is on the left of the graph and treble on the right. Frequency is counted in hertz (Hz), cycles per second, and 1 kHz is 1,000 Hz.</p>
        <p>Two other things are easy to confuse with a response:</p>
        <ol><li>A <strong>target</strong> is a sound balance you would like to reach. It is a goal, not a measurement.</li><li>An <strong>EQ preset</strong> is a saved set of filter settings that changes the sound during playback.</li></ol>
        <p>The name &quot;711&quot; comes from IEC 60711, an older standard from the International Electrotechnical Commission (IEC). Today&#x27;s standard is IEC 60318-4, which specifies ear simulation from 100 Hz to 10 kHz for a conforming coupler. An &quot;IEC&quot; marking on a coupler tells you what it claims to be, not that your unit has been tested against the standard.</p>
        <p>Be careful with peaks and dips around <strong>8–10 kHz</strong>. A small change in how deep the earphone sits can move them. Above <strong>10 kHz</strong>, the graph is best used as a rough comparison. Plot B shows a real example.</p>
        <p>The coupler is best for comparisons, such as left against right or before against after EQ. Your own ear shape and fit can change what you actually hear.</p>
        <h2 id="bench-gear">Gear we use and recommend</h2>
        <p>This is the setup behind the examples. Use equivalent gear if it passes the same checks. An audio interface with a compatible headphone output and microphone input can replace the dongle and splitter.</p>
        <ul className="iem-guide-gear">
          <li><strong>711-style coupler and microphone.</strong> We bought the pictured unit on AliExpress on Sharur’s recommendation. Its maker’s engraving reads Type E610A, as shown in Figure 01 on page 3 of the technical guide. It gives the ear tip a repeatable place to seal. Check your own unit with a known reference earphone.</li>
          <li><strong><a href="https://www.apple.com/shop/product/mw2q3am/a/usb-c-to-35-mm-headphone-jack-adapter">Apple USB-C to 3.5 mm Headphone Jack Adapter</a>.</strong> Our starting choice for this setup. Its DAC, or digital-to-analog converter, turns the computer’s test signal into audio that drives the IEM. With the compatible splitter below, the adapter also records the coupler microphone on our bench. Verify both paths on yours.</li>
          <li><strong>Compatible 3.5 mm headset splitter.</strong> Use a four-contact headset plug, also called TRRS, with separate headphone and microphone sockets. This makes each path easy to trace. Check which contact carries the mic signal and whether the input supplies the small voltage the mic needs, called bias.</li>
          <li><strong><a href="https://www.qudelix.com/products/qudelix-5k">Qudelix-5K (optional)</a>.</strong> For separate playback, plug the IEM into the 5K’s 3.5 mm headphone jack. Keep the coupler mic plugged into the MIC jack on the Apple adapter’s headset splitter. In REW, use the 5K over USB for playback and the Apple adapter for input. Another verified mic input works too. Turn off the 5K’s EQ and effects for baseline sweeps.</li>
          <li><strong><a href="https://capraaudio.com/products/iec-711-iem-holder">Capra Audio IEC 711 IEM Holder or padded support</a>.</strong> The holder steadies the earpiece while it seals. Our makeshift setup uses a padded case to support the earpiece and a pillow under the coupler to absorb vibrations. Either way, check that the response repeats after reinserting.</li>
          <li><strong><a href="https://www.roomeqwizard.com/">Computer with REW, a wired IEM and tips that seal</a>.</strong> REW plays and records the test. The AKG EO-IG955 and Simgot EM6L are the guide’s examples. Start with a familiar earpiece and the same tip model and size for left and right.</li>
        </ul>
        <p><strong>Microphone power.</strong> If the coupler mic needs low-voltage plug-in power, use a mic input that supplies the required voltage. To use a 48 V phantom-powered input, connect through a converter designed to supply the plug-in power the mic needs. <a href="https://help.rode.com/hc/en-us/articles/7878162353039-Why-Do-Certain-Microphones-Require-Plug-in-Power">RØDE on microphone power</a></p>
        <h3>Check the gear you already have</h3>
        <p>Use a headphone output that gives a clean, stable sweep at a reasonable volume. Start low, turn off EQ and sound effects, and check that the coupler mic receives a clear signal with room before clipping. If the sound balance changes when you swap outputs, repeat the test with a verified output while leaving the earpiece and mic setup in place.</p>
        <p>First confirm your sweeps repeat after reinserting. Compare the same earpiece on a known-good 711 setup if you can. Otherwise use a published raw measurement of the same model and version, with a similar tip, seal and depth. Look for broad agreement through the bass and midrange. This checks that the setup is useful for comparisons. Calibration for absolute sound level and testing for IEC conformity are separate checks. <a href="#compare-your-sweep-to-a-known-measurement">See the reference comparison.</a></p>
        <h2 id="check-the-playback-and-recording-connections">1. Connect the IEM and coupler</h2>
        <p>The computer plays a test sound through the earphone and records the coupler microphone. The setup in this guide uses an Apple USB-C audio adapter with a compatible headset splitter. The splitter divides the adapter&#x27;s single headset socket into a headphone output and a microphone input.</p>
        <ol><li>Plug the IEM into the splitter&#x27;s headphone output.</li><li>Plug the coupler cable into the splitter&#x27;s microphone input.</li><li>Check that the splitter&#x27;s wiring matches the adapter, because headset wiring is not universal.</li><li>Check whether the coupler microphone needs <strong>bias</strong>, a small supply voltage from the input.</li><li>Push every plug fully home.</li><li>In your computer&#x27;s sound settings, note which device plays sound and which device records.</li></ol>
        <div className="iem-guide-signal" aria-label="Playback and recording paths">
          <p><strong>Playback</strong> <span>REW → headphone output → earpiece</span></p>
          <p><strong>Recording</strong> <span>Coupler microphone → microphone input → REW</span></p>
        </div>
        <p>If you need to trace the cables or check whether your microphone input supplies power, see the <a href={technicalGuideSection("connections")}>wiring checklist in the technical PDF</a>.</p>
        <h2 id="mount-the-iem-gently">2. Mount the earpiece</h2>
        <p>Every sweep and level check happens with the earphone mounted in the coupler, never in your ears. A setup mistake can make the test tone very loud.</p>
        <p>The <strong>ear tip</strong> is the removable piece over the earphone&#x27;s sound outlet. Seat it so it closes off the coupler opening. This is the <strong>seal</strong>, and a tiny gap lets bass escape.</p>
        <p>For example, the SpinFit W1 is a popular silicone replacement ear tip, an aftermarket tip that replaces the one that came with the earphone. Soft tips like it can fold if you push too hard. The best seal is firm and airtight without squashing or folding the tip.</p>
        <p>Figure 02 shows Capra Audio&#x27;s 3D-printed holder. The slide steadies the earphone, the cotton pad protects its shell, and the knob locks the slide in place.</p>
        <figure className="iem-guide-figure" id="figure-02"><a href="/guides/iem-measurement/figure-02.webp" aria-label="Open full-size Figure 02"><img src="/guides/iem-measurement/figure-02.webp" width={1536} height={1045} alt="Capra Audio holder and padded slider" loading="lazy" decoding="async" /></a><figcaption><strong>Figure 02 · Capra Audio holder and padded slider</strong><span>Bring the taped cotton gently against the earpiece to steady it. Keep the tip bore and the IEM vents clear.</span><ol className="iem-guide-callouts" aria-label="Image callout notes"><li>Coupler body.</li><li>IEM shell and cotton-padded contact point.</li><li>Locking knob for the sliding support.</li></ol></figcaption></figure>
        <ol><li>Slide the padded support until it touches the shell lightly, then lock the knob.</li><li>Keep small air holes on the shell, called vents, uncovered.</li><li>Keep the tip’s center opening clear.</li><li>Leave slack in the cable so it can&#x27;t pull on the earphone.</li><li>Never force the earphone deeper.</li></ol>
        <p>Figure 04 shows an improvised setup. A padded case supports the earphone, and a pillow under the coupler helps absorb vibration from the surface below so the coupler and earpiece stay steady. Check that the coupler can&#x27;t roll before you start.</p>
        <figure className="iem-guide-figure" id="figure-04"><a href="/guides/iem-measurement/figure-04.webp" aria-label="Open full-size Figure 04"><img src="/guides/iem-measurement/figure-04.webp" width={1536} height={986} alt="Improvised padded support" loading="lazy" decoding="async" /></a><figcaption><strong>Figure 04 · Improvised padded support</strong><span>The pillow helps absorb vibrations while the case supports the IEM. Check that the setup stays steady and the measurement repeats after reinserting the earphone.</span><ol className="iem-guide-callouts" aria-label="Image callout notes"><li>IEM where it touches the padded case.</li><li>Coupler assembly resting on its side.</li></ol></figcaption></figure>
        <h2 id="set-up-room-eq-wizard">3. Set up REW and take a first sweep</h2>
        <p>Open <strong>Preferences</strong> and select the <strong>Soundcard</strong> tab (Figure 05).</p>
        <ol><li>Choose <strong>44.1 or 48 kHz</strong> in <strong>Sample rate</strong>. Use a rate both devices support and match playback and recording to it if your system lets you adjust those separately. Keep that rate for both sides and all repeats.</li><li>Set <strong>Output device</strong> to the device that drives the earphone.</li><li>Set <strong>Input device</strong> to the device that receives the coupler microphone.</li><li>Set the <strong>Output</strong> channel to L for the left earpiece or R for the right.</li><li>Set the <strong>Input</strong> channel to wherever the microphone arrives, separately from the output channel.</li><li>Leave <strong>Sweep level</strong> at -12.0 dBFS to start.</li></ol>
        <p>The sample rate is the number of digital readings per second. Figure 05 shows 48 kHz, or 48,000 readings per second, as an example. <strong>dBFS</strong> means decibels relative to digital full scale, the loudest value a digital signal can hold. Zero dBFS is that ceiling, so -12 dBFS sits 12 dB below it.</p>
        <p>The name &quot;PCM: rew_711&quot; is specific to the example computer. Select your own input and output. Run the IEM level check from <strong>Measure</strong>, where the test uses the frequency range you are measuring.</p>
        <figure className="iem-guide-figure" id="figure-05"><a href="/guides/iem-measurement/figure-05.png" aria-label="Open full-size Figure 05"><img src="/guides/iem-measurement/figure-05.png" width={1392} height={857} alt="REW Soundcard Preferences" loading="lazy" decoding="async" /></a><figcaption><strong>Figure 05 · REW Soundcard Preferences</strong><span>The example uses a locally named PCM endpoint. Locate the controls on your system and select the actual playback and coupler capture paths.</span><ol className="iem-guide-callouts" aria-label="Image callout notes"><li>Sample rate set to 48 kHz.</li><li>Output device.</li><li>Input device.</li><li>Playback channel selector.</li><li>Capture channel selector.</li><li>Sweep level shown in dBFS.</li><li>The separate level test in Preferences is set to the subwoofer signal in this screenshot. For IEMs in this guide, use Check levels in the Measure dialog (Figure 06).</li></ol></figcaption></figure>
        <p>Next, click <strong>Measure</strong> to open <strong>Make a measurement</strong> (Figure 06). A <strong>sweep</strong> is a test tone that glides from low to high frequencies.</p>
        <ol>
          <li>Choose <strong>SPL</strong>, <strong>Sweep</strong>, <strong>From REW</strong>, and <strong>Single measurement</strong>.</li>
          <li>Set the range to <strong>20 Hz to 20,000 Hz</strong>, length to <strong>128k</strong>, and timing to <strong>No timing reference</strong> for this first run.</li>
          <li>Use the same <strong>44.1 or 48 kHz</strong> rate already selected. Start with <strong>-12 dBFS RMS</strong> for the sweep while keeping playback volume and mic gain low.</li>
          <li>Name the run and record the earpiece, tip and fit in <strong>Notes</strong>. Turn on <strong>Prefix with output</strong> if you want REW to add L or R.</li>
          <li>Confirm the actual <strong>Output</strong> and <strong>Input</strong> lines, then follow the level checks below.</li>
        </ol>
        <p>RMS stands for root mean square, a way to express a signal&#x27;s average strength. The 20 Hz to 20,000 Hz range is only the span you request, so treat the edges of the graph with care.</p>
        <figure className="iem-guide-figure" id="figure-06"><a href="/guides/iem-measurement/figure-06.png" aria-label="Open full-size Figure 06"><img src="/guides/iem-measurement/figure-06.png" width={1544} height={1207} alt="REW Make a Measurement" loading="lazy" decoding="async" /></a><figcaption><strong>Figure 06 · REW Make a Measurement</strong><span>Start with conservative IEM playback and mic gain. The screenshot shows a personal setup with a 128k sweep and a local endpoint.</span><ol className="iem-guide-callouts" aria-label="Image callout notes"><li>Name the sweep.</li><li>Record the tip, fit and any setup changes in Notes.</li><li>REW sweep level at -12.00 dBFS RMS.</li><li>128k sweep length for this example.</li><li>Timing settings for basic magnitude response.</li><li>Output channel selector, shown on L.</li><li>Selected capture source and channel. Verify this path in the OS and REW.</li><li>Run Check levels before pressing Start.</li></ol></figcaption></figure>
        <h3 id="check-levels-before-the-sweep">Check levels before the sweep</h3>
        <p>Three settings control the recording: the <strong>sweep level</strong> inside REW, the <strong>playback volume</strong> that drives the earphone and the <strong>microphone input gain</strong> that amplifies the coupler. The sweep level and playback volume change the actual <strong>sound pressure level</strong> (SPL) inside the coupler. Microphone gain changes the recorded signal.</p>
        <p>REW shows true SPL only after calibration against a known sound. On an uncalibrated rig like this one, its SPL numbers are for comparing sweeps, not absolute loudness. A volume slider also shows a control setting, not an SPL reading.</p>
        <p>For the first measurements, turn off playback EQ and audio effects such as spatial audio, volume normalization and microphone noise suppression.</p>
        <ol><li>With the earphone in the coupler, set playback volume and microphone gain low.</li><li>In the <strong>Measure</strong> dialog, click <strong>Check levels</strong> to play a short test sound.</li><li>If it barely registers, check the input and the seal before turning anything up.</li><li>Raise playback a little with microphone gain fixed if the test sound is too quiet.</li><li>If playback is adequate and recording is still low, adjust microphone gain separately.</li></ol>
        <p><strong>Headroom</strong> is the margin between the loudest recorded peak and the digital ceiling. REW shows it in red below 6 dB, and 0.0 dB means no margin is left. Headroom measures what comes back, while the -12 dBFS RMS sweep setting describes what REW sends, so even a modest sweep can run out of headroom.</p>
        <p><strong>Clipping</strong> happens when a signal exceeds a limit and its peaks are cut off. Turning down a later stage cannot undo clipping that already happened earlier. Lower the level at or before the overloaded stage and measure again.</p>
        <p>There is no universal target such as -40 dBFS. Aim for a clean recording with comfortable headroom, then keep all three settings fixed for both sides.</p>
        <p>For a step-by-step explanation of sweep level, playback volume, and microphone gain, see <a href={technicalGuideSection("levels")}>setting levels in the technical PDF</a>.</p>
        <h3 id="run-first-sweep">Run and read your first sweep</h3>
        <p>With the earphone in the coupler, click <strong>Start</strong> and watch <strong>Headroom</strong> during the sweep. Then look at the graph. The solid line is the <strong>magnitude</strong>, the measured level at each frequency. The dotted line is the <strong>phase</strong>, which describes timing within the wave cycle. Use the solid line to compare levels.</p>
        <p>Save the first run and repeat it without moving the earpiece or changing a control. Use the checks below to decide whether to continue.</p>
        <ul>
          <li>REW captured the <strong>coupler mic</strong> on the selected input and channel. A file name or a graph appearing on screen is only evidence that a run was created.</li>
          <li>The sweep finished without a clipping or distortion warning. If the headroom display is red, reduce the appropriate level and sweep again.</li>
          <li>With the earpiece untouched, the two traces follow each other through most of the bass and midrange. Your IEM’s curve can have a different overall shape.</li>
        </ul>
        <figure className="iem-guide-figure" id="first-sweep-example"><a href="/guides/iem-measurement/first-sweep-repeats.png" aria-label="Open the full-size repeat sweeps"><img src="/guides/iem-measurement/first-sweep-repeats.png" width={1501} height={608} alt="A solid blue first sweep and a dashed gold second sweep overlap through the bass and midrange" loading="lazy" decoding="async" /></a><figcaption><strong>What overlapping sweeps look like</strong><span>These left Simgot EM6L sweeps from Nov 3, 2026, used the stock tip. Sweep 1 is solid and Sweep 2 is dashed. Both use Sweep 1 at 1 kHz as the zero point. The session records the same sweep settings and leaves any movement between runs unknown. The shaded treble is especially sensitive to fit.</span></figcaption></figure>
        <p>If both sweeps agree, <a href="#measure-both-sides-and-repeat-the-fit">continue with the left and right measurements</a>. If the input is silent, <a href="#no-rew-input">check the recording path</a>. If the curves disagree or the sweep clipped, <a href="#isolate-a-measurement-difference">troubleshoot before continuing</a>. <a href={technicalGuideSection("first")}>See the first-sweep example in the PDF</a>.</p>
        <h2 id="measure-both-sides-and-repeat-the-fit">4. Measure both sides and repeat the fit</h2>
        <p>Measure the left earpiece, then switch the output channel to R and measure the right with exactly the same settings and tip. Leave the input channel where the microphone arrives.</p>
        <p><strong>Repeatability</strong> is how closely results agree when you set up the same way again. To test it, fully remove the earpiece and insert it again between sweeps. This is a <strong>reseat</strong>. Take three to five valid reseats per side.</p>
        <ol><li>Note each run&#x27;s side, tip, size, fit and attempt number.</li><li>Keep every original run for troubleshooting.</li><li>Leave leaks, interruptions and overloaded captures out of any average.</li><li>For each side, choose a clean sweep near the middle of the overlapping runs. If none agree, fix the fit or setup and measure again. The PDF also explains when to use RMS average.</li></ol>
        <p>These uncorrected sweeps are your <strong>baseline</strong>. They keep the real level difference between left and right. <strong>Channel matching</strong>, a correction that makes the two earpieces sound more alike, depends on that difference, so never adjust one side&#x27;s level before saving.</p>
        <h3 id="fit-resonance">Use the resonance to check insertion</h3>
        <p>{"A sealed 711 setup often shows a narrow treble bump somewhere around 7–10 kHz. This resonance changes with insertion depth. Around 8 kHz is a common starting point for choosing a depth. The earphone, tip and coupler can put the peak elsewhere."}</p>
        <p>{"Use the same tip and a gentle seal on both sides. If both sides show a clear peak that moves when you change depth, adjust one earpiece a little at a time until the peaks sit near the same frequency on the graph. That is a useful check for similar insertion before comparing the channels or making EQ. Leave their heights in dB as measured."}</p>
        <p>{"If you cannot get the peaks close with a stable fit and open vents, use the fit you can repeat and note the peak positions. A consistent listening fit and a reliable seal matter more than an exact bench frequency. Your ears may need different tip sizes or depths to seal comfortably."}</p>
        <p>See <a href="#figure-17">the two insertion depths in Plot B</a>, <a href={technicalGuideSection("resonance")}>the technical PDF’s insertion notes</a>, and <a href="https://crinacle.com/graphs/iems/">In-Ear Fidelity’s example of the 8 kHz convention</a>.</p>
        <h2 id="save-and-export-your-measurements">5. Save your first pair</h2>
        <ol><li>Choose <strong>File &gt; Save all measurements</strong> to save an .mdat session file.</li><li>Select the left baseline response and choose <strong>File &gt; Export &gt; Export measurement as text</strong>.</li><li>Repeat for the right side with the same export settings.</li><li>Name the files by side, for example EM6L-L.txt and EM6L-R.txt.</li></ol>
        <p>Each text file lists frequencies and measured levels. Export before you apply any temporary offsets in the next step.</p>
        <p>Keep one folder per earphone model, pair and date. Inside each session folder, make three subfolders:</p>
        <ol><li><strong>Measurements</strong> for the untouched sweeps, the .mdat file, notes and the left and right exports.</li><li><strong>EQ</strong> for the channel-match file, the target EQ and the final preset with its preamp.</li><li><strong>Responses</strong> for predicted and verified curves, labeled separately.</li></ol>
        <p>A <strong>predicted</strong> response is an app&#x27;s estimate of the result. A <strong>verified</strong> response comes from a new sweep with the EQ actually applied.</p>
        <p><strong>Your first measurement is complete</strong> when you have the <code>.mdat</code> session and two unadjusted response files, one left and one right. You can stop here. The remaining sections help you troubleshoot, compare results, or make EQ.</p>
        <h2 id="isolate-a-measurement-difference">Troubleshoot a measurement step by step</h2>
        <p>{"Imagine someone at work says, “My computer’s on, but I can’t get online.” An IT technician checks the simple things first. Is the network switch powered? Is the cable intact and fully seated, and do the ports show a link? If several desks are offline, check what they share. If one desk is offline, test its connection first."}</p>
        <p>{"First confirm the problem with the original cable. Swap in a cable you already know works and test it in the same ports. Then put the original cable back and repeat the test. If the problem clears with the substitute and returns with the original, focus on that cable and its connections. If only one service is down after the connection checks pass, look at that service’s sign-in, settings and access rules."}</p>
        <p>{"Use the same reasoning on the bench. If the bass drops, repeat the sweep and check the seal. Trace playback and recording separately. Swap one verified part, switch back when practical and repeat the test. If both paths change when you swap a dongle, test them separately to narrow it further."}</p>
        <ol className="iem-guide-swap-checks">
          <li>
            <strong>{"Repeat your first sweep"}</strong>
            <p>{"Run the same sweep twice more without moving the earpiece or touching the settings. Save each run. If the same problem shows up in all three, you have something you can test. If the curves wander, steady the holder and check for loose connections before swapping parts."}</p>
          </li>
          <li>
            <strong>{"Adjust the fit one part at a time"}</strong>
            <p>{"Keep the volume, mic gain and other settings fixed. Check one detail per sweep, for example a gap in the seal, how deep the tip sits or a covered vent. If bass follows a change, repeat that test. If it stays the same, try the next detail."}</p>
          </li>
          <li>
            <strong>{"Swap in a part you know works"}</strong>
            <p>{"Save a sweep with the original part. Swap in one cable or playback device you’ve already verified in the same role. Leave the earpiece seated and keep the mic input and gain fixed for a playback test. Start low and run Check levels. Save a sweep with the substitute, then put the original back and sweep again. Does the difference follow the original?"}</p>
          </li>
          <li>
            <strong>{"Watch for shared adapters"}</strong>
            <p>{"An Apple USB-C dongle and headset splitter can carry both playback and the coupler microphone. If both use it, a swap tests both together. A difference points to that shared path. You can narrow it further by testing playback and recording separately."}</p>
          </li>
          <li>
            <strong>{"Check system and REW settings"}</strong>
            <p>{"Test one computer or playback-device setting per sweep, such as an EQ preset or a sound effect. In REW, verify the selected input, output and channels. Use a sample rate both devices support. Check playback volume and mic gain separately and leave room below clipping."}</p>
          </li>
          <li>
            <strong>{"Switch back to confirm"}</strong>
            <p>{"Test the original, the known-working substitute, then the original again when practical. If the problem follows the original, reapply the fix and repeat the sweep. If it follows a device but you still don’t know why, test the pieces and settings within that path."}</p>
          </li>
        </ol>
        <p><strong>Bench example.</strong> {"In one bench comparison, the same earpiece measured with less bass through one Qudelix unit than through another playback device. The difference was associated with the playback path in that comparison. The cause is still unknown."}</p>
        <p>{"The technical PDF shows what to test next in each branch of a missing-bass example. "}<a href={technicalGuideSection("isolation")}>See the method and worked example in the technical PDF</a>.</p>
        <h2 id="common-measurement-mistakes">Common measurement mistakes</h2>
        <p>Use these bench demonstrations to decide what to test first. Each pattern is a clue. Follow <a href="#isolate-a-measurement-difference">the step-by-step checks</a> to see which change affects your sweep.</p>
        <h3 id="no-rew-input">REW shows no input</h3>
        <p>Keep playback low. Confirm the coupler mic is in the mic input, then choose that device and channel in the computer and in REW. Check whether the computer’s input meter responds. If the computer sees the mic and REW still does not, check the app’s microphone permission. If the computer sees no input, check the splitter’s wiring and the coupler mic’s power requirement. <a href="https://www.roomeqwizard.com/help/help_en-GB/html/calsoundcard.html">REW input setup</a>.</p>
        <h3 id="wrong-input">Wrong input</h3>
        <p>In Figure 08, the red line is jagged everywhere, yet REW still made a neatly named measurement. REW was recording the wrong input. Check the input device and channel in REW and in your computer&#x27;s sound settings.</p>
        <figure className="iem-guide-figure" id="figure-08"><a href="/guides/iem-measurement/figure-08.png" aria-label="Open full-size Figure 08"><img src="/guides/iem-measurement/figure-08.png" width={1975} height={1024} alt="Wrong recording input" loading="lazy" decoding="async" /></a><figcaption><strong>Figure 08 · Wrong recording input</strong><span>Wrong-input demonstration. Confirm the recording device and channel in the Measure dialog before taking a new sweep.</span><ol className="iem-guide-callouts" aria-label="Image callout notes"><li>Erratic solid red magnitude response. Reject this capture.</li><li>REW still created a named measurement.</li></ol></figcaption></figure>
        <h3 id="leaky-seal">Leaky seal</h3>
        <p>In Figure 09, the ear tip was loose and angled, leaving a gap. The blue bass is ragged and far below the rest of the curve. Reseat the tip and check that the bass comes back.</p>
        <figure className="iem-guide-figure" id="figure-09"><a href="/guides/iem-measurement/figure-09.png" aria-label="Open full-size Figure 09"><img src="/guides/iem-measurement/figure-09.png" width={1983} height={1028} alt="Loose fit and missing seal" loading="lazy" decoding="async" /></a><figcaption><strong>Figure 09 · Loose fit and missing seal</strong><span>Loose-fit demonstration with the AKG EO-IG955. Reseat the tilted tip and check whether the bass returns.</span><ol className="iem-guide-callouts" aria-label="Image callout notes"><li>Low and irregular bass on the solid blue trace.</li><li>Blue magnitude trace rising into the mids.</li></ol></figcaption></figure>
        <h3 id="playback-too-quiet">Playback too quiet</h3>
        <p>In Figure 10, the tip sealed well but the playback level was too low. The orange bass is jagged while the upper curve still looks recognizable. That fits a low signal-to-noise ratio, meaning the test sound was too close to the background noise. Raise playback slightly and watch headroom.</p>
        <figure className="iem-guide-figure" id="figure-10"><a href="/guides/iem-measurement/figure-10.png" aria-label="Open full-size Figure 10"><img src="/guides/iem-measurement/figure-10.png" width={1983} height={1028} alt="Sealed fit at low playback volume" loading="lazy" decoding="async" /></a><figcaption><strong>Figure 10 · Sealed fit at low playback volume</strong><span>Low-playback demonstration with a good seal. Keep the fit in place, run Check levels, then raise playback slightly and check headroom.</span><ol className="iem-guide-callouts" aria-label="Image callout notes"><li>Jagged low-frequency magnitude on the solid orange trace.</li><li>The orange trace still shows a recognizable upper-frequency contour.</li></ol></figcaption></figure>
        <h3 id="both-levels-too-high">Overloaded or misrouted recording</h3>
        <p>On the bench, we found that playback volume and microphone gain were both set too high. Figure 12 shows what REW saw: 33.4% measurement distortion and 0.0 dB of headroom, meaning the input had no room left before clipping. The selected input says <strong>Sidetone Mixing</strong>. Which signal reached REW through that input is unverified, so the warnings tell us to discard the sweep and leave the cause open.</p>
        <figure className="iem-guide-figure" id="figure-12"><a href="/guides/iem-measurement/figure-12.png" aria-label="Open full-size Figure 12"><img src="/guides/iem-measurement/figure-12.png" width={1532} height={1151} alt="High measurement distortion" loading="lazy" decoding="async" /></a><figcaption><strong>Figure 12 · High measurement distortion</strong><span>REW warned about the recording it received. Verify that REW is actually hearing the coupler microphone before using another sweep.</span><ol className="iem-guide-callouts" aria-label="Image callout notes"><li>REW displayed 33.4% measurement distortion across this capture chain.</li><li>0.0 dB input headroom.</li><li>The selected input reads Sidetone Mixing.</li></ol></figcaption></figure>
        <p>Figure 13 shows the unusable sweep. To try again, set playback volume and microphone gain low and verify the coupler mic input in REW. With the IEM in the coupler, run <strong>Check levels</strong>, adjust one control at a time, then take a fresh sweep. <a href="https://www.roomeqwizard.com/help/help_en-GB/html/makingmeasurements.html">REW’s guide to headroom and clipping</a>.</p>
        <figure className="iem-guide-figure" id="figure-13"><a href="/guides/iem-measurement/figure-13.png" aria-label="Open full-size Figure 13"><img src="/guides/iem-measurement/figure-13.png" width={1978} height={1024} alt="Flat trace from the invalid run" loading="lazy" decoding="async" /></a><figcaption><strong>Figure 13 · Flat trace from the invalid run</strong><span>Discard this result for EQ and channel matching. Verify routing, back off both level controls and remeasure.</span><ol className="iem-guide-callouts" aria-label="Image callout notes"><li>Nearly flat solid red magnitude trace.</li><li>The red magnitude trace drops sharply near the sweep edge.</li></ol></figcaption></figure>
        <p>For more detail on what to check when a sweep looks wrong, see <a href={technicalGuideSection("examples")}>the troubleshooting examples in the technical PDF</a>.</p>
        <h2 id="compare-your-sweep-to-a-known-measurement">Compare your sweep to a known measurement</h2>
        <p>A <strong>reference response</strong> is a trusted published measurement of the same earphone before any EQ. It helps you catch a rig that repeats well but is consistently off. You can use a trusted raw response from any source. Here we download the AKG example from PEQdB Studio and compare it in REW. Graphs from a different fixture, such as a Brüel &amp; Kjær 5128, won&#x27;t line up directly.</p>
        <ol><li>In <a href="https://peqdb.com/studio/">PEQdB Studio</a>, select <strong>AKG EO-IG955</strong> under <strong>PEQdB</strong>.</li><li>Choose the variant <strong>Spinfit W1 - v2</strong>.</li><li>Click the downward download arrow on that graph card to save its response text file.</li><li>In REW, choose <strong>File &gt; Import Frequency Response</strong> and open that file.</li><li>Open the <strong>All SPL</strong> graph and show your sweeps with the reference.</li><li>Use the same smoothing on every trace, and leave EQ and target compensation off.</li><li>In <strong>Measurement actions</strong>, add a temporary SPL offset so the traces line up near 1 kHz.</li><li>Remove the offsets afterward and keep your original files unchanged.</li></ol>
        <p>Smoothing softens small ripples on the graph. The reference export names the tip and variant, but not the exact coupler or insertion depth used.</p>
        <figure className="iem-guide-figure" id="figure-16"><a href="/guides/iem-measurement/figure-16.jpg" aria-label="Open full-size Plot A"><img src="/guides/iem-measurement/figure-16.jpg" width={2080} height={760} alt="Three measured frequency responses. The PEQdB reference and the two bench AKG sweeps agree broadly in bass and mids, with larger treble differences." loading="lazy" decoding="async" /></a><figcaption><strong>Plot A · AKG EO-IG955 against the PEQdB Studio reference</strong><span>Bench left and right are the saved Pair 2 sweeps with medium SpinFit W1 tips. The published line is PEQdB’s Spinfit W1 - v2 response. Each trace is aligned at 1 kHz for comparison. The shaded treble region is especially sensitive to the fixture and fit.</span></figcaption></figure>
        <p>Plot A lines up the published reference with this bench&#x27;s left and right sweeps of the same model on medium SpinFit W1 tips, each set to 0 dB at 1 kHz. The bass and midrange broadly agree. The upper treble differs more, especially above 10 kHz, where small changes in fit and fixture matter most. Because the traces were aligned, this view compares shape only, not loudness or left/right balance.</p>
        <p>For more on aligning traces and deciding which differences to trust, see <a href={technicalGuideSection("reference")}>the reference comparison in the technical PDF</a>.</p>
        <p>If your own repeats agree but a published curve still differs, compare the tip, depth, coupler, playback output and EQ state. Drive devices can interact differently with some IEMs. The <a href={technicalGuideSection("advanced")}>advanced comparison checks in the PDF</a> explain what else to record and test.</p>
        <h2 id="rule-out-fit-problems-before-eq">Rule out fit problems before EQ</h2>
        <p>If repeats disagree or the treble jumps around, check the fit before you build an EQ. Keep the same side, tip, approximate depth and audio settings, and change only one thing per sweep. Each item below is something to test. Use a new sweep to confirm the cause before drawing a conclusion.</p>
        <ol><li><strong>Weak or leaky seal:</strong> look all around the tip edge for a crease or tiny air gap.</li><li><strong>Uneven squeeze:</strong> a tilted or clamped tip can deform on one side, so reseat it squarely.</li><li><strong>Folded or squeezed bore:</strong> check that the tip’s center opening stays clear.</li><li><strong>Covered vent:</strong> keep tape, cotton and the holder clear of vents on the shell.</li><li><strong>Movement or vibration:</strong> pad hard contact points, leave cable slack and let the fixture settle.</li></ol>
        <figure className="iem-guide-figure" id="figure-17"><a href="/guides/iem-measurement/figure-17.jpg" aria-label="Open full-size Plot B"><img src="/guides/iem-measurement/figure-17.jpg" width={2080} height={760} alt="Overlay of the same left AKG earpiece at two insertion depths. The bass curves mostly overlap, while the marked treble peak moves from 7.7 to 9.2 kHz." loading="lazy" decoding="async" /></a><figcaption><strong>Plot B · Same AKG earpiece at two insertion depths</strong><span>Saved left-earpiece sweeps from the ET100AB Large REW session on November 14, 2026. The shallower fit peaks near 7.7 kHz and the deeper fit peaks near 9.2 kHz. Both traces are aligned at 1 kHz.</span></figcaption></figure>
        <p>Plot B compares a shallower and a deeper fit of the same left AKG earpiece with a large ET100AB ear tip. The bass stays similar, but a narrow treble peak moves from about 7.7 kHz to about 9.2 kHz. Use <a href="#fit-resonance">the resonance check</a> to compare insertion on your own bench. Build EQ from features that repeat across reseats.</p>
        <h2 id="make-an-eq-from-your-measurements-optional">Make an EQ from your measurements (optional)</h2>
        <p>A <strong>target curve</strong> is the sound balance you want, and <strong>target EQ</strong> moves your measurement toward it. Channel matching is a separate left/right correction. The example below uses YinYang EQ. If you use PEQdB Studio or another EQ tool, check that it can import your response files and export a preset for your player. For channel matching, choose a tool that accepts left and right responses separately.</p>
        <p>{"Choose a target documented for your type of coupler. Start with broad features that repeat across reseats. A narrow dip that moves when you change the fit is a poor candidate for a large boost. Leave room for boosts and check the combined preamp when you use both target EQ and channel matching."}</p>
        <p><strong>Load your measurement.</strong></p>
        <ol><li>Open <a href="https://yinyangeq.com/preference-tuning">Preference Tuning</a>.</li><li>In <strong>Headphones and Target</strong>, choose <strong>In-Ear</strong>, then <strong>Use my file</strong> (some screens say <strong>Use my measurement file</strong>).</li><li>Expand <strong>Add a headphone measurement</strong> if needed, and enter a name, the earphone model and your rig.</li><li>Choose <strong>Separate Left and Right responses</strong> and drop each baseline file into its matching box.</li><li>Select <strong>Save measurement</strong>, then select the saved measurement.</li></ol>
        <figure className="iem-guide-figure" id="figure-14"><a href="/guides/iem-measurement/figure-14.jpg" aria-label="Open full-size Figure 14"><img src="/guides/iem-measurement/figure-14.jpg" width={871} height={332} alt="YinYang EQ measurement editor showing Separate Left and Right responses selected and two file drop zones." loading="lazy" decoding="async" /></a><figcaption><strong>Figure 14 · Import separate Left and Right responses</strong><span>Choose Separate Left and Right responses, then put each uncorrected response file in its matching channel box.</span></figcaption></figure>
        <p>Your files are measurements, not presets, even though both can end in .txt. Contributing them to research is a separate choice.</p>
        <h3 id="generate-target-eq">Generate target EQ</h3>
        <p>In <strong>Target</strong>, choose a curve documented for your type of coupler. Choose <strong>Generate My EQ</strong>, select a fitting in <strong>EQ results</strong>, and choose <strong>Download selected EQ</strong> or save it. For an external player, the target EQ export contains the shared filters and their preamp.</p>
        <figure className="iem-guide-figure" id="figure-15"><a href="/guides/iem-measurement/figure-15.jpg" aria-label="Open full-size Figure 15"><img src="/guides/iem-measurement/figure-15.jpg" width={1012} height={378} alt="YinYang EQ shows channel-match export buttons above the separate Generate My EQ button" loading="lazy" decoding="async" /></a><figcaption><strong>Figure 15 · Two separate EQ outputs</strong><span>The lower button generates target EQ. The upper buttons export the optional left/right correction. This screen uses synthetic example data.</span></figcaption></figure>
        <h3 id="optional-channel-match">Match left and right (optional)</h3>
        <p><strong>YinYang AutoMatch</strong> is the site’s automatic channel matching. It uses your saved left and right measurements to work out a separate EQ correction for each side so their response curves sit closer together. Target EQ is a separate setting.</p>
        <p>If a left/right difference survives clean reseats and you want to correct it, turn on <strong>Channel match</strong> under <strong>Listening options</strong>. For an external player, export one of these formats from the <strong>Channel match</strong> panel:</p>
        <ul><li><strong>Download TXT (IIR)</strong> gives editable left/right EQ filters that approximate AutoMatch.</li><li><strong>Download WAV (FIR)</strong> gives a stereo correction file for a convolver, an EQ tool that loads this kind of file. The export is 48 kHz and adds delay.</li></ul>
        <p>Apply each correction once. Keep the preamp settings, which leave room for boosts, and check the combined headroom if you use both stages. <a href={technicalGuideSection("eq")}>See target EQ in the PDF</a> or <a href={technicalGuideSection("match")}>see the channel-match exports</a>.</p>
        <h2 id="check-the-eq-with-a-new-sweep">Check the EQ with a new sweep</h2>
        <p>{"Make sure the sweep passes through the active EQ. For system-wide or device EQ, select that output path in REW. For player-only EQ, use REW file playback and play the same measurement sweep in that player with EQ off and on. Keep the IEM in the coupler, start low and recheck headroom."} See <a href="https://www.roomeqwizard.com/help/help_en-GB/html/makingmeasurements.html">REW’s file-playback instructions</a>.</p>
        <p>Keep the same fit and REW settings for the comparison. Save it in <strong>Responses</strong> as a verified result, separate from any predicted curve. If the whole curve sits lower, check whether the preamp reduced the overall level before you compare shapes.</p>
        <figure className="iem-guide-figure" id="eq-check-example"><a href="/guides/iem-measurement/channel-match-off.png" aria-label="Open the full-size stock reference illustration"><img src="/guides/iem-measurement/channel-match-off.png" width={1501} height={404} alt="Stock reference with EQ off. The solid blue left trace sits clearly above the dashed orange right trace across the graph." loading="lazy" decoding="async" /></a><figcaption><strong>Before · Stock reference, EQ off (illustrated)</strong><span>Based on measured Simgot EM6L with stock tips, with an intentional left/right mismatch added for demonstration. All three charts use the same scale and reference level.</span></figcaption></figure>
        <figure className="iem-guide-figure" id="eq-check-partial"><a href="/guides/iem-measurement/channel-match-practical.png" aria-label="Open the full-size example of a good channel match in practice"><img src="/guides/iem-measurement/channel-match-practical.png" width={1501} height={404} alt="Example of a good match in practice. The solid blue and dashed orange traces overlap closely, with narrow gaps around a few upper-treble peaks and dips." loading="lazy" decoding="async" /></a><figcaption><strong>Good match in practice (illustrated)</strong><span>The curves track closely, with only a few narrow treble gaps. That can be a good result on a 711.</span></figcaption></figure>
        <figure className="iem-guide-figure" id="eq-check-after"><a href="/guides/iem-measurement/channel-match-ideal.png" aria-label="Open the full-size ideal channel match illustration"><img src="/guides/iem-measurement/channel-match-ideal.png" width={1501} height={404} alt="Ideal illustrated match. The solid blue left trace and the dashed orange right trace overlap across the graph." loading="lazy" decoding="async" /></a><figcaption><strong>Ideal channel match (illustrated)</strong><span>The calculated goal puts both traces at the average of the two stock levels at each frequency.</span></figcaption></figure>
        <p>To check your result, overlay the left and right EQ-on sweeps at their measured levels. Aligning each side at 1 kHz can hide a real level difference.</p>
        <p>Shading starts at 8 kHz, where a small change in how deep the ear tip sits can shift peaks and dips. The dashed line at 10 kHz marks the end of the IEC 60318-4 ear-simulation range. Peaks from the coupler itself make details beyond that line approximate. <a href="https://webstore.iec.ch/en/publication/1445">IEC 60318-4 scope</a> · <a href="https://crinacle.com/2020/04/08/graphs-101-how-to-read-headphone-measurements/0/">In-Ear Fidelity’s insertion-depth test</a> · <a href="https://www.grasacoustics.com/products/ear-simulator/product/248-ra0045">GRAS on coupler resonance</a></p>
        <p>If a small, narrow treble gap shifts or disappears when you take the earpiece out and put it back, that’s normal fit variation and usually fine to leave alone. Look into broad gaps that repeat. Keep the same earpiece seated as you repeat EQ off and on, then do the same for the other side. <a href={technicalGuideSection("verify")}>See how to verify the match in the PDF</a>.</p>
        <h2 id="references">References</h2>
        <ol><li><a href="https://webstore.iec.ch/en/publication/1445">IEC 60318-4:2010, IEC Webstore</a></li><li><a href="https://www.roomeqwizard.com/help/help_en-GB/html/makingmeasurements.html">REW Help: Making Measurements</a></li><li><a href="https://www.roomeqwizard.com/help/help_en-GB/html/soundcard.html">REW Help: Soundcard Preferences</a></li><li><a href="https://www.roomeqwizard.com/help/help_en-GB/html/inputcal.html">REW Help: Calibrating the SPL Reading</a></li><li><a href="https://www.roomeqwizard.com/help/help_en-GB/html/dataimport.html">REW Help: Importing Measurement Data</a></li><li><a href="https://www.roomeqwizard.com/help/help_en-GB/html/graph_allspl.html">REW Help: All SPL Graph</a></li><li><a href="https://www.roomeqwizard.com/help/help_en-GB/html/file.html">REW Help: File Menu</a></li><li><a href="https://capraaudio.com/products/iec-711-iem-holder">Capra Audio IEC 711 IEM Holder</a></li><li><a href="https://peqdb.com/studio/">PEQdB Studio, AKG EO-IG955 (Spinfit W1 - v2)</a></li><li><a href="https://yinyangeq.com/preference-tuning">YinYang EQ Preference Tuning</a></li><li><a href="https://spinfit-eartip.com/?lang=eng">SpinFit ear tips</a></li></ol>
        <h2 id="bench-checklist">Bench checklist</h2>
        <p>Work through these checks in order. If a result does not repeat, start with <a href="#isolate-a-measurement-difference">the troubleshooting method</a> before comparing graphs.</p>
        <fieldset className="iem-guide-checklist">
          <legend>{"Set up the hardware"}</legend>
          <ol>
            <li>
              <input id="bench-equipment" type="checkbox" aria-describedby="bench-equipment-detail" />
              <div>
                <label htmlFor="bench-equipment">{"Gather the equipment."}</label>
                <p id="bench-equipment-detail">{"Have REW, the 711 coupler and mic, a steady holder, the IEM and tips, a headphone output and a compatible mic input."}</p>
              </div>
            </li>
            <li>
              <input id="bench-wire" type="checkbox" aria-describedby="bench-wire-detail" />
              <div>
                <label htmlFor="bench-wire">{"Connect both signal paths."}</label>
                <p id="bench-wire-detail">{"Plug the IEM into headphone out and the coupler mic into mic in. If they share a headset jack, use a compatible splitter and check whether the mic needs bias power."} <a href="#check-the-playback-and-recording-connections">Wiring and bias</a>.</p>
              </div>
            </li>
            <li>
              <input id="bench-baseline-state" type="checkbox" aria-describedby="bench-baseline-state-detail" />
              <div>
                <label htmlFor="bench-baseline-state">{"Start with a plain signal path."}</label>
                <p id="bench-baseline-state-detail">{"Turn off playback EQ, loudness effects, automatic gain and mic noise suppression. Check that the computer sees the intended playback and recording devices."}</p>
              </div>
            </li>
            <li>
              <input id="bench-mount" type="checkbox" aria-describedby="bench-mount-detail" />
              <div>
                <label htmlFor="bench-mount">{"Mount the earpiece and check the seal."}</label>
                <p id="bench-mount-detail">{"Note the side and tip model and size. Seal gently, keep the tip opening and vents clear, steady the holder and leave the cable slack."} <a href="#mount-the-iem-gently">Mounting and seal</a>.</p>
              </div>
            </li>
          </ol>
        </fieldset>
        <fieldset className="iem-guide-checklist">
          <legend>{"Set up REW and run the first sweep"}</legend>
          <ol>
            <li>
              <input id="bench-preferences" type="checkbox" aria-describedby="bench-preferences-detail" />
              <div>
                <label htmlFor="bench-preferences">{"Choose the devices, channels and sample rate."}</label>
                <p id="bench-preferences-detail">{"In Preferences, open Soundcard and select the IEM output and coupler mic input. Set output L or R for the side and the actual mic channel separately. Use 44.1 or 48 kHz consistently."} <a href="#set-up-room-eq-wizard">REW controls</a>.</p>
              </div>
            </li>
            <li>
              <input id="bench-measure" type="checkbox" aria-describedby="bench-measure-detail" />
              <div>
                <label htmlFor="bench-measure">{"Open Measure and name the run."}</label>
                <p id="bench-measure-detail">{"Choose SPL, Sweep, From REW and Single measurement. For the example use 20–20,000 Hz, 128k, −12 dBFS and No timing reference. Confirm Input and Output."}</p>
              </div>
            </li>
            <li>
              <input id="bench-check-levels" type="checkbox" aria-describedby="bench-check-levels-detail" />
              <div>
                <label htmlFor="bench-check-levels">{"Start low and run Check levels."}</label>
                <p id="bench-check-levels-detail">{"With the IEM in the coupler, start playback volume and mic gain low. In Measure, choose Check levels. Fix missing input before raising volume."} <a href="#check-levels-before-the-sweep">Level checks</a>.</p>
              </div>
            </li>
            <li>
              <input id="bench-start" type="checkbox" aria-describedby="bench-start-detail" />
              <div>
                <label htmlFor="bench-start">{"Start the sweep and inspect it."}</label>
                <p id="bench-start-detail">{"Check for clipping or a stopped sweep. Confirm REW is recording the coupler mic. Repeat the same run and compare the two traces before reseating."} <a href="#run-first-sweep">Run and read the sweep</a>.</p>
              </div>
            </li>
            <li>
              <input id="bench-fixed-repeat" type="checkbox" aria-describedby="bench-fixed-repeat-detail" />
              <div>
                <label htmlFor="bench-fixed-repeat">{"Repeat once without moving the earpiece."}</label>
                <p id="bench-fixed-repeat-detail">{"Save both runs. If they disagree, look for movement, background noise or routing trouble. Use the troubleshooting method before swapping multiple parts."}</p>
              </div>
            </li>
          </ol>
        </fieldset>
        <fieldset className="iem-guide-checklist">
          <legend>{"Repeat and save the left and right sweeps"}</legend>
          <ol>
            <li>
              <input id="bench-reseat" type="checkbox" aria-describedby="bench-reseat-detail" />
              <div>
                <label htmlFor="bench-reseat">{"Reseat each side three to five times."}</label>
                <p id="bench-reseat-detail">{"Remove and reinsert between runs. Switch playback L or R for each side. Keep the mic channel, levels and other settings fixed. Save valid and failed runs."}</p>
              </div>
            </li>
            <li>
              <input id="bench-peak" type="checkbox" aria-describedby="bench-peak-detail" />
              <div>
                <label htmlFor="bench-peak">{"Check that both sides sit at a similar depth."}</label>
                <p id="bench-peak-detail">{"If both sides show a clear depth-sensitive peak around 7–10 kHz, compare its frequency. About 8 kHz is a starting point. Keep the seal and preserve the measured dB levels."} <a href="#fit-resonance">Why the peak moves</a>.</p>
              </div>
            </li>
            <li>
              <input id="bench-select" type="checkbox" aria-describedby="bench-select-detail" />
              <div>
                <label htmlFor="bench-select">{"Choose representative, clean left and right sweeps."}</label>
                <p id="bench-select-detail">{"Choose a trace near the middle of the clean repeats for each side. Keep the individual runs. Exclude leaks, wrong inputs and clipping from averages."}</p>
              </div>
            </li>
            <li>
              <input id="bench-save" type="checkbox" aria-describedby="bench-save-detail" />
              <div>
                <label htmlFor="bench-save">{"Save the REW session and export L and R."}</label>
                <p id="bench-save-detail">{"Save the .mdat and separate frequency-response text files in Measurements. Keep baseline levels unchanged. Store filters in EQ and predicted or remeasured results in Responses."} <a href="#save-and-export-your-measurements">Saving and exporting</a>.</p>
              </div>
            </li>
          </ol>
        </fieldset>
        <fieldset className="iem-guide-checklist">
          <legend>{"Compare with another sweep or verify EQ if needed"}</legend>
          <ol>
            <li>
              <input id="bench-compare-setup" type="checkbox" aria-describedby="bench-compare-setup-detail" />
              <div>
                <label htmlFor="bench-compare-setup">{"Compare the same setup details first."}</label>
                <p id="bench-compare-setup-detail">{"Confirm physical earpiece or model variant, side, tip, depth, rig, drive device and EQ state. Even the same earpiece can measure differently on another bench."} <a href="#compare-your-sweep-to-a-known-measurement">Published reference comparison</a>.</p>
              </div>
            </li>
            <li>
              <input id="bench-compare-graph" type="checkbox" aria-describedby="bench-compare-graph-detail" />
              <div>
                <label htmlFor="bench-compare-graph">{"Use equivalent graphs."}</label>
                <p id="bench-compare-graph-detail">{"Use the same scale and smoothing and compare raw with raw. Align copies near 1 kHz for shape. Keep the baseline levels and use calibrated rigs for absolute SPL comparisons."}</p>
              </div>
            </li>
            <li>
              <input id="bench-compare-treble" type="checkbox" aria-describedby="bench-compare-treble-detail" />
              <div>
                <label htmlFor="bench-compare-treble">{"Check whether the difference survives a reseat."}</label>
                <p id="bench-compare-treble-detail">{"A narrow moving peak or dip is fit-sensitive. Use extra care around 8–10 kHz and treat details above 10 kHz as rough comparisons."}</p>
              </div>
            </li>
            <li>
              <input id="bench-fit-eq" type="checkbox" aria-describedby="bench-fit-eq-detail" />
              <div>
                <label htmlFor="bench-fit-eq">{"If making EQ, check the inputs and headroom."}</label>
                <p id="bench-fit-eq-detail">{"Import the uncorrected left and right files. Choose a target for the rig, avoid chasing deep dips that move, and apply each correction once with enough preamp headroom."}</p>
              </div>
            </li>
            <li>
              <input id="bench-verify-eq" type="checkbox" aria-describedby="bench-verify-eq-detail" />
              <div>
                <label htmlFor="bench-verify-eq">{"If verifying EQ, sweep through the active preset."}</label>
                <p id="bench-verify-eq-detail">{"Confirm the test tone passes through the EQ. Remeasure with the same fit and settings and save the verified result separately from the prediction."} <a href="#check-the-eq-with-a-new-sweep">Sweeping through EQ</a>.</p>
              </div>
            </li>
          </ol>
        </fieldset>
        <h2 id="find-answers-by-question">Find answers by question</h2>
        <ul className="iem-guide-question-index">
          <li><a href="#isolate-a-measurement-difference">{"What went wrong with my sweep?"}</a><span>{"Start here to repeat the symptom and rule out one variable at a time."}</span></li>
          <li><a href="#no-rew-input">{"Why does REW show no input?"}</a><span>{"Confirm the coupler mic, OS input meter, microphone permission and connector wiring."}</span></li>
          <li><a href="#wrong-input">{"Why did REW record noise or the wrong input?"}</a><span>{"Check the coupler microphone, device and channel."}</span></li>
          <li><a href="#leaky-seal">{"Why is my bass missing?"}</a><span>{"Start with the seal, then check playback level and the output path."}</span></li>
          <li><a href="#check-levels-before-the-sweep">{"Why is my sweep clipped or distorted?"}</a><span>{"Check playback volume, mic gain and headroom."}</span></li>
          <li><a href="#measure-both-sides-and-repeat-the-fit">{"Why do measurements change when I reseat the earpiece?"}</a><span>{"Check fit and learn how to judge repeat sweeps."}</span></li>
          <li><a href="#fit-resonance">{"Should I line up the peaks near 8 kHz?"}</a><span>{"Use peak frequency as a fit check when both peaks respond to depth."}</span></li>
          <li><a href="#compare-your-sweep-to-a-known-measurement">{"Why doesn’t my sweep match someone else’s?"}</a><span>{"Compare the fit, rig and graph settings before interpreting the difference."}</span></li>
          <li><a href="#make-an-eq-from-your-measurements-optional">{"When can I use the sweeps to make EQ?"}</a><span>{"Start with repeatable, uncorrected left and right sweeps."}</span></li>
          <li><a href="#check-the-eq-with-a-new-sweep">{"Why doesn’t REW show the EQ I applied?"}</a><span>{"Check that the sweep actually passes through the active EQ."}</span></li>
          <li><a href="#compare-your-sweep-to-a-known-measurement">{"What else can change a comparison?"}</a><span>{"Check drive impedance, calibration, clocks and the listening fit."}</span></li>
        </ul>
        <aside className="iem-guide-handbook iem-guide-handbook-end" aria-labelledby="iem-guide-handbook-download">
          <h2 id="iem-guide-handbook-download">Technical reference for the bench</h2>
          <p>Keep a copy of the 711 coupler handbook nearby when you measure. It collects the cable checks, annotated REW controls, failed-sweep examples, a known-good swap checklist, and steps for comparing and saving your results.</p>
          <a className="iem-guide-handbook-link" href={`${technicalGuidePdf}?download=1`} download={technicalGuideFilename}>Download the technical guide (PDF)</a>
          <p className="iem-guide-checklist-download"><a href={benchChecklistPdf}>See checklist</a></p>
        </aside>
        <details className="iem-guide-revisions">
          <summary>Revision notes</summary>
          <ul>
            {guideRevisions.map((revision) => (
              <li key={revision.number}>
                <strong>Revision {String(revision.number).padStart(2, "0")}</strong>
                {" · "}<time dateTime={revision.date}>{revision.date}</time>{" · "}{revision.summary}
              </li>
            ))}
          </ul>
        </details>
      </article>
    </main>
  );
}
