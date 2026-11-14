import type { HelpTopic } from "./site-help-guide";

export type HelpPanel = "tuning-sound" | "tuning-tone" | "tuning-bass-band" | "tuning-music" | "tuning-waveform"
  | "personal-setup" | "personal-advanced" | "saved-setups" | "data-retention" | "data-nickname" | "data-activity";

export type HelpStep = {
  text: string;
  target?: string;
  open?: readonly HelpPanel[];
  ifMissing?: string;
  prerequisite?: string;
  manual?: true;
  action?: "lower-bass";
};

const setup = ["personal-setup"] as const;
const advanced = ["personal-setup", "personal-advanced"] as const;
const sound = ["tuning-sound"] as const;
const trackLoudness = "select[aria-label='Track loudness target']";
const musicSource = "select[data-music-control='source']";
const targetPool = ".target-pool-modes";
const startButton = ".starter-start-button";
const reviewChoices = "main.my-data a[href='/participation?review=1&return_to=/my-data']";
const submissionSearch = "#data-submissions input[type='search']";
const submissions = "#data-submissions > h2";
const tone = "[aria-label='Editing view'] button[title='Broad gain changes by ear']";
const compare = ".pt-compare";
const eqMaker = ".pt-finalize-button";

const tours: Partial<Record<string, readonly HelpStep[]>> = {
  start: [
    { text: "Choose the headphones you’re wearing. Pick a saved measurement or browse for your model.", target: ".measurement-picker", open: setup },
    { text: "Pick a music source. Use a Listening Pool track or music from your device.", target: musicSource, open: setup },
    { text: "Choose which targets to compare. Quick starter uses a smaller pool when available.", target: targetPool, open: setup },
    { text: "Choose how many comparisons to hear before pausing to review your progress.", target: ".starter-size select" },
    { text: "Choose Start personal tournament when you’re ready. If it’s disabled, read the message below it.", target: startButton, manual: true, ifMissing: ".personal-session-bar > button", prerequisite: "The Start button appears on the setup screen. If a session is already open, use its session controls." },
  ],
  headphones: [
    { text: "Choose In-Ear or Over-Ear, then find the model you’re wearing.", target: ".measurement-picker", open: setup },
    { text: "If your model is missing, browse the database or use the upload option for your own measurement.", target: ".measurement-picker", open: setup },
  ],
  pool: [
    { text: "Open Targets to compare. Choose the full pool, Quick starter, or your own pool.", target: targetPool, open: setup },
    { text: "If you chose your own pool, use Find a target to look up curves and select the ones you want.", target: "input[aria-label='Find a target by name']", open: setup, ifMissing: targetPool, prerequisite: "Select Choose my own pool to reveal the search field." },
  ],
  "personal-music": [
    { text: "Choose a library option, My Playlist, or Music from my device.", target: musicSource, open: setup, ifMissing: ".song-actions button[aria-controls]" },
    { text: "For music from your device, start the run and select a stereo file from the player. Pick the local file again after reloading.", target: ".song-actions button[aria-controls]", ifMissing: startButton, prerequisite: "Start a run to use the player’s file chooser." },
  ],
  normalization: [
    { text: "On the setup screen, open Advanced setup. During a run, use Show test options.", target: ".personal-starter .starter-advanced > summary, .personal-shootout .shootout-setup-toggle", open: advanced },
    { text: "Under Track loudness target, choose −14, −16, or −18 LUFS. Choose Normalization off to keep the track’s original playback level before EQ.", target: trackLoudness, open: advanced },
  ],
  "personal-channels": [
    { text: "Open Advanced setup or Show test options to find the listening settings.", target: ".personal-starter .starter-advanced > summary, .personal-shootout .shootout-setup-toggle", open: advanced },
    { text: "Use Auto for paired measurements, Uploaded for your own two-channel preset, or Off to turn correction off.", target: "select[aria-label='Personal channel matching']", open: advanced },
  ],
  vote: [
    { text: "Play Sample A. For a matched passage, note where you started in the track.", target: "[aria-label='Play Sample A']", ifMissing: startButton, prerequisite: "Start a tournament and load music to see the sample controls." },
    { text: "Play Sample B. When matched listening is on, play at least five seconds of the same passage on both sides.", target: "[aria-label='Play Sample B']", ifMissing: startButton, prerequisite: "The B sample appears during an active comparison." },
    { text: "Read the status below the samples. When the choices unlock, make your selection.", target: ".personal-votes", manual: true, ifMissing: startButton, prerequisite: "The preference controls appear during a comparison." },
  ],
  listen: [
    { text: "Play A and B to hear the same song with each sound. If playback is silent, make sure a track is loaded.", target: ".personal-ab", ifMissing: startButton, prerequisite: "Start a tournament and load a track to see both samples." },
    { text: "Choose Unsure / Tie when neither sounds better. Use Skip comparison if you can’t judge this pair.", target: ".personal-votes", manual: true, prerequisite: "The choices appear during a comparison." },
  ],
  finalists: [
    { text: "Open your results and review the message above the shortlist. It explains what’s needed for a finalist check.", target: ".personal-finalist-readiness", ifMissing: ".personal-session-bar > button", prerequisite: "Pause and see your results to check readiness." },
    { text: "When the check is ready, choose Check top … on different music. A different recording of the same song may count as the same reference.", target: ".personal-results", manual: true },
  ],
  "personal-results": [
    { text: "Use Pause & see results in an active session to open your shortlist.", target: ".personal-session-bar > button", ifMissing: ".personal-results > .personal-result-toolbar", prerequisite: "Start a run to see the session controls." },
    { text: "In your results, open View finalist target curves to see the curves after listening.", target: ".personal-result-curves > summary", prerequisite: "Pause and open your results to see this panel." },
  ],
  resume: [
    { text: "Open Saved setups & local data to review runs stored on this browser.", target: ".personal-saved-setups > summary", open: ["saved-setups"] },
    { text: "Choose the same headphones, target pool and playback settings you used before. That setup restores its saved progress.", target: ".measurement-picker", open: setup },
    { text: "Use Resume Listening or Return to listening when your saved run appears.", target: ".personal-resume, .personal-results .personal-result-toolbar > button", ifMissing: ".personal-session-bar", prerequisite: "Choose the original setup first. The resume control appears when the matching run is paused." },
  ],
  "eq-support": [
    { text: "Open Headphones / Target to choose the sound you’ll work with.", target: ".pt-sound-bar", open: sound },
    { text: "Choose Target to make EQ from a headphone measurement, or Saved EQ to listen to a preset you already have.", target: ".sound-mode", open: sound },
  ],
  "tuning-headphones": [
    { text: "Open Headphones / Target to see the sound and headphone setup.", target: ".pt-sound-bar", open: sound },
    { text: "In Target mode, pick a headphone measurement. To use an existing preset, choose Saved EQ and select it.", target: ".sound-headphones .measurement-picker, .sound-saved select", open: sound },
  ],
  "target-picker": [
    { text: "Open Headphones / Target and use Target mode for a starting curve.", target: ".sound-mode", open: sound },
    { text: "Search by name or source. Use Sort to change the order.", target: "#tuning-target-search", open: sound, ifMissing: ".sound-mode", prerequisite: "Choose Target mode to see the target search." },
    { text: "To bring your own curve, choose Import and select a CSV or TXT file.", target: ".pt-import", open: sound, ifMissing: ".sound-mode", prerequisite: "Choose Target mode to see Import." },
  ],
  "bass-masks-vocals": [
    { text: "In Tune by ear, select Tone to see the broad sound controls.", target: tone, open: ["tuning-tone"] },
    { text: "Lower Bass by 0.5–1 dB. Replay the same line and listen for clearer vocals.", target: "input[aria-label='Bass gain']", open: ["tuning-tone", "tuning-bass-band"], action: "lower-bass", prerequisite: "If editing is paused, switch back to Your tuning to adjust the slider." },
    { text: "Switch between Your tuning and Starting sound to check the difference. Use the same passage for both.", target: compare, prerequisite: "Load a track and choose a starting sound before comparing." },
  ],
  "treble-harsh": [
    { text: "In Tune by ear, select Tone to see the broad sound controls.", target: tone, open: ["tuning-tone"] },
    { text: "Lower Treble by 0.5–1 dB. Listen again for the harsh consonants or cymbal hits.", target: "input[aria-label='Treble gain']", open: ["tuning-tone"], prerequisite: "If editing is paused, switch back to Your tuning to adjust the slider." },
    { text: "Compare Your tuning with Starting sound on the same passage.", target: compare },
  ],
  tune: [
    { text: "Use Tone for broad changes such as Bass, Mids and Treble.", target: tone },
    { text: "Use Filters to edit frequency, gain and Q. The graph also lets you adjust individual bands.", target: "[aria-label='Editing view'] button[title='Exact shape, frequency, Q and narrow corrections']" },
    { text: "Use Undo to reverse an edit. Return to Your tuning if listening to a saved snapshot has paused editing.", target: ".pt-editor-actions" },
  ],
  snapshots: [
    { text: "In Tuning snapshots, use an empty slot to keep a copy of your current edits.", target: ".pt-snapshot-save", ifMissing: "[aria-label='Tuning snapshots']", prerequisite: "Choose a starting sound to see its slots. If all are full, review the existing snapshots." },
    { text: "Choose a saved slot to compare it. Return to Your tuning when you want to edit again.", target: "[aria-label='Tuning snapshots']", ifMissing: ".pt-sound-bar" },
  ],
  "tuning-compare": [
    { text: "Choose a track so you can hear your edits and the starting sound on the same music.", target: ".pt-music-toggle" },
    { text: "Switch between Your tuning and Starting sound. Replay the same line or use Loop to hear the same section.", target: compare },
  ],
  "tuning-loudness": [
    { text: "In Listening options, use Match loudness to reduce volume differences between EQ versions.", target: ".pt-listening-checks label:first-child input" },
    { text: "Compare Your tuning and Starting sound on the same track. Matching adjusts playback levels while preserving the exported filters.", target: compare },
  ],
  "tuning-playback": [
    { text: "Open Choose music to pick a library track or a file or folder from your device.", target: ".pt-music-toggle", open: ["tuning-music"] },
    { text: "Use the player to set playback volume. Dynamics becomes available after the track is analyzed.", target: ".pt-unified-player" },
  ],
  graphs: [
    { text: "Use the checkboxes below the chart to show the responses you want to compare.", target: ".pt-response-overlays", ifMissing: "#tuning-curve", prerequisite: "A linked headphone measurement is needed for raw and predicted response overlays." },
    { text: "Use Graph display to adjust the chart scale or size.", target: ".pt-axis-button", ifMissing: "#tuning-curve" },
  ],
  "tuning-channels": [
    { text: "Use a headphone measurement with Left and Right responses or a supported two-channel preset.", target: ".sound-headphones .measurement-picker", open: sound, ifMissing: ".pt-sound-bar" },
    { text: "Use Channel match in Listening options. It becomes available when a supported match is loaded.", target: "input[aria-label='Enable channel match']", prerequisite: "Choose a paired measurement or a supported match preset first." },
    { text: "Open the Channel match section to find its parametric TXT and stereo WAV downloads.", target: "#tuning-channel-match", prerequisite: "A channel match is needed before downloads are available." },
  ],
  "tuning-loop": [
    { text: "Load a track in the player. You can use a track from the Listening Pool or your device.", target: ".pt-music-toggle", open: ["tuning-music"] },
    { text: "Turn on Loop to repeat part of the loaded track.", target: ".pt-loop-toggle", prerequisite: "Load a track to enable Loop." },
    { text: "Open Show waveform and use Start and End to refine the passage.", target: ".pt-loop-bounds input", open: ["tuning-waveform"], ifMissing: ".pt-loop-toggle", prerequisite: "Turn on Loop to see the Start and End fields." },
  ],
  "make-eq": [
    { text: "Use Target mode and choose a headphone measurement to fit the EQ for your headphones.", target: ".sound-headphones .measurement-picker", open: sound, ifMissing: ".sound-mode", prerequisite: "Choose Target mode to see the measurement picker." },
    { text: "Choose Make my EQ once your sound and measurement are ready.", target: eqMaker, manual: true, ifMissing: ".pt-sound-bar", prerequisite: "Choose a target and a measurement first." },
    { text: "In EQ results, choose a fitting to listen to, save, or download for a compatible app.", target: "#tuning-eq-results", ifMissing: eqMaker, prerequisite: "Generate EQ first to see the results." },
  ],
  "curve-export": [
    { text: "Use Target mode to download the starting or edited response curve.", target: ".sound-mode", open: sound },
    { text: "For the starting response choose Download original target. For your edited response choose Download preference target, then CSV or TXT.", target: ".pt-export-downloads", ifMissing: ".pt-sound-bar", prerequisite: "Choose Target mode and wait for the target curve to load." },
  ],
  sharing: [
    { text: "Review the settings under Data choices to see what this browser’s current account shares.", target: "#data-sharing > h2", ifMissing: reviewChoices, prerequisite: "The saved choices appear when linked data is available." },
    { text: "Choose Review data choices to review or change future sharing. Saving your choices is a separate step on that page.", target: reviewChoices },
  ],
  submissions: [
    { text: "Under Your submitted data, use Find a submission. Check its title, date and record type.", target: submissionSearch, ifMissing: submissions, prerequisite: "The search appears when linked submissions can be managed from this browser." },
    { text: "Use Delete submission… only on the entry you intend to remove. Review the confirmation before proceeding.", target: ".data-records article:only-of-type > button", manual: true, ifMissing: submissionSearch, prerequisite: "Use Find a submission to narrow the list to the record you intend to remove." },
  ],
  "clear-browser": [
    { text: "Review the results saved in this browser. Clearing this copy pauses its automatic Sync and keeps the account copy.", target: "#data-browser > h2" },
    { text: "Choose Clear saved data in this browser… if you want to clear the entire local copy. Review the confirmation before proceeding.", target: "#data-browser > .data-danger", manual: true },
  ],
  "delete-all": [
    { text: "Review Your submitted data first. Use the individual controls if you only want to remove a particular record.", target: submissions, prerequisite: "Linked data management must be available in this browser." },
    { text: "Choose Delete linked data and sign out… only if you want to remove linked contributions and local saved data and end access for this sign-in.", target: "#data-submissions > .data-danger", manual: true, prerequisite: "This action appears when linked data management is available." },
  ],
  "personal-privacy": [
    { text: "In My data, review the Personal research sharing choice. Personal Tournament progress is saved in this browser.", target: "#data-sharing > h2", ifMissing: reviewChoices },
    { text: "Use Review data choices to manage future research sharing. Personal choices are separate from Blind Research rankings.", target: reviewChoices },
  ],
  "browser-id": [
    { text: "Open the Browser ID section in the browser you originally used to submit.", target: "#data-browser-id > h2", ifMissing: "#data-browser-id" },
    { text: "Use the copy button there when an ID is available. For older records, review the ownership instructions in that section.", target: "#data-browser-id", manual: true },
  ],
  sync: [
    { text: "Review Sync & devices to see the account’s available options.", target: "main.profile-page h1" },
    { text: "Review the copies and approved devices before choosing what to keep. Select music files again on each device." },
  ],
  retention: [
    { text: "Open Retention & deletion records to review what happens to past records and browser copies.", target: "#data-retention > summary", open: ["data-retention"] },
    { text: "Manage linked records under Your submitted data. Changes to sharing permissions and removal of past records use separate controls.", target: submissions, ifMissing: "#data-browser > h2" },
  ],
  activity: [
    { text: "Find Your recorded activity and open Show activity records to review available events.", target: "#data-activity > details > summary", open: ["data-activity"], prerequisite: "The activity section appears when linked data is available." },
    { text: "To change identifiable activity monitoring, choose Review data choices.", target: reviewChoices },
  ],
  nickname: [
    { text: "Open Nickname & account tools to see the nickname editor.", target: "#data-account-tools > summary", open: ["data-nickname"] },
    { text: "Type a nickname in the field and use its Save button when you’re ready.", target: "#listener-nickname", open: ["data-nickname"], prerequisite: "The nickname field requires a sign-in that supports nicknames." },
  ],
};

