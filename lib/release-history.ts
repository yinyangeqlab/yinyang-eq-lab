export type ReleaseNotes = {
  update: number;
  date: string;
  title: string;
  changes: readonly string[];
  github?: { commit: string; pull?: number };
};

export const candidateChanges = [
  "Added Tune by ear with sine and harmonic sweeps, pink noise, library and local music, and an output meter. Mark peaks or dips and compare the adjustments live.",
  "Save manual adjustments by themselves or combine them with a target fit. Saved EQs use the existing Account Sync collection.",
  "Generated EQ results stay available in the same browser for matching inputs. Overlay individual fits or show them all, view deviation from the gray dotted target, and compare fit error and preamp.",
  "Tuning recommends an EQ with smaller boosts, especially in deep bass. Listen directly to the recommendation and the closer fit, or compare more generated EQs in a blind run.",
  "Personal Tournament defaults to free listening. A/B switching keeps the music playing, looping is optional, and the matched-passage research check is separate.",
  "Personal Tournament offers a shorter starter pool and better-connected pairings, then checks leading targets on different recordings.",
  "Added Standard, Precise and PEQdB fitter choices and 10, 15, 20 or 30 bands. Ranking cohorts record the actual fitter and count used.",
  "Updated the Tuning tone controls and listening checkboxes, kept music playing through EQ changes, and added downloadable automatic channel matching.",
  "Reworked the music search field and added a version history with per-update notes and verified public GitHub links.",
] as const;

