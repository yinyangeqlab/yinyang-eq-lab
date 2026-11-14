export type ReleaseNotes = {
  update: number;
  date: string;
  title: string;
  changes: readonly string[];
  github?: { commit: string; pull?: number; releaseTag?: string };
};

export const candidateChanges = [
  "Cloudflare captures submission errors for Blind Shootout votes and listening runs independently of routine site logging.",
] as const;

const update162Changes = [
  "Personal Tournament plays leading curves more often and lets you restore curves that leave rotation.",
  "See each curve’s progress toward leaving rotation after you save a choice and in Personal Tournament results.",
] as const;

const update161Changes = [
  "Play both segments shows Preparing audio… while the EQ is getting ready.",
  "Rapid Shootout lets listeners choose without a playback minimum. Eligible new choices count toward a separate Free Listening ranking.",
  "Ranked Blind Shootout still requires five seconds of the same passage on both sides.",
] as const;

const update160Changes = [
  "The sidebar handle uses smoky teal glass and a taller, wider chevron with a subtle mint glow on hover.",
] as const;

const update159Changes = [
  "Copy private results links with clear feedback and keep keyboard focus during deletion.",
  "See what each listening mode saves and shares, with clearer keyboard and voice labels.",
  "Keep Home’s main action visible on ultrawide screens and fit populated private results on narrow phones.",
  "Browse folder tracks in Tuning and use Load track to change playback.",
] as const;

const update158Changes = [
  "Search and select a Preference Tuning target in one field, with results directly below it and a compact Sort menu.",
  "Download original and preference targets as CSV or TXT and use the redesigned Make my EQ button.",
] as const;

const update157Changes = [
  "The server records why Shootout submissions fail, and the owner can open the saved Cloudflare query from Admin.",
] as const;

const update156Changes = [
  "Shootout votes use consistent labels and clearer contrast.",
  "Search and sort Preference Tuning targets by name or global rank, and download target curves as CSV or TXT.",
  "My Collection puts trial details first with headphone measurement and date filters, separate Personal Tournament history, and an all-dates ranking shortlist.",
] as const;

const update155Changes = [
  "Research and Rankings link directly to the EQ fitter benchmark and chart.",
  "Glossary & Guides has shareable term and section links, and the full fitter guide has a Discord preview with the benchmark chart.",
] as const;

const update154Changes = [
  "The EQ fitting guide explains why the benchmark changes at 20 kHz, how our PEQdB presets fit the curve, and what the scores say about listening.",
] as const;

const update153Changes = [
  "See and copy the ID for this browser in My data.",
  "Use an expiring one-time code to help the site owner verify a browser ID against a submission from your data session.",
] as const;

const update152Changes = [
  "The Home rocket follows a smooth orbit. The My Collection papers fan out on hover and settle when the pointer leaves.",
  "My Collection brings together results, headphones, saved targets and EQs.",
] as const;

const update151Changes = [
  "Search, sort, and page through records in the private admin tables.",
  "See usernames and retained browser IDs on submissions, with older claims in a collapsible queue.",
] as const;

const update150Changes = [
  "Read the Terms of Use from the footer, including how sharing, rankings, and changes to the site work.",
  "See what permission you give the site before submitting a target for public review.",
] as const;

const update149Changes = [
  "Select AutoEq targets directly in Shootout, target search and Tuning.",
  "Find AutoEq curves in the target rankings. Their scores use eligible Blind Research comparisons.",
] as const;

const update148Changes = [
  "The full sidebar divider is clickable in all three desktop layouts. Its texture and larger arrow appear on hover.",
  "Sidebar icons animate on hover and respect reduced motion. The Preference Tuning icon cycles through bass, treble, dips, peaks and a flat curve.",
] as const;

const update147Changes = [
  "Browse and search all 61 AutoEq target source files with credits and links to the original CSVs.",
  "Add AutoEq CSVs on this device for Open Shootout, Personal Tournament and Tuning.",
  "Find the oratory1990 in-ear target under its USOUND1v1 approximation alias.",
] as const;

const update146Changes = [
  "Added a Wallpapers control at the bottom of the homepage. Download 4K or 1080p loops and stills, open a full-size preview, or run the animated wallpaper offline.",
  "Placed Hide flying carpets beside Pause background. The browser remembers whether the headphones, IEMs, and carpets are visible.",
  "Restored the two lines and two dots on the homepage with larger Sound A and Sound B labels in the Shootout colors.",
] as const;

