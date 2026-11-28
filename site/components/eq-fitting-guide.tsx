import Image from "next/image";
import { Link2 } from "lucide-react";
import EqFitterRankings from "@/components/eq-fitter-rankings";
import snapshot from "@/data/eq-fitter-rankings.json";
import { EQ_FITTER_CHART, FITTER_GUIDE_PATH } from "@/lib/share-pages.mjs";

const sections = {
  benchmark: { id: "benchmark", title: "Benchmark results" },
  ranges: { id: "frequency-ranges", title: "How to interpret the scores" },
  optimizer: { id: "peqdb-optimizer", title: "How YinYang uses the PEQdB optimizer" },
  listening: { id: "listening-preference", title: "Curve fit and listening preference" },
};

const toolCount = new Set(snapshot.scores.map(row => row.tool)).size;
const benchmarkDate = new Intl.DateTimeFormat("en-US", { dateStyle: "long", timeZone: "UTC" });

function GuideHeading({ section: { id, title } }: { section: { id: string; title: string } }) {
  const label = `Link to ${title}`;
  return <h3 id={id}>{title} <a className="guide-section-link" href={`${FITTER_GUIDE_PATH}#${id}`} aria-label={label} title={label}><Link2 size={16} aria-hidden="true" /></a></h3>;
}

