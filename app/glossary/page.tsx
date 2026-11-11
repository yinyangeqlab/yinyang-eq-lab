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
    <p>PEQdB Studio calls its smoothed and unsmoothed presets Standard and Precise. Those names refer to different fitters in YinYang. YinYang also uses a fixed level reference and a different optimization budget. <a href="https://peqdb.com/studio/">PEQdB Studio</a> · <a href="https://github.com/peqdb/autoeq-c">PEQdB AutoEQ source</a></p>

    <h3>Seven measurements, two band counts</h3>
    <p>We tested four in-ear and three over-ear measurements at 10 and 15 bands. Through 10 kHz, YinYang PEQdB had the lowest error in 10 of 14 cases and Studio Precise led in four. The smoothed YinYang test fit reduced peak boost in 13 cases compared with its unsmoothed control, while leaving more error through 10 kHz in all 14.</p>
    <figure>
      <Image src="/share/eq-fitter-benchmark.jpg" alt="Median error and peak boost across 14 cases. YinYang PEQdB has the lowest RMS error through 10 kHz at 0.13 dB. YinYang Movable Bands has the lowest RMS error through 20 kHz at 0.42 dB. Studio Standard has the lowest peak boost at 1.64 dB." width={2088} height={1218} unoptimized/>
      <figcaption><a href="/share/eq-fitter-benchmark.jpg">Open full-size graph</a> · <a href="https://github.com/yinyangeqlab/yinyang-eq-lab/blob/main/public/eq-fitting/eq-fitter-scores.csv">View scores (CSV)</a></figcaption>
    </figure>
    <p>We used the same measurement, target and band count for each comparison at 48 kHz. We removed one overall level offset per fit and measured RMS error on a shared logarithmic grid. Peak boost measures the combined filters before preamp attenuation. The numbers describe curve fit and headroom. Listening determines which fit you prefer. <a href="https://github.com/jaakkopasanen/AutoEq/tree/master/measurements/oratory1990">Measurements via AutoEq</a> · <a href="https://github.com/jaakkopasanen/AutoEq/tree/master/targets">AutoEq targets</a> · <a href="https://peqdb.com/studio/">Studio measurement and target</a></p>

    <h3>Why report two frequency ranges?</h3>
    <p>We report 20 Hz–10 kHz alongside 20 Hz–20 kHz so you can see how the highest octave changes the score. In a study of 645 people, the level needed to hear tones between 9 and 20 kHz generally rose with frequency and age. Other experiments show that upper treble can still be audible. Young listeners in one speech study could detect the loss of content above about 13 kHz on average. <a href="https://pubmed.ncbi.nlm.nih.gov/24749665/">Rodríguez Valiente et al. (2014)</a> · <a href="https://doi.org/10.1121/1.5140032">Monson and Caravello (2019)</a></p>
    <p>High-frequency headphone response can also change with placement. One study found greater variability above 10 kHz for the headphones it tested. We use 10 kHz as a reporting boundary. The audibility of a particular EQ change depends on the listener, the recording and the size and width of the correction. <a href="https://www.sciencedirect.com/science/article/abs/pii/S0003682X15000341">Headphone placement study</a></p>
  </section>;
}