const panelControls: Record<HelpPanel, { selector: string; disclosure?: true }> = {
  "tuning-sound": { selector: ".pt-shell .pt-sound-bar[aria-controls='pt-sound-body'][aria-expanded='false']" },
  "tuning-tone": { selector: ".pt-shell " + tone + "[aria-pressed='false']" },
  "tuning-bass-band": { selector: ".pt-shell .pt-tone-band-picker button[data-tone-band='bass'][aria-pressed='false']" },
  "tuning-music": { selector: ".pt-shell .pt-music-toggle[aria-controls='pt-music-choices'][aria-expanded='false']" },
  "tuning-waveform": { selector: ".pt-shell .pt-strip-expand[aria-controls='pt-playback-full'][aria-expanded='false']" },
  "personal-setup": { selector: ".personal-shootout .shootout-setup-toggle[aria-controls='personal-setup-panel'][aria-expanded='false']" },
  "personal-advanced": { selector: ".personal-shootout .starter-advanced", disclosure: true },
  "saved-setups": { selector: ".personal-shootout .starter-more", disclosure: true },
  "data-retention": { selector: "main.my-data details#data-retention", disclosure: true },
  "data-nickname": { selector: "main.my-data details#data-account-tools", disclosure: true },
  "data-activity": { selector: "main.my-data #data-activity > details", disclosure: true },
};

export function walkthroughSteps(topic: HelpTopic): readonly HelpStep[] {
  return (Object.hasOwn(tours, topic.id) ? tours[topic.id] : undefined) ?? topic.steps.map((text, index) => ({
    text, target: index === 0 ? topic.targets?.[0] : undefined,
    ifMissing: index === 0 && topic.targets?.length ? topic.targets.slice(1).join(", ") || undefined : undefined,
  }));
}

export function walkthroughPanel(panel: HelpPanel) {
  return panelControls[panel];
}
