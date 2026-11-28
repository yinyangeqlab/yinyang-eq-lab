import { shareMetadata } from "@/lib/share-metadata";
import { LISTENING_METHODOLOGY_PATH } from "@/lib/share-pages.mjs";
import "../style.css";

export const metadata = shareMetadata(LISTENING_METHODOLOGY_PATH);

const sections = [
  ["listening-conditions", "Listening conditions"],
  ["personal-tournament", "Personal Listening and Tournament"],
  ["blind-research", "Ranked and Rapid Shootout"],
  ["open-comparison", "Open Comparison"],
  ["compare-eqs", "Compare EQs"],
  ["shareable-shootouts", "Shareable Shootouts"],
  ["research-rankings", "Research Rankings"],
  ["community-preferences", "Community Preferences"],
  ["personal-tuning", "Personal EQ Tuning"],
  ["peak-dip-finder", "Peak & Dip Finder"],
  ["fitting-and-measurements", "EQ fitting and measurements"],
  ["channel-matching", "Channel matching"],
  ["listening-pool", "Listening Pool and Music Library"],
] as const;

export default function ListeningMethodologyPage() {
  return (
    <main className="terms-page listening-methodology">
      <article>
        <header>
          <h1>Listening and EQ Methodology</h1>
          <p>How YinYang EQ compares sounds, builds personal shortlists, and turns listening choices into results you can interpret.</p>
        </header>

        <nav className="guide-jump-links" aria-label="On this page">
          {sections.map(([id, title]) => <a key={id} href={`#${id}`}>{title}</a>)}
        </nav>

        <section>
          <h2 id="listening-conditions">Listening conditions</h2>
          <p>Use the headphones or IEMs you selected and keep fit, seal and playback settings consistent. Turn off other EQ or sound presets unless they are part of the setup you intend to test. A rig measurement of the right model is an input to the fit. The response at your own ears also depends on how the headphones sit, how they seal and any device processing. <a href="https://aes.org/publications/elibrary/elibrary-page/?id=17242">Völk, headphone-response variability</a></p>
          <p>A matched passage lets you judge the two sounds on the same musical material. Hidden names reduce identity cues, and shuffled sides reduce the influence of presentation order. Start at a comfortable level, practice if the controls are unfamiliar, and take regular breaks. A five-second requirement is a site rule for matched trials. Listen longer or replay if you need more time. <a href="https://www.itu.int/rec/R-REC-BS.1284">ITU-R BS.1284-2</a> · <a href="https://www.itu.int/rec/R-REC-BS.1116">ITU-R BS.1116-3</a></p>
          <p>Source normalization adjusts the recording level before EQ. Some tools also offer an estimate of loudness after EQ and adjust each side accordingly. Neither step measures sound pressure at your ears. The loudness target in a tool is a digital playback setting. <a href="https://www.itu.int/rec/R-REC-BS.1770">ITU-R BS.1770</a> · <a href="https://tech.ebu.ch/publications/r128">EBU R 128</a></p>
        </section>

        <section>
          <h2 id="personal-tournament">Personal Listening and Tournament</h2>
          <p><a href="/shootout/personal">Personal Tournament</a> compares pairs from a pool of existing targets with names hidden. New runs introduce unheard targets against established contenders and mix in comparisons between contenders. Later rounds concentrate on promising targets while continuing to explore. Scores adjust for opponent strength. Repeated losses against different opponents can reduce how often a target appears or take it out of rotation. A tie counts as an answered comparison.</p>
          <p>In free listening, play both sides before choosing. A matched-passage comparison requires five seconds of shared source audio. Finalist checks shuffle the sides and revisit leading pairs across distinct recording references. The Listening Pool groups known versions by song. Uploaded tracks are distinguished by file fingerprints, so two versions of one song can look like different recordings. Personal progress stays in your browser by default. Sync and optional research contributions have their own choices.</p>
          <p>Use the shortlist as a starting point for your own listening and EQ. Close preferences, changes between songs and cycles in pairwise choices can leave several contenders. The cited research examines how to choose pairs and how to look for an option that beats every other option. YinYang EQ's schedule, cutoffs and finalist rules are practical choices for this tool. <a href="https://proceedings.mlr.press/v38/jamieson15.html">Jamieson et al., Sparse Dueling Bandits</a> · <a href="https://proceedings.mlr.press/v161/haddenhorst21a.html">Haddenhorst et al., Testification of Condorcet Winners</a></p>
        </section>

        <section>
          <h2 id="blind-research">Ranked and Rapid Shootout</h2>
          <p>In <a href="/shootout?mode=blind">Ranked Blind Shootout</a>, the site assigns a target pair, shuffles the sides and uses the 20-band All-Band Fit for both targets from the same headphone measurement. It measures the loudness of the selected passage after each EQ and adjusts A and B to the same level with headroom. Each eligible comparison requires at least five seconds heard on each side and at least five seconds of the same source passage heard on both. Seeking skips source time. You can choose A, B or no preference. Eligible results join earlier comparisons on the <a href="/shootout?tab=rankings">Target leaderboard</a>.</p>
          <p>Rapid Shootout relaxes the matched-passage requirement for free listening. Eligible Rapid comparisons appear in their own Free Listening ranking. A no-preference answer can mean you heard two different sounds and liked them about the same. The task measures a choice under these conditions. Controlled headphone preference studies have used blind comparisons of different target responses, with their own equipment and protocols. <a href="https://aes.org/publications/elibrary/elibrary-page/?id=16768">Olive, Welti and McMullin, headphone target preferences</a> · <a href="https://www.itu.int/rec/R-REC-BS.1284">ITU-R BS.1284-2</a></p>
        </section>

        <section>
          <h2 id="open-comparison">Open Comparison</h2>
          <p>In <a href="/shootout?mode=open">Open Comparison</a>, you choose two named targets and can see their curves. Use it to revisit a comparison, audition an imported target or hear how the pair changes when you select a measurement for a different headphone. Use the outcome as a sighted preference. Comparisons with private targets stay in the browser. Eligible choices involving approved targets may go to private research under the site's agreement. <a href="https://www.itu.int/rec/R-REC-BS.1284">ITU-R BS.1284-2, subjective listening methods</a> · <a href="/privacy">Privacy and participation</a></p>
        </section>

        <section>
          <h2 id="compare-eqs">Compare EQs</h2>
          <p><a href="/eq-compare">Compare EQs</a> switches between two saved or imported parametric presets on the same recording and playhead. You can use the original sound on a side, hide and shuffle the preset names, or reveal them for a sighted check. The optional loudness control estimates the filtered recording's integrated loudness and leaves common peak headroom. The two sides share the selected playback setup and available channel correction.</p>
          <p>This comparison runs in your browser. It does not submit a vote or enter the research rankings. It helps you decide which preset you prefer on that music and setup. <a href="https://www.itu.int/rec/R-REC-BS.1770">ITU-R BS.1770, programme loudness</a> · <a href="https://www.w3.org/TR/2021/REC-webaudio-20210617/">Web Audio API</a></p>
        </section>

        <section>
          <h2 id="shareable-shootouts">Shareable Shootouts</h2>
          <p>A <a href="/share-shootout">Shareable Shootout</a> compares two to four creator-selected target shapes on a supplied signal or a local recording. The round order and sides are shuffled. Opening the curve view marks that run as sighted and excludes it from blind scores. A shootout's tally describes that link, its signals and the people who tried it. The site-wide Research Rankings use a separate set of comparisons. <a href="https://www.itu.int/rec/R-REC-BS.1284">ITU-R BS.1284-2, presentation and listening conditions</a></p>
        </section>

        <section>
          <h2 id="research-rankings">Research Rankings</h2>
          <p><a href="/shootout?tab=rankings">Research Rankings</a> summarize eligible comparisons. The target model uses a regularized Bradley–Terry score. It averages repeats within each participant group and target pair. Each group's total weight is split among its distinct pairs. A tie counts as half a preference. Identical-target checks remain diagnostic and carry no weight in other preferences.</p>
          <p>Published EQ preset rankings compare settings for the same headphone or IEM model. The model uses eligible pair outcomes, with one outcome per listener group for each pair. Choices from self-selected listeners, sparse or uneven comparisons, and differences in hearing, fit, music, and the EQ fitting method limit what either ranking can tell you. Displayed score ranges depend on the model and its assumptions. <a href="https://www.jstatsoft.org/article/view/v048i09">Turner and Firth, Bradley–Terry models</a> · <a href="/privacy">YinYang EQ privacy and participation</a></p>
        </section>

        <section>
          <h2 id="community-preferences">Community Preferences</h2>
          <p><a href="/community-preferences">Community Preferences</a> is an optional validation pilot. The reference checks use blocks of ten assigned comparisons with hidden targets and matched passages. Keep your selected setup fixed within the block. A skipped or missing answer makes the block incomplete for the primary complete-block estimate. The pilot's randomized reference comparisons give the project a way to check patterns found during adaptive Personal Listening.</p>
          <p>Public numerical results are withheld pending independent listener validation and privacy review. Fair presentation within a trial and randomized assignments describe how the checks are run. Participation remains voluntary, and the same conditions and selection limits still matter. <a href="https://www.itu.int/rec/R-REC-BS.1284">ITU-R BS.1284-2, subjective listening methods</a> · <a href="/community-preferences">Reference-check procedure and status</a></p>
        </section>

        <section>
          <h2 id="personal-tuning">Personal EQ Tuning</h2>
          <p>In <a href="/preference-tuning">Personal EQ Tuning</a>, choose a starting target or saved EQ, change the curve by hand, and audition the changes on music. Broad bass and treble controls help you get the overall balance. Individual filters give control over frequency, gain and width. The graph shows what you changed, and you can switch back to the starting sound to hear what the adjustment did.</p>
          <p>This is a method-of-adjustment workflow for your own preference. Change one region at a time and compare on a familiar passage. Studies have used listener-adjusted bass and treble shelves and compared the speed and ease of different adjustment procedures. The settings and interface in this tool are YinYang EQ's own. <a href="https://aes.org/publications/elibrary/elibrary-page/?id=20620">Welti et al., headphone personalization methods</a> · <a href="https://aes.org/publications/elibrary/elibrary-page/?id=22928">Olive, in-ear target adjustment study</a></p>
        </section>

        <section>
          <h2 id="peak-dip-finder">Peak &amp; Dip Finder</h2>
          <p>Use the <a href="/ear-tuning">Peak &amp; Dip Finder</a> to locate a narrow region you hear as too prominent or recessed. Start quietly. A sweep locates a candidate frequency, pink noise helps check nearby frequencies, and familiar music helps you decide whether a small adjustment improves the sound. Reseat the headphones and repeat. A small cut is a practical first trial for a repeatable peak. Treat a dip cautiously, especially if its position changes.</p>
          <p>Pure tones at the same level can sound louder or quieter at different pitches. A sweep alone has limited value for deciding what to correct on music. Practice trials add a known peak or dip to one of two signals and give feedback on your answer. The manual finder uses your listening and can start from a fitted target or saved EQ. The results describe those trials on your playback setup. <a href="https://pubmed.ncbi.nlm.nih.gov/15376658/">Suzuki and Takeshima, equal loudness for pure tones</a> · <a href="https://aes.org/publications/elibrary/elibrary-page/?id=17242">Völk, headphone response and positioning</a></p>
        </section>

        <section>
          <h2 id="fitting-and-measurements">EQ fitting and measurements</h2>
          <p>The fitter computes filters from the difference between the selected measurement and the target. Fixed-band, movable-band and PEQdB methods place or adjust filters under different constraints. A smaller curve error means a closer fit on the supplied measurement. To judge which preset you prefer, compare the presets by ear on your setup. Match the measurement and target reference where practical, and check repeatability before fitting narrow features. <a href="/glossary/eq-fitting">EQ Fitter Benchmark</a> · <a href="/glossary/iem-measurement">IEM Measurement Guide</a> · <a href="/curve-credits">Target sources and credits</a></p>
        </section>

        <section>
          <h2 id="channel-matching">Channel matching</h2>
          <p>Automatic channel correction uses paired left and right responses to estimate a correction for differences between those measurements. A saved or imported correction can also be applied in supported tools. If the same correction is used for both comparison sides, it is part of the shared listening setup. Remeasure after reseating or reinserting before treating a narrow left/right difference as repeatable. <a href="/glossary/iem-measurement">IEM guide, measuring and checking both channels</a> · <a href="https://aes.org/publications/elibrary/elibrary-page/?id=17242">Völk, repeated placement and response differences</a></p>
        </section>

        <section>
          <h2 id="listening-pool">Listening Pool and Music Library</h2>
          <p>The <a href="/music-library">Music Library</a> lists the recordings used by listening tools and can audition a saved EQ. Alternate mixes or masters can differ in balance, so use the same recording and passage when comparing two presets. Try other songs to see if your choice carries across music. Where a tool supports your own files, the audio plays from your device. <a href="https://www.itu.int/rec/R-REC-BS.1284">ITU-R BS.1284-2, programme material</a> · <a href="/privacy">Audio and optional music details</a></p>
        </section>
      </article>
    </main>
  );
}
