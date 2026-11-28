import { Link2 } from "lucide-react";
import EqFitterRankings from "@/components/eq-fitter-rankings";
import snapshot from "@/data/eq-fitter-rankings.json";
import { CLOSE_FIT_RMS_DB } from "@/lib/eq-recommendation";
import { fitterNames } from "@/lib/fitter-settings";
import { EQ_FITTER_CHART, FITTER_GUIDE_PATH } from "@/lib/share-pages.mjs";

const toolCount = new Set(snapshot.scores.map(row => row.tool)).size;
const benchmarkDate = new Intl.DateTimeFormat("en-US", { dateStyle: "long", timeZone: "UTC" });

function SectionHeading({ id, title }: { id: string; title: string }) {
  const label = `Link to ${title}`;
  return <h2 id={id}>{title} <a className="guide-section-link" href={`${FITTER_GUIDE_PATH}#${id}`} aria-label={label} title={label}><Link2 size={16} aria-hidden="true" /></a></h2>;
}

export default function EqFittingGuide() {
  return <section id="eq-fitting" className="eq-fitting-guide" aria-labelledby="eq-fitting-title">
    <SectionHeading id="eq-fitting-title" title="Which fit should I use?" />
    <ul>
      <li><strong>Start with Recommended.</strong> Set your Main EQ and Channel Match limits in <a href="/preference-tuning">Personal EQ Tuning</a>. Among compatible Main EQ fits, the recommendation favors fewer filters when they come within {CLOSE_FIT_RMS_DB.toFixed(2)} dB RMS of the closest fit.</li>
      <li><strong>Try Lower boost when headroom matters.</strong> Peak boost is the largest gain from the combined filters. A +6 dB peak needs about −6 dB of preamp just to offset that boost. Use the exported preamp and leave room for any other EQ you apply. A gentler fit can help if a large bass boost sounds strained or makes playback too quiet once you lower the preamp.</li>
      <li><strong>Check the shape, then listen.</strong> Above the target means too much output in that range. Below means too little. Use the response plot to see whether a correction overshoots a peak or leaves a dip. Be cautious with sharp corrections that move when you reseat your headphones or earphones. If two fits sound the same in a level-matched comparison, use Recommended.</li>
    </ul>
    <p><a href="#benchmark">See the benchmark results</a></p>

    <SectionHeading id="benchmark" title="Benchmark results" />
    <p>We compared {toolCount} browser-based tools on seven measurement–target pairs at 48 kHz, with four in-ear and three over-ear. Each ranking uses the same pairs at the selected filter limit.</p>
    <p><strong>All-Band Fit led all seven curve-error metrics at 10, 15, 20 and 30 bands.</strong> Several fits used less peak boost. <a href="#eq-fitting-title">Choose a fit for your device</a> or jump to the <a href="#rootlessjamesdsp-reference">RootlessJamesDSP fork</a> in the table.</p>
    <EqFitterRankings />
    <p><a href="/eq-fitting/eq-fitter-web-scores.csv">Download per-case scores (CSV)</a></p>

    <SectionHeading id="frequency-ranges" title="How to read the scores" />
    <ul>
      <li><strong>RMS</strong> summarizes the size of the differences from the target. Lower is closer. We remove one overall level offset and give equal space to each octave. The same filters are scored in every range.</li>
      <li><strong>Through 10 kHz</strong> reduces the influence of upper-treble peaks and dips that can shift with fit and placement. <strong>Through 20 kHz</strong> includes the full curve. Use the bass and treble scores to see where an average hides an error. Compare the 95th percentile with the worst error to see whether a large miss is isolated.</li>
    </ul>
    <p id="listening-preference">Measured accuracy helps you reach the target. Level-matched listening helps you decide which sound you prefer.</p>

    <details className="fitter-coverage" id="peqdb-optimizer">
      <summary>Fitter methods and benchmark archive</summary>
      <ul>
        <li><strong>{fitterNames.joint}</strong> adjusts every filter’s frequency, gain and width together. Earlier records call it Joint Fit.</li>
        <li><strong>{fitterNames.standard}</strong> starts from a grid of preset frequencies. <strong>{fitterNames.precise}</strong> adds filters one at a time where correction is still needed.</li>
        <li><strong>PEQdB</strong> offers Unsmoothed for finer detail and Smoothed to soften narrow features before fitting. <a href="https://github.com/peqdb/autoeq-c">PEQdB source</a></li>
      </ul>
      <p>Settings and versions vary by tool. Identical scores share a rank. The original snapshot is from <time dateTime={snapshot.date}>{benchmarkDate.format(new Date(snapshot.date))}</time>. All-Band Fit was measured on <time dateTime={snapshot.jointFit.date}>{benchmarkDate.format(new Date(snapshot.jointFit.date))}</time>. The CSV records the date and active filter count for each fit.</p>
      <p><a href="/eq-fitting/eq-fitter-scores.csv">Original six-fitter scores (CSV)</a> · <a href={EQ_FITTER_CHART.path}>Original chart</a></p>
    </details>
  </section>;
}