// The public changelog summarizes the recorded beta updates and their baseline.
// Public source links are added only when the corresponding history is available.
export const releaseHistory: readonly ReleaseNotes[] = [
  { update: 132, date: "2026-11-07", title: "Tune by ear, generated EQs and free listening", changes: candidateChanges },
  { update: 131, date: "2026-10-31", title: "Unified Tuning and saved EQ playback", changes: [
    "Restored the interactive Tuning curve with raw and predicted overlays, compact tone controls and integrated frequency markers.",
    "Grouped headphone setup, song search, source actions, volume and Dynamics around one player.",
    "Added bulk saved-EQ deletion, saved and updated dates, and clearer Left/Right correction information.",
  ] },
  { update: 130, date: "2026-10-31", title: "Saved EQs and channel matching", changes: [
    "Saved exact generated filters with the headphone and target for reuse in Tuning and the Music library.",
    "Added stereo convolution downloads for automatic channel matching, optional attached correction, and separate Left and Right measurement uploads.",
  ] },
  { update: 129, date: "2026-10-30", title: "Listening controls, My space and Research", changes: [
    "Made listening controls compact, added editable segment times, and improved waveform playheads and recording details.",
    "Grouped results, headphones and targets in My space. Added searchable Terms & definitions and grouped research views.",
    "Updated vote and Stop styling, compacted library cards, and limited trial preparation to the listening section.",
  ] },
  { update: 128, date: "2026-10-29", title: "Personal playback walkthrough fixes", changes: [
    "Kept frequency labels and safety meters inside the two Personal listening cards.",
    "Restored the original vote buttons and corrected the comparison and source-picker layout.",
  ] },
  { update: 127, date: "2026-10-29", title: "Maintenance controls and reopening", changes: [
    "Reopened normal access and added indefinite maintenance notices that stay on until cleared.",
    "Made the admin view show the live state of a whole-site maintenance lock.",
  ] },
  { update: 126, date: "2026-10-29", title: "Clearer first listening and recovery from errors", changes: [
    "Explained listening modes, headphone measurements, sound terms and next actions in plainer language.",
    "Improved headphone search, export guidance, consent, private results and Sync review. Kept save outcomes visible and added retry actions.",
  ] },
  { update: 125, date: "2026-10-28", title: "PEQdB AutoEQ and Safari playback", changes: [
    "Integrated unsmoothed PEQdB fitting with fallback to the original fitter.",
    "Preserved shelf filters and fitter details in playback and exports. Improved Safari audio gestures and interruption recovery.",
    "Made the engine, license texts and corresponding source available alongside the app.",
  ], github: { commit: "c9d6cc0e66804710f1948a71bbc568d75cfe7642", pull: 19 } },
  { update: 124, date: "2026-10-27", title: "Responsive controls, accessibility and artwork", changes: [
    "Refined listening controls, the music picker, keyboard focus, search, uploads and status feedback.",
    "Added desktop landscape and mobile moon artwork with a remembered motion preference.",
  ], github: { commit: "8c36be0aa4352f668f6cfbb351bc187713042191", pull: 17 } },
  { update: 123, date: "2026-10-24", title: "Runtime and workflow cleanup", changes: [
    "Fixed reactive expiry, audio activity displays, and Tuning, Tournament and Sync callbacks.",
    "Made batched Tuning undo and redo consistent, improved meter accessibility, and retired superseded consent controls.",
  ], github: { commit: "74d3ab76daac921ab01d5d4a13dfa5a052a05a73", pull: 15 } },
  { update: 122, date: "2026-10-24", title: "Playback and saved-state fixes", changes: [
    "Ignored stale audio analysis and Play results after switching tracks in Tuning. Reset the waveform zoom and duration for each source.",
    "Improved storage-failure handling, account refresh, local song voting, and private result link saving.",
  ], github: { commit: "d1a507d614a266bec1c96c3acc0cd2d6bf6f1257", pull: 14 } },
  { update: 121, date: "2026-10-24", title: "Private blind EQ workflow fixes", changes: [
    "Retained volume across recordings and improved local playlist editing and recovery from silent passages.",
    "Preserved playlist order, assignments and reveal time in results downloads. Kept results available after download failures.",
  ], github: { commit: "7e71e139aef1dd944953783a2076db1809266370", pull: 13 } },
  { update: 120, date: "2026-10-24", title: "Playback recovery and clearer public documentation", changes: [
    "Restored playback when the previous source was missing and clarified the beta source baseline.",
    "Updated licensing notices and documentation for listening, tuning exports, and maintenance access.",
  ], github: { commit: "00799c6b978f8a69283c00e5a7724ae8382f5240" } },
  { update: 119, date: "2026-10-24", title: "Private blind preset comparison", changes: [
    "Added a private two-preset blind EQ comparison with independent assignment for each song.",
    "Kept the comparison isolated from shared navigation and Sync during owner testing.",
  ], github: { commit: "43010598186d97bec4ba560dc68e2b4b9cc5d13f", pull: 12 } },
  { update: 118, date: "2026-10-24", title: "Owner-only maintenance", changes: [
    "Added a whole-site maintenance lock that preserves existing admin sign-in while protecting pages, APIs and media.",
  ], github: { commit: "1aa1330818ceac51e7d5cb12ecaded8c3fd9bc5f", pull: 11 } },
  { update: 117, date: "2026-10-23", title: "New Listening Pool recordings", changes: [
    "Added 24 Jason J. Chevallier AAC recordings with waveform, loudness and dynamics information.",
  ], github: { commit: "1b3195605512b08ad18608564d20f4fedceb8fde", pull: 6 } },
  { update: 116, date: "2026-10-23", title: "Shareable shootouts", changes: [
    "Added shareable shootouts with a private management link and results for the shared comparison.",
  ], github: { commit: "59c37afaf28e08eee752ad34bc626e2fd5359d47", pull: 4 } },
  { update: 115, date: "2026-10-23", title: "Page-specific link previews", changes: [
    "Shared links now preview the destination page, including its title and description.",
  ], github: { commit: "33a5cc2a59cf3a496668864571686482a2b41dab", pull: 3 } },
  { update: 114, date: "2026-10-23", title: "Browse-first consent and target removal requests", changes: [
    "Allowed browsing before consent and moved the agreement prompt to the point where an action collects data.",
    "Added a way to request removal of an approved target.",
  ], github: { commit: "bd101abba9269fa43f5772000d3919a4ef959457" } },
  { update: 113, date: "2026-10-23", title: "Personal target pools and consistent shortcuts", changes: [
    "Redesigned the Personal comparison layout and let listeners select their own target pool.",
    "Made playback shortcuts consistent after pointer interactions and let uploaders withdraw pending targets.",
  ], github: { commit: "c199eeef4feac804f7ec79751cbf06733b88c94c" } },
  { update: 112, date: "2026-10-22", title: "Timing, accessibility and motion preferences", changes: [
    "Fixed fully heard five-second passages that could remain locked due to rounding.",
    "Improved landmark and focus behavior, added motion and shortcut preferences, and refined device Sync.",
  ] },
  { update: 111, date: "2026-10-22", title: "Passage timing and measurement entry", changes: [
    "Counted unique listening time within the selected passage and kept incomplete coverage from rounding up.",
    "Refined measurement entry, catalog keyboard focus, reminder focus and recording picker behavior.",
  ] },
  { update: 110, date: "2026-10-22", title: "Player, library and consent style cleanup", changes: [
    "Removed superseded style rules from the player, Music library and consent dialog.",
  ] },
  { update: 109, date: "2026-10-21", title: "Mobile readability and repository rename", changes: [
    "Improved mobile readability and updated source and issue links to the renamed YinYang EQ Lab repository.",
  ] },
  { update: 108, date: "2026-10-21", title: "Smoother sidebar transitions", changes: [
    "Aligned the sidebar, arrow and content transitions and simplified the hover effect.",
  ] },
  { update: 107, date: "2026-10-21", title: "Sidebar controls and compact Sync", changes: [
    "Replaced separate sidebar controls with one divider control that cycles through three layouts.",
    "Refined keyboard navigation, small-screen controls, Sync presentation and saved data-choice colors.",
  ] },
  { update: 106, date: "2026-10-21", title: "Nickname and focus layout", changes: [
    "Moved the optional nickname earlier in the consent dialog and gave its input and help text room on narrow screens.",
  ] },
  { update: 105, date: "2026-10-21", title: "Version and help access", changes: [
    "Made the version and help pages available to listeners who opt out of contributing data.",
  ] },
  { update: 104, date: "2026-10-21", title: "Beta launch", changes: [
    "Refreshed Welcome, navigation, listening setup, Personal Tournament, Tuning, Music library and My space.",
    "Added draggable frequency markers, a beta testing notice and links for reporting issues.",
  ] },
  { update: 103, date: "2026-10-20", title: "Published beta baseline", changes: [
    "Isolated browser layout and consent tests from participant Sync, research and rankings.",
  ] },
];
