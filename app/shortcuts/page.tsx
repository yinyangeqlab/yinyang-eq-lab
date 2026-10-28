import Link from "next/link";
import { bugReportUrl, featureRequestUrl, formatRequestUrl } from "@/lib/release-info";
import DisplayPreferencesPanel from "@/components/display-preferences-panel";
import { shareMetadata } from "@/lib/share-metadata";

export const metadata = shareMetadata("/shortcuts");

const shortcuts = [
  ["Space", "Play or pause the active listening player."],
  ["1 / 2", "Select target A or B. The adjacent number keys keep both choices close together."],
  ["S", "Switch to the other sample."],
  ["A / B", "Alternative keys for selecting A or B."],
  ["← / →", "Seek a quarter second in the active comparison. Native sliders keep their own arrow controls."],
  ["Shift + ← / →", "Seek one second in the active comparison."],
  ["Ctrl / ⌘ + Z", "Undo a Preference Tuning adjustment."],
  ["Ctrl / ⌘ + Shift + Z", "Redo a Preference Tuning adjustment."],
  ["Shift + drag", "Toggle between exact-point and whole-region curve dragging in Preference Tuning."],
  ["Shortcuts menu", "Under the player, choose where playback keys work: everywhere, the player area only, or off. Keys keep working after a mouse click; Space still presses a button you reached with Tab."],
  ["Tab / Shift + Tab", "Move between available controls. Enter or Space activates the focused button."],
  ["Escape", "Close supported dialogs or the mobile navigation and return to its control."],
];

export default function Shortcuts() {
  return <main className="alpha-help-page"><span className="mini-label">HELP &amp; SHORTCUTS</span><h1>Keep your hands on the music.</h1><p>Playback shortcuts apply to the active comparison. They do not override typing, native form controls, a concealed player or an open dialog. “Anywhere on this page” applies to supported keys on this page; “After using the player” requires focus or a click in its playback area. Shared shootouts use Space or S to switch sides, while the main player and Tuning use Space to play or pause. Private Blind EQ currently uses on-screen controls.</p><table className="alpha-help-table"><thead><tr><th scope="col">Key</th><th scope="col">Action</th></tr></thead><tbody>{shortcuts.map(([key, action]) => <tr key={key}><td><kbd>{key}</kbd></td><td>{action}</td></tr>)}</tbody></table><DisplayPreferencesPanel/><section className="alpha-help-card"><h2>Start with one comparison</h2><p>Choose your headphones and a track, set a comfortable volume, then switch between A and B. Hear the required common source passage before choosing. No preference is a valid answer; it does not mean you failed to hear a difference.</p><Link href="/shootout/personal" prefetch={false}>Open Personal Tournament →</Link></section><section className="alpha-help-card"><h2>Shape your preferred sound</h2><p>Preference Tuning puts the curve first. Drag a curve point vertically, move BT, EGC or TT to change its frequency placement, or use exact values. Axis controls change the view; they do not change the sound. Bypass adjustments keeps the selected starting correction.</p><Link href="/preference-tuning" prefetch={false}>Open Preference Tuning →</Link></section><section className="alpha-help-card" id="report-or-request" aria-labelledby="report-or-request-title"><h2 id="report-or-request-title">Report or request</h2><p>GitHub issues are public. Leave out personal data, sign-in codes, private presets, audio and account links. Use invented examples when reporting file problems.</p><ul><li><a href={bugReportUrl} target="_blank" rel="noopener noreferrer">Something broke — report a bug on GitHub ↗</a></li><li><a href={featureRequestUrl} target="_blank" rel="noopener noreferrer">Suggest an improvement on GitHub ↗</a></li><li id="request-a-format"><a href={formatRequestUrl} target="_blank" rel="noopener noreferrer">Request a preset format on GitHub ↗</a></li></ul><p>No GitHub account? <a href="mailto:yinyangeqlab@gmail.com?subject=YinYang%20EQ%20feedback">Email project feedback instead</a>.</p><p>For privacy or your data, use <Link href="/my-data" prefetch={false}>My data</Link> or the <Link href="/privacy#privacy-access-storage-and-contact" prefetch={false}>private contact listed in the privacy notice</Link>. Please do not post security vulnerabilities in public issues. A dedicated security reporting channel has not yet been verified.</p></section><section className="alpha-help-card"><h2>Written guide</h2><p>The earlier demo videos have been retired. Read the project guide for listening modes, setup, data choices and research limits.</p><a href="https://github.com/yinyangeqlab/yinyang-eq-lab/blob/main/README.md" target="_blank" rel="noreferrer">Read the project guide ↗</a></section><p><Link href="/privacy" prefetch={false}>Privacy notice</Link> · <Link href="/my-data" prefetch={false}>Data choices and deletion</Link></p></main>;
}