const update145Changes = [
  "Added Unsmoothed and Smoothed choices under PEQdB AutoEQ, with Unsmoothed as the default within PEQdB.",
  "Compare both generated fits at the same band count, with fit error and peak boost shown side by side.",
  "Added the fitter benchmark and a guide to interpreting the two frequency ranges in Terms & definitions.",
] as const;

const update144Changes = [
  "Play music while tuning and keep the same track and loop playing in the mini-player as you visit other pages.",
  "Open the waveform beneath Play and search. Compare your tuning with the starting sound, edit the loop, and adjust volume and dynamics nearby.",
  "Choose library songs, audio files or folders in the player. Save and name tuning snapshots to compare your adjustments.",
  "Added an in-page guide to Tuning controls and gave the shared navigation scrollbar a green accent.",
] as const;

const update143Changes = [
  "Gave Ranked Practice Challenge results their own view in Rankings, with standings first and the player level distribution available on demand.",
] as const;

const update142Changes = [
  "Reorganized Tuning around the graph, broad Tone controls, and a Filters view for exact adjustments.",
  "Added a Starting sound comparison that keeps the selected target or saved EQ playing while bypassing your added tuning.",
  "Highlighted where each selected filter changes the curve by at least 0.1 dB, including effects outside the named region.",
  "Added six gain controls, editable filter shapes and Q, undo and redo, and TXT (IIR) and WAV (FIR) channel-match downloads.",
] as const;

const update141Changes = [
  "Rebuilt link previews with full-color 1920 × 1008 motion at 60 fps and matching 2400 × 1260 stills.",
  "Matched link previews to listening modes, Rankings, Song suggestions, and shared shootout destinations.",
] as const;

const update140Changes = [
  "Linked the published update139 GitHub release directly from the version page.",
] as const;

const update139Changes = [
  "Gave Blind EQ Comparison a dedicated link preview with an animated Discord card and a matching still image.",
] as const;

const update138Changes = [
  "Removed two redundant account links from the Music Library introduction.",
  "Matched the homepage, navigation, favicon, and share artwork to the smooth red and cobalt yin-yang.",
  "Redesigned link previews with clearer artwork and motion for each destination, including shared shootouts. Discord gets a single animated card, and other platforms get a matching still.",
  "Layered four folding aurora curtains with drifting colors and added flying carpets that pitch and bank as their fabric ripples.",
  "Extended wave motion to the lowest mountain traces and added traveling light and a brief resonance at the summits.",
  "Turned the red and cobalt yin-yang sideways on the homepage orb and logos, and shaded the floating orb as one rounded sphere.",
  "Restored the homepage orb’s original face proportions, brightened its outer glow, and let a little of the sky show through its face.",
  "Added 3D headphones and in-ear monitors that slowly turn inside clear bubbles. The rugs fly in opposite directions at separate heights, shrink toward the horizon, and sometimes drift up out of the sky.",
  "Gave Sound A and Sound B fuller yin-yang halves and kept both beside the caption as one compact group. The homepage text overlays the water below the orb at every width.",
  "Softened the Sound A and Sound B symbols and gave the caption’s S-curve a smoother, slightly thicker stroke.",
  "Gave the flying rugs smooth rises and dips and quicker fabric flaps. The orb has a shorter vertical float with more mist around it.",
  "Synced the sidebar edge line and gradient and added a transparent Open sidebar button with a hover border.",
  "Made phone navigation drop from the header, with two columns of destinations and a separate utility row.",
  "Made the sidebar solid black and gave the navigation and header controls their own space at narrow widths.",
  "Moved the homepage logo and wordmark into the top bar and made the sidebar tagline larger.",
  "Kept the logo, version and settings in the same places across page headers, with the current page name beside the logo.",
  "Organized the footer into compact responsive columns, separated Project and Contact, added an About Us page, and moved the listening history to Research.",
  "Narrowed the sidebar and added softly tinted boxes and a consistent teal accent for hover and selection.",
  "Kept the original sidebar arrow, with a hover-only divider in the fully open layout and a larger arrow on hover in the icon-only layout.",
  "Refined the icon-only sidebar with a softly fading edge, a brighter chevron on hover, and a full-height click area.",
  "Slow mist drifts across the valley, the water and the orb’s lower third. Scattered wisps pass over the mountain slopes.",
] as const;