export default function EqFittingGuide({ showContents = false }: { showContents?: boolean }) {
  return <section id="eq-fitting" className="eq-fitting-guide" aria-labelledby="eq-fitting-title">
    <h2 id="eq-fitting-title">How EQ fits a target</h2>
    {showContents && <nav className="guide-jump-links" aria-label="On this page">
      {Object.values(sections).map(({ id, title }) => <a key={id} href={`#${id}`}>{title}</a>)}
    </nav>}
    <p>YinYang starts with your headphone measurement and chooses EQ filters that bring it closer to the target.</p>
    <ul>
      <li><strong>Standard · Fixed bands</strong> adjusts the gains of filters at preset frequencies.</li>
      <li><strong>Precise · Movable bands</strong> places filters where the response still needs correction.</li>
      <li><strong>PEQdB AutoEQ</strong> fits bell filters and bass and treble shelves together. <strong>Unsmoothed</strong>, the default within PEQdB, follows finer details in the measurement. <strong>Smoothed</strong> uses adaptive smoothing for the headphone type, which can leave more error against the original curve and need less boost.</li>
      <li><strong>Joint Fit 20</strong> refines the frequencies, gains and Q values of 20 filters together. It is available in Compare all fits when generating EQ settings.</li>
    </ul>
    <p>PEQdB Studio calls its smoothed and unsmoothed presets Standard and Precise. YinYang uses Standard and Precise for its own fixed- and movable-band fitters. <a href="https://peqdb.com/studio/">PEQdB Studio</a> · <a href="https://github.com/peqdb/autoeq-c">PEQdB AutoEQ source</a></p>

    <GuideHeading section={sections.benchmark} />
    <p>We compared {toolCount} browser-based tools on the same seven measurement–target pairs at 48 kHz, with four in-ear and three over-ear pairs. We requested 10, 15, 20 and 30 bands where available. The CSV gives the date and active filter count for each fit.</p>
    <p>The original results are from <time dateTime={snapshot.date}>{benchmarkDate.format(new Date(snapshot.date))}</time>. We added Joint Fit 20 on <time dateTime={snapshot.jointFit.date}>{benchmarkDate.format(new Date(snapshot.jointFit.date))}</time> using the same pairs and scoring. The table also shows <a href="#rootlessjamesdsp-reference">Loundess PEQ, a RootlessJamesDSP fork</a>, as an Android reference.</p>
    <EqFitterRankings />
    <p><a href="/eq-fitting/eq-fitter-web-scores.csv">Per-case scores (CSV)</a> · <a href="/eq-fitting/eq-fitter-scores.csv">Original six-fitter scores (CSV)</a></p>

    <GuideHeading section={sections.ranges} />
    <p><strong>RMS error</strong> measures the size of the difference between the target and the predicted response after EQ. We remove one level offset across the full grid, square the errors in the chosen range, average them, and take the square root. The samples are spaced logarithmically so each octave counts equally. The result is in dB. Lower is closer, and large misses count more.</p>
    <p><strong>Through 10 kHz</strong> means the score includes 20 Hz through 10 kHz. IEC 60318-4 insert-earphone simulators are specified to simulate the ear through 10 kHz. Above that, small changes in fit or insertion can shift peaks and dips. Scoring through 10 kHz reduces the influence of those shifts. The cutoff changes which errors count in the score. The filters are the same for every score. <a href="https://webstore.iec.ch/en/publication/1445">IEC 60318-4</a></p>
    <p><strong>Through 20 kHz</strong> checks the fit across the full supplied curve. The <strong>10–20 kHz</strong> score isolates the upper octave. Use the two together to see whether a full-range advantage comes from the upper treble. Bass and 5–10 kHz scores localize errors elsewhere. The 95th percentile is the error that 95% of sampled points fall at or below. Worst error is the single largest miss.</p>
    <p><strong>Peak boost</strong> is the greatest positive gain from the entire filter stack before preamp attenuation. A 6 dB peak boost can consume about 6 dB of digital headroom on signal at that frequency. Lower boost means less attenuation is needed to make room for the EQ. A preset can use little headroom and still leave substantial error.</p>
    <p>At 20 bands, Joint Fit 20 had the lowest median error on all seven error metrics. Its median RMS was 0.026 dB through 10 kHz and 0.025 dB through 20 kHz. Its median peak boost was 4.591 dB, fourth-lowest of 21 configurations. At 30 bands, modernGraphTool Exact match had 0.140 dB median full-range error.</p>
    <p>Squiglink’s automatic preset places filter centers up to 6 kHz. The 20 kHz configuration follows the supplied curves more closely, with more combined boost in the median 10-band fit. The tools retain their own smoothing, filter types and constraints, so these are results for the captured products and settings.</p>
    <p>Several graph sites share a fitter. Identical scores share a rank. These results describe the captured versions and the settings tested on each date. Later updates can change the rankings.</p>
    <p><a href="https://squig.link/">Squiglink by Super* Review</a> · <a href="https://eq.hangout.audio/">Hangout Audio EQ Tool</a> · <a href="https://autoeq.app/">AutoEq.app</a> · <a href="https://potatosalad775.github.io/modernGraphTool/docs/features/autoeq-benchmarks/">modernGraphTool</a> · <a href="https://tryptify.com/autoeq">Tryptify</a> · <a href="https://curvelab.fit/generator/">CurveLab</a></p>
    <details className="fitter-coverage">
      <summary>Original six-fitter chart</summary>
      <figure>
        <Image src={EQ_FITTER_CHART.path} alt={EQ_FITTER_CHART.alt} width={EQ_FITTER_CHART.width} height={EQ_FITTER_CHART.height} unoptimized />
        <figcaption><a href={EQ_FITTER_CHART.path}>Open the chart image</a></figcaption>
      </figure>
    </details>

    <GuideHeading section={sections.optimizer} />
    <p>YinYang uses PEQdB&apos;s open-source optimizer with a fixed level reference at 1 kHz for exports or across the midrange for listening comparisons. It runs 3,000 optimization steps. The Studio build used 100 steps and could adjust overall gain during the fit. Our pinned Unsmoothed build starts tapering the requested correction at 18.5 kHz. Both presets in the tested Studio build started around 16 kHz. Applying Studio&apos;s taper to the same YinYang optimizer increased full-range error in all 14 cases. <a href="https://github.com/peqdb/autoeq-c/blob/fdc0db772164387c2df8739742594197c6851fc3/src/autoeq.c#L482-L518">PEQdB preprocessing source</a></p>
    <p>In the original two-budget comparison, Studio Precise used less peak boost than YinYang PEQdB Unsmoothed in 12 of 14 cases. YinYang Smoothed lowered peak boost in 13 of those 14 cases and left more error through 10 kHz in all 14. Smoothing softens narrow features before fitting, and lower boost leaves more headroom.</p>

    <GuideHeading section={sections.listening} />
    <p>A correction that follows one measurement closely may miss narrow peaks and dips on the next insertion. Upper treble can still matter. A speech study found that young listeners could detect the loss of content above about 13 kHz on average. The audible difference depends on the listener, recording and correction. <a href="https://zenodo.org/records/4280526">Earphone reinsertion study</a> · <a href="https://pubmed.ncbi.nlm.nih.gov/31893732/">Monson and Caravello (2019)</a></p>
    <p>A level-matched blind comparison can tell you which preset you prefer on your headphones.</p>
  </section>;
}
