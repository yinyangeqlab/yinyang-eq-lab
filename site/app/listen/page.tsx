import { BLIND_EQ_COMPARE_PATH } from "@/lib/blind-eq";
import ModeIllustration from "@/components/mode-illustration";
import "../welcome.css";
import "./style.css";
const modeGroups = [
  {
    heading: "Run a blind test",
    modes: [
      {
        id: "personal", title: "Personal Tournament", href: "/shootout/personal", action: "Find a sound I like",
        description: "Try two sounds at a time and build your personal EQ ranking. Come back later to continue.",
        data: "Starting asks you to review participation choices. Picks stay in this browser unless you enable optional sharing or Sync.",
      },
      {
        id: "blind", title: "Blind Research", href: "/shootout?mode=blind", action: "Contribute a blind comparison",
        description: "Compare sound settings without seeing their names.",
        data: "Agreement is required to submit. Eligible choices count in Research Rankings. Personal audio files stay on your device.",
      },
    ],
  },
  {
    heading: "Choose both sides",
    modes: [
      {
        id: "open", title: "Open Comparison", href: "/shootout?mode=open", action: "Choose a comparison",
        description: "Choose the sound settings yourself. Revisit a favorite or compare settings you already know.",
        data: "Agreement is required for private research submissions with approved targets. Comparisons with private targets stay in this browser.",
      },
      {
        id: "eq", title: "Compare EQs", href: BLIND_EQ_COMPARE_PATH, action: "Compare two EQs",
        description: "Load an EQ on each side and switch on the same song. Hide the names to listen blind.",
        data: "Presets and local audio stay in this tab.",
      },
    ],
  },
] as const;

export default function ListenPage() {
  return <main className="listen-page">
    <section className="welcome-modes" aria-labelledby="welcome-modes-title">
      <div className="welcome-section-head">
        <h1 id="welcome-modes-title">How would you like to listen?</h1>
        <p>Start with Personal Tournament to find your favorites, or choose a mode below.</p>
      </div>
      <div className="listen-mode-groups">
        {modeGroups.map(group => <section className="listen-mode-group" key={group.heading}>
          <h2>{group.heading}</h2>
          {group.modes.map(({ id, title, description, data, href, action }) =>
            <article className={`welcome-mode listen-choice${id === "personal" ? " recommended" : ""}`} key={id}>
              <div className={`alpha-mode-art alpha-mode-${id}`} aria-hidden="true"><ModeIllustration kind={id} compact/></div>
              <div className="listen-choice-copy">
                <h3>{title}</h3>
                <p id={`listen-${id}-description`}>{description}</p>
                <p className="welcome-mode-data" id={`listen-${id}-data`}>{data}</p>
                <a className="listen-choice-action" href={href} aria-describedby={`listen-${id}-description listen-${id}-data`}>{action}</a>
              </div>
            </article>
          )}
        </section>)}
      </div>
      <details className="welcome-ranking-guide" id="ranking-guide"><summary>How results and sharing work</summary><dl>
        <div><dt>Your Personal results</dt><dd>Your ranking is based on the sounds and music you have tried. Your favorites can change as you listen more. You can separately opt into private owner research or the Community Preferences pilot.</dd></div>
        <div><dt>Research Rankings</dt><dd>Shared preferences from eligible Blind Research comparisons. They describe participating listeners’ choices; the top setting may not be your favorite. Library songs and your own music contribute to the combined rankings, with separate source filters.</dd></div>
        <div><dt>Community Preferences</dt><dd>An optional research pilot with its own sharing permission. Public numerical results are withheld until independent listener validation and privacy review; earlier private-only contributions stay private.</dd></div>
        <div><dt>Open Comparison and your data</dt><dd>No public ranking votes. Choices involving approved settings can enter private owner research under the existing agreement; comparisons involving private settings stay local. Sharing song details from your own files is optional.</dd></div>
      </dl><p><a href="/my-data">Review your sharing choices</a> · <a href="/privacy">Read the privacy notice</a> · <a href="/community-preferences">About the research pilot</a></p></details>
      <details className="welcome-ranking-guide"><summary>More help with your first comparison</summary><p>Both sounds use the same headphones and song. Personal and Blind Research keep setting names hidden while you choose. Volume can still differ between settings, so use a comfortable listening level.</p><p><a href="/shortcuts">Open the step-by-step listening guide</a></p></details>
    </section>

</main>;}
