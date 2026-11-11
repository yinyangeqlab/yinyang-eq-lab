import Image from "next/image";
import TermsReference from "@/components/terms-reference";
import { shareMetadata } from "@/lib/share-metadata";
import "./style.css";

export const metadata = shareMetadata("/glossary");
export default function GlossaryPage() {
  return <main className="terms-page"><header><span>QUICK REFERENCE</span><h1>Terms &amp; definitions</h1><p>A reference for the words and abbreviations used around the site.</p></header>
    <TermsReference />
    <EqFitting />
    <footer><p>Technical references: <a href="https://webaudio.github.io/web-audio-api/">Web Audio specification</a> · <a href="https://tech.ebu.ch/publications/r128">EBU loudness terminology</a>.</p><p>The site uses its own comparison rules; these links do not imply that it implements a complete laboratory or broadcast standard.</p></footer>
  </main>;
}

function EqFitting() {
  return <section id="eq-fitting" className="eq-fitting-guide" aria-labelledby="eq-fitting-title">
    <h2 id="eq-fitting-title">How EQ fits a target</h2>
    <p>YinYang starts with your headphone measurement and chooses EQ filters that bring it closer to the target.</p>
    <ul>
      <li><strong>Standard · Fixed bands</strong> adjusts the gains of filters at preset frequencies.</li>
      <li><strong>Precise · Movable bands</strong> places filters where the response still needs correction.</li>
      <li><strong>PEQdB AutoEQ</strong> fits bell filters and bass and treble shelves together. <strong>Unsmoothed</strong>, the default within PEQdB, follows finer details in the measurement. <strong>Smoothed</strong> uses adaptive smoothing for the headphone type, which can leave more error against the original curve and need less boost.</li>
    </ul>
    <p>PEQdB Studio calls its smoothed and unsmoothed presets Standard and Precise. YinYang uses Standard and Precise for its own fixed- and movable-band fitters. <a href="https://peqdb.com/studio/">PEQdB Studio</a> · <a href="https://github.com/peqdb/autoeq-c">PEQdB AutoEQ source</a></p>

    <h3>Seven measurements, two band counts</h3>
    <p>We tested four in-ear and three over-ear measurements at 10 and 15 bands. All six fitters used the same measurement and target within each case, at 48 kHz.</p>
    <figure>
      <Image src="/share/eq-fitter-benchmark.jpg" alt="Median error and peak boost across 14 cases. YinYang PEQdB has the lowest RMS error through 10 kHz at 0.13 dB. YinYang Movable Bands has the lowest RMS error through 20 kHz at 0.42 dB. Studio Standard has the lowest peak boost at 1.64 dB." width={2088} height={1218} unoptimized/>
      <figcaption><a href="/share/eq-fitter-benchmark.jpg">Open full-size graph</a> · <a href="https://github.com/yinyangeqlab/yinyang-eq-lab/blob/main/public/eq-fitting/eq-fitter-scores.csv">View scores (CSV)</a></figcaption>
    </figure>
    <p>We removed one overall level offset per fit across the full range, then measured root mean square (RMS) error on a shared logarithmic grid. Lower RMS means the fit follows the supplied curve more closely. Peak boost is the highest gain of the combined filters before preamp attenuation. <a href="https://github.com/jaakkopasanen/AutoEq/tree/master/measurements/oratory1990">Measurements via AutoEq</a> · <a href="https://github.com/jaakkopasanen/AutoEq/tree/master/targets">AutoEq targets</a> · <a href="https://peqdb.com/studio/">Studio measurement and target</a></p>

    <h3>Why the winner changes at 20 kHz</h3>
    <p>Both scores use the same filters. Through 10 kHz, YinYang PEQdB Unsmoothed led in 10 of 14 cases, with Studio Precise leading in four. Aligning the curves using only the range through 10 kHz narrowed that split to eight and six. Through 20 kHz, YinYang Movable Bands led in eight cases and YinYang PEQdB Unsmoothed led in six.</p>
    <p>The movable bands followed the supplied curves more closely from 16 to 20 kHz in 13 of 14 cases compared with YinYang PEQdB Unsmoothed. The full-range score includes that region, and RMS gives large misses more weight because it squares the errors. When we limited the movable fitter's candidate filter centers to 16 kHz, its median full-range error rose from 0.42 to 0.98 dB.</p>

    <h3>How YinYang uses the PEQdB optimizer</h3>
    <p>YinYang uses PEQdB's open-source optimizer with a fixed level reference at 1 kHz for exports or across the midrange for listening comparisons. It runs 3,000 optimization steps. The Studio build we tested used 100 steps and could adjust overall gain during the fit. Our pinned Unsmoothed build starts tapering the requested correction at 18.5 kHz. Both presets in the tested Studio build started around 16 kHz. Applying Studio's taper to the same YinYang optimizer increased full-range error in all 14 cases. <a href="https://github.com/peqdb/autoeq-c/blob/fdc0db772164387c2df8739742594197c6851fc3/src/autoeq.c#L482-L518">PEQdB preprocessing source</a></p>
    <p>Studio Precise used less peak boost than YinYang PEQdB Unsmoothed in 12 of 14 cases. YinYang Smoothed lowered peak boost in 13 of 14 cases against its matched unsmoothed control and had more error against the original curve through 10 kHz in all 14. Smoothing softens narrow features before fitting, and lower boost leaves more headroom.</p>

    <h3>Curve fit and listening preference</h3>
    <p>The score compares a preset with a target on one measurement. How an earphone sits can shift narrow peaks and dips, so a correction that follows one measurement closely may miss those features on the next insertion. Older insert-earphone couplers are specified to simulate the ear through 10 kHz. Upper treble can still matter. A speech study found that young listeners could detect the loss of content above about 13 kHz on average, and the size of the audible difference depends on the listener, recording and correction. <a href="https://webstore.iec.ch/en/publication/1445">IEC 60318-4</a> · <a href="https://zenodo.org/records/4280526">Earphone reinsertion study</a> · <a href="https://pubmed.ncbi.nlm.nih.gov/31893732/">Monson and Caravello (2019)</a></p>
    <p>A level-matched blind comparison can tell you which preset you prefer on your headphones.</p>
  </section>;
}