const update137Changes = [
  "Kept the original pink-noise exercise in Beginner practice and added sine and harmonic sweeps in Intermediate practice.",
  "Added three scored Advanced practice stages for finding a hidden peak or dip below 10 kHz.",
  "Reused the Finder’s frequency navigator in Advanced practice and kept Reference and Mystery matched away from the hidden band.",
  "Added an opt-in Ranked Practice Challenge with randomized mixed difficulty across 100 levels, a Grandmaster milestone, and public names or anonymous listener labels.",
  "Show wins, losses and independent frequency accuracy in ranked results, with a distribution covering all participating players and ties sharing a rank.",
  "Plotted revealed bands and expanded frequency labels when the chart has room.",
  "Added distinct peak and dip icons to the marking controls.",
  "Clarified Preference Tuning in navigation and added dedicated link previews for the Finder, Listen and Software licenses.",
  "Practice feedback distinguishes correct answers, reversed peaks and dips, and missed frequencies, with encouragement for correct streaks.",
  "Explained how to compare practice clips with uncalibrated headphones.",
  "Gave the tutorial a compact Recommended practice row with a short description.",
  "Pink noise and music start with the selected frequency isolated, with full-range listening one click away.",
  "Practice volume starts at 10% and resets after completion. Playback shortcuts cover Space, frequency arrows, and Reference and Mystery.",
  "Leaving an unfinished ranked challenge prompts you to continue or discard it.",
  "Headphone adjustments support custom Q and editable half-gain frequency edges.",
  "Drag width and gain directly on the flat or measured Finder graph and the EQ comparison graph.",
  "Ranked Practice Challenge has its own section on the Finder. Advanced practice stays unranked under Recommended practice.",
  "Added animated social cards with still images for platforms that display a static preview.",
  "Updated the rounded yin-yang in the full sidebar and welcome header. The collapsed sidebar starts with Home.",
  "The yin-yang gently grows and recoils on the beat, opening with a double-tap rhythm. Its strongest hit still launches the outward wave, and tinted light drifts inside the orb.",
  "A soft highlight spans both colors of the orb, with gentle shading along its lower rim. The water reflection brightens slightly on the strongest hit.",
  "The welcome headphones have paired earcups with shaded cushions, and the IEMs have tapered shells with open cable bends. Foreground mist and reflected water light tie the orb into the landscape.",
  "The animated orb uses the still artwork’s bright red and deep blue palette, with cyan reflected light along its lower edge.",
  "Slow foreground mist drifts across the orb and the floating devices. The IEM cables curve back from their connectors and the tips have recessed openings.",
  "On wide layouts the homepage copy sits over the full landscape. Narrow layouts place the copy below the artwork.",
  "The wide homepage title sits lower to give the headphones and rug more room, and the IEM shells have rounder, ear-shaped contours.",
  "The homepage headline overlays the landscape when the browser is wider than 768 pixels, including when the full sidebar is open.",
  "The IEMs have inset faceplates and deeper blue shells. The animated orb uses a warmer red and an ocean blue that picks up the mountain colors.",
  "The still homepage artwork uses the same orb colors as the animation.",
  "The sidebar icon and homepage logo use the warmer red and ocean blue palette, with a brighter blue highlight on the sidebar icon.",
  "The favicon, touch icon, and still and animated link previews match the Warm Red and teal-blue branding. The icons have a clean edge.",
  "The homepage listening and browser sync links glow more quickly on hover, with clear keyboard focus and a clearer prompt for returning listeners.",
  "The animated and still homepage artwork, header logo, and sidebar mark use Warm Red and teal blue. The header logo shows the original detailed ridges and water around a clean orb edge.",
  "Unified the welcome layout around one wide landscape, with a darker phone treatment. Red and blue plasma wisps move through softly shaded headphones and IEMs above their carpets.",
] as const;

const update136Changes = [
  "Added a subtle outline around All Your Targets in Personal Tournament results.",
  "Shaped the welcome artwork into traveling audio pulses and removed the homepage Peak & Dip Finder buttons.",
] as const;

const update134Changes = [
  "Renamed Tune by ear to Peak & Dip Finder and added interactive practice for hearing peaks and dips.",
  "Added a frequency playhead, exact Hz entry and fine dragging, with an optional saved headphone or IEM measurement.",
  "Added a hearing-safety prompt and a low starting level per visit. Sine, harmonic tones and pink noise switch during playback.",
  "Clarified the reference EQ, frequency focus and before-and-after comparison. The version page leads with the build ID.",
] as const;

const update133Changes = [
  "Added a direct link to the update132 GitHub release from the version page.",
] as const;

const update132Changes = [
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
  { update: 163, date: "2026-11-14", title: "Blind Shootout submission diagnostics", changes: candidateChanges },
  { update: 162, date: "2026-11-13", title: "Personal Tournament rotation and progress", changes: update162Changes, github: { commit: "e2ab7a147004882b60636ec57914ef6966ae4d62", releaseTag: "update162" } },
  { update: 161, date: "2026-11-13", title: "Blind Shootout playback and Free Listening rankings", changes: update161Changes, github: { commit: "5e0abc5d4e8e442fed3fa30e754d6b077efa5065", releaseTag: "update161" } },
  { update: 160, date: "2026-11-13", title: "Sidebar glass and chevron", changes: update160Changes },
  { update: 159, date: "2026-11-13", title: "Layout, accessibility and site review fixes", changes: update159Changes, github: { commit: "7fd72eeaca962c567c44c37477d173eae1ae2f87", releaseTag: "update159" } },
  { update: 158, date: "2026-11-13", title: "Preference Tuning target picker and downloads", changes: update158Changes, github: { commit: "679693ee9ae543669295ca9e4f601ccad5a148be", releaseTag: "update158" } },
  { update: 157, date: "2026-11-13", title: "Shootout submission diagnostics", changes: update157Changes, github: { commit: "890be93afa4e0b77459c4ad46b3efe13356636e8", releaseTag: "update157" } },
  { update: 156, date: "2026-11-13", title: "Shootout votes, target downloads and trial history", changes: update156Changes, github: { commit: "f465c1d2ed3ce5361387aeafdcb8ecec4d178443" } },
  { update: 155, date: "2026-11-11", title: "Glossary and shareable EQ guides", changes: update155Changes },
  { update: 154, date: "2026-11-11", title: "Reading the EQ fitter benchmark", changes: update154Changes },
  { update: 153, date: "2026-11-11", title: "Browser ID verification", changes: update153Changes },
  { update: 152, date: "2026-11-11", title: "Home rocket and My Collection", changes: update152Changes },
  { update: 151, date: "2026-11-11", title: "Private admin table improvements", changes: update151Changes },
  { update: 150, date: "2026-11-11", title: "Terms of Use and target sharing", changes: update150Changes },
  { update: 149, date: "2026-11-11", title: "AutoEq targets in Shootout and Tuning", changes: update149Changes },
  { update: 148, date: "2026-11-11", title: "Sidebar controls and icon animations", changes: update148Changes },
  { update: 147, date: "2026-11-11", title: "AutoEq target source library", changes: update147Changes },
  { update: 146, date: "2026-11-11", title: "Homepage wallpapers and Sound A/B design", changes: update146Changes },
  { update: 145, date: "2026-11-11", title: "PEQdB smoothing and fitter benchmark", changes: update145Changes },
  { update: 144, date: "2026-11-11", title: "Tuning playback and snapshots", changes: update144Changes },
  { update: 143, date: "2026-11-10", title: "Ranked Practice Challenge results", changes: update143Changes },
  { update: 142, date: "2026-11-10", title: "A clearer Tuning workspace", changes: update142Changes },
  { update: 141, date: "2026-11-10", title: "HD link previews", changes: update141Changes },
  { update: 140, date: "2026-11-10", title: "Update139 GitHub release link", changes: update140Changes },
  { update: 139, date: "2026-11-10", title: "Blind EQ Comparison link preview", changes: update139Changes,
    github: { commit: "12bf3fd1ed53fde94d04f339e34c574fe275fc12", releaseTag: "update139" } },
  { update: 138, date: "2026-11-10", title: "Homepage, navigation and animated link previews", changes: update138Changes },
  { update: 137, date: "2026-11-09", title: "Ranked practice and homepage refresh", changes: update137Changes },
  { update: 136, date: "2026-11-08", title: "Homepage audio pulses and tournament standings", changes: update136Changes },
  { update: 135, date: "2026-11-08", title: "Direct GitHub release link", changes: [
    "Linked the published update134 GitHub release directly from the version page.",
  ] },
  { update: 134, date: "2026-11-08", title: "Peak & Dip Finder", changes: update134Changes,
    github: { commit: "a0a93078296ca875d43f5e0a3c2586e12177802c", releaseTag: "update134" } },
  { update: 133, date: "2026-11-07", title: "Direct GitHub release link", changes: update133Changes },
  { update: 132, date: "2026-11-07", title: "Tune by ear, generated EQs and free listening", changes: update132Changes,
    github: { commit: "dd5062c8d49986a59d582e604d94614e3c0f2c3e", releaseTag: "update132" } },
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
