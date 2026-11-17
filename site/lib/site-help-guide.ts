export type HelpTopic = {
  id: string;
  title: string;
  href: string;
  terms: string;
  steps: readonly string[];
  // Ordered from the exact control to the nearest visible prerequisite.
  targets?: readonly string[];
};

const personal = "/shootout/personal";
const tuning = "/preference-tuning";
const data = "/my-data";

export const helpTopics: readonly HelpTopic[] = [
  {
    id: "compare-options", title: "Compare EQ presets or target curves", href: "/listen", targets: ["#welcome-modes-title"],
    terms: "which comparison mode; can i compare eq and targets; both eq presets and target curves",
    steps: ["Yes. Use Blind EQ Comparison to switch between two EQ presets on the same passage. The names stay hidden until the reveal.", "Use Open Comparison to see two target curves side by side and listen to both with your headphone measurement. Pick a comparison below for its controls."],
  },
  {
    id: "compare-targets", title: "Compare two target curves side by side", href: "/shootout?mode=open", targets: [".shootout-view[data-mode='open'] .listen-surface", ".shootout-view[data-mode='open']"],
    terms: "compare target curves; side by side comparison of target; see both curves; see targets next to one another while listening; choose two targets; open comparison; visual ab graph; compare frequency response; compare two sounds; compare targets",
    steps: ["Use Open Comparison to pick two targets, see their names and curves, and switch between A and B with the same music. Choose a headphone measurement to hear them on your setup.", "Use Personal Tournament if you want the site to pick pairs for you and hide their identities until results."],
  },
  {
    id: "compare-eq", title: "Compare two EQ presets", href: "/eq-compare", targets: [".eq-editors", ".eq-reveal-grid"],
    terms: "side by side comparison of eq; compare two eqs; compare eq; blind eq comparison; ab eq presets; compare two presets; upload two eq files; load two filter files and hear which I prefer; compare equalizers; test peace presets",
    steps: ["Yes. In Blind EQ Comparison, load two supported parametric TXT presets or enter their filters, then choose songs. Switch between A and B on the same passage. Use Match the EQs’ playback levels to reduce volume bias.", "The presets’ identities are revealed after the session. Download the results before refreshing or closing the tab."],
  },
  {
    id: "eq-support", title: "What EQ does the site support?", href: tuning, targets: [".sound-mode", ".pt-sound-bar"],
    terms: "does this support eq; eq support; does this have eq; equalizer; parametric equalization; use equalizer; apply eq; what eq can i use; use peq; can i use eq; supported eq formats",
    steps: ["Yes. You can make parametric EQ from a target and a headphone measurement in Preference Tuning, play a saved EQ in the Listening Pool, or A/B two presets in Blind EQ Comparison.", "Open the Headphones / Target bar in Preference Tuning to choose Target or Saved EQ."],
  },
  {
    id: "start", title: "Start a Personal Tournament", href: personal, targets: [".starter-start-button", ".personal-session-bar", ".personal-starter"],
    terms: "start personal tournament; cannot start; wont start; start greyed out; start disabled; nothing happens start; getting started; begin first round; setup tournament; control gray before the first round; how to play; how to start; play tournament; gray start control before first comparison",
    steps: ["Pick your headphones, choose a music source, and set Targets to compare and Comparisons per session. Then select Start personal tournament.", "If Start is disabled, check the message below it. A session size sets a stopping point. You can continue listening after reviewing your progress."],
  },
  {
    id: "headphones", title: "Find or add a headphone measurement", href: personal, targets: [".measurement-picker", ".shootout-setup-toggle"],
    terms: "find my headphones; pick headphones; add headphone measurement; headphones not listed; headphone model missing; import frequency response; upload headphone measurement; fit iem; choose in ear over ear; headphone not showing; add headphones",
    steps: ["In Pick your headphones, choose In-Ear or Over-Ear and look for an existing measurement or browse the database. Use the measurement upload option if you have your own response file.", "Use a measurement for the headphones you are wearing. In an active run, open Show test options to return to setup. Changing the measurement can switch you to a different saved run."],
  },
  {
    id: "pool", title: "Choose which targets enter the tournament", href: personal, targets: [".starter-start", ".shootout-setup-toggle"],
    terms: "choose targets; what targets are available; change target pool; quick starter; custom pool; add private target to tournament; fewer curves; number of targets; only a handful of curves in bracket; filter targets; targets to compare",
    steps: ["Open Targets to compare. Use the public pool, Quick starter for a smaller pool, or Choose my own pool to pick individual targets. In an active run, look under Show test options.", "A large pool can take several sessions to explore. Changing the pool may switch you to a different saved run."],
  },
  {
    id: "personal-music", title: "Choose or change music for a tournament", href: personal, targets: ["select[data-music-control='source']", ".song-actions button[aria-controls]", ".shootout-setup-toggle"],
    terms: "choose a different song; change song; bring my own music; upload my own song; can i use local music; pick playlist; custom audio; music source; random tracks; play my file; use my own music; file disappeared; bring in a recording on my phone; use an audio file already on my device; songs",
    steps: ["Use Music source to choose Random library songs, Keep one library song, My Playlist, or Music from my device. For your own music, start the run, then select a stereo file from the player’s music chooser.", "Pick local files again after reloading. Older choices stay saved when you change music. Finalist checks need different songs, so a varied playlist can help."],
  },
  {
    id: "normalization", title: "Normalize track loudness in Personal Tournament", href: personal, targets: ["select[aria-label='Track loudness target']", ".shootout-setup-toggle"],
    terms: "loudness normalization; normalization; normalisation; normalize songs; does this support loudness normalization; match volume across songs; lufs; loudness; track loudness; keep music at same volume; level normalize; a song blasts compared with the next one",
    steps: ["Yes. In Personal Tournament, open Advanced setup or Show test options and use Track loudness target. Choose −14, −16, or −18 LUFS, or Normalization off.", "This adjusts the source level before EQ. Perceived loudness can still change after EQ. Changing this setting can switch you to a different saved setup."],
  },
  {
    id: "personal-channels", title: "Match the left and right channels", href: personal, targets: ["select[aria-label='Personal channel matching']", ".shootout-setup-toggle"],
    terms: "left right balance; channel match; one side louder; uploaded preset missing; use l r measurements; stereo correction; auto match; qudelix ch 0 ch 1",
    steps: ["Open Advanced setup or Show test options. Auto uses the saved Left and Right responses when both exist. Uploaded uses a two-channel PEQdB or Qudelix TXT preset. Off leaves target EQ active and turns channel correction off.", "If Uploaded is blocking Start, add a two-channel preset or choose Auto or Off."],
  },
  {
    id: "vote", title: "Why is my preference button locked?", href: personal, targets: ["[aria-label='Play Sample A']", "#personal-vote-availability", ".starter-start-button"],
    terms: "why cant i vote; vote button greyed out; locked vote; prefer a disabled; cannot choose; cannot submit choice; played both but it will not accept my choice; wont let me vote; voting locked; prefer b; matched five second passage; how do i vote; vote unavailable",
    steps: ["Start a run and play A and B. When the matched five-second option is on, play at least five seconds of the same passage on both sides. Watch the status below the A/B cards.", "If a sample will not play, check that a song is loaded and the source curves have finished loading."],
  },
  {
    id: "listen", title: "Play, switch, practice or skip a comparison", href: personal, targets: ["[aria-label='Play Sample A']", ".starter-start-button"],
    terms: "nothing plays; no sound; why no audio; playback not working; cant hear; audio wont play; no difference; play a and b; switch sides; what is tie; practice; skip comparison; play audio; same passage; unsure tie; cannot make out a winner in this pair; target a and b look the same; target names hidden; why curves hidden",
    steps: ["Play Sample A and Sample B to compare the same music. If playback is silent, check that the player has a track, its volume is up, and your browser can play the source. After reloading, reselect a locally chosen file.", "Choose Prefer A, Unsure / Tie, or Prefer B. Use Skip comparison if you cannot judge it. Practice choices do not count toward the run."],
  },
  {
    id: "personal-results", title: "See your shortlist, finalist curves and results", href: personal, targets: [".personal-result-curves > summary", ".personal-session-bar > button", ".starter-start-button"],
    terms: "how can i see my results; see targets i heard; reveal curves; see finalist target curves; show winner; reveal target names; find favorite; view shortlist; see ranking of my targets; podium; see graph of finalists; curves for the sounds that reached the end; see what i picked; personal tournament results",
    steps: ["Select Pause & see results in the current session. The shortlist shows your current favorite or close contenders. Open View finalist target curves to see the curves after the blind comparisons.", "Use Check top … on different music when the run is ready, or explore more comparisons. Fine-tune my favorite opens Preference Tuning with that target."],
  },
  {
    id: "resume", title: "Resume, undo, export or delete a saved run", href: personal, targets: [".personal-resume", ".personal-journey", ".personal-saved-setups > summary"],
    terms: "resume next session; old tournament gone; saved tournament; progress disappeared; undo last choice; reverse a pick I made by accident; fix wrong vote; delete personal run; export personal run; reset tournament; clear personal run; recover lost progress; does it save progress",
    steps: ["Return to the same browser and select the original measurement, target catalog and playback setup. The tournament keeps separate progress for each setup. Use Resume Listening or Return to listening when reviewing results.", "Undo last choice reopens the most recent local comparison. Use Export this run or Saved setups & local data to export or delete runs. Optional research submissions are managed separately in My data."],
  },
  {
    id: "finalists", title: "Check finalists on different songs", href: personal, targets: [".personal-finalist-readiness", ".personal-session-bar > button", ".starter-start-button"],
    terms: "cant check finalists; why are finalist checks disabled; two different songs; how many songs for finalists; why no winner; check top 3; finalist readiness; need more tracks before trying the top choices; recheck contenders; how many comparisons; does tie count",
    steps: ["Use Pause & see results to review the current shortlist. The message above the results explains whether Check top … on different music is ready. If it asks for more evidence, keep exploring the pool or add a more varied playlist.", "Finalist checks use different song references. Multiple recordings of the same song may share a reference. A tie records no preference and a shortlist can contain more than one plausible favorite."],
  },
  {
    id: "tuning-headphones", title: "Choose headphones or load a saved EQ in Tuning", href: tuning, targets: ["#tuning-headphones .measurement-picker", ".pt-sound-bar"],
    terms: "headphones in tuning; find headphone measurement in tuning; headphones missing in tuning; select a headphone for target; no headphones chosen; load saved eq in tuning; audition a saved preset; listen with a saved preset; work without measurement; why is eq disabled",
    steps: ["Open the Headphones / Target bar. In Target mode, choose an existing headphone measurement, browse the database or add your own. Make my EQ also opens the picker when the measurement is missing.", "Switch to Saved EQ to play an existing preset. A saved preset can still work if its linked measurement is missing. That measurement is needed for headphone-response overlays."],
  },
  {
    id: "target-picker", title: "Find, sort or import a starting target", href: tuning, targets: ["#tuning-target-search", ".pt-sound-bar"],
    terms: "find target curve; search targets; see ranked targets; alphabetical order; global rank sort; choose starting target; open target dropdown; import target csv; import target txt; load my own curve; bring a curve in from another app; import a curve from somewhere else; target missing; find harman",
    steps: ["Open the Headphones / Target bar, select Target, and search by name or source. Use Sort to switch between Global rank and Alphabetical.", "Import accepts target curves as CSV or TXT. Choose a headphone measurement to hear the target applied to your headphones."],
  },
  {
    id: "bass-masks-vocals", title: "Bring vocals out of heavy bass", href: tuning,
    targets: ["input[aria-label='Bass gain']", "[aria-label='Editing view']", "#tuning-curve"],
    terms: "bass is drowning out vocals; bass overpowers vocals; low end buries the voice; voice is muffled when bass hits; bass overwhelms the singing; bass makes voices hard to hear; kick drum hides the singer; kick makes the singer sound far back; singer disappears behind the kick",
    steps: ["Try a small bass cut in Preference Tuning. Open Tone and lower the Bass slider by 0.5–1 dB. Replay the same line of a song. If the voice is still buried, lower Bass another small step.",
      "Switch between Your tuning and Starting sound to hear whether the words are clearer. Keep the setting that brings the voice forward without making the song sound thin."],
  },
  {
    id: "treble-harsh", title: "Soften sharp treble and sibilance", href: tuning,
    targets: ["input[aria-label='Treble gain']", "[aria-label='Editing view']", "#tuning-curve"],
    terms: "piercing s and t sounds; harsh treble; sibilance; sharp hi-hat sounds; hi hats sound too sharp; tame cymbals; vocals sound hissy",
    steps: ["In Preference Tuning, open Tone and lower Treble by 0.5–1 dB. Replay the same line or cymbal hit, then switch between Your tuning and Starting sound to check whether the sharpness eased.",
      "If that makes the whole track sound dull, undo the broad change. Use Filters for a smaller, narrower cut and compare again."],
  },
  {
    id: "tune", title: "Adjust bass, mids, treble and individual filters", href: tuning, targets: ["[aria-label='Editing view']", "#tuning-curve"],
    terms: "tune by ear; more bass; change bass mids treble; reduce harsh treble; tune warmth; change filter frequency gain q; add peak dip; narrow correction; parametric filters; how to eq; edit peq; bell shelf; undo tuning; reset tuning; adjust sound",
    steps: ["Use Tone for broad changes. Use Filters to adjust frequency, gain and Q or add a narrow correction. You can also move editable handles on the graph.", "If controls are locked while a different sound is playing, return to Your tuning. Undo reverses an edit. Reset opens a confirmation before restoring the starting settings."],
  },
  {
    id: "tuning-compare", title: "A/B your tuning against the starting sound", href: tuning, targets: [".pt-compare-start", "[aria-label='Tuning snapshots']", "#tuning-curve"],
    terms: "compare your tuning to original; original vs adjusted; start vs tuning; before after; a b compare my tuning; toggle bypass; hear changes; compare snapshot; listen to snapshot; ab original target; your tuning starting sound",
    steps: ["Load music and use Your tuning and Starting sound in the player. Loop a passage if you want to hear the same section again.", "Save a snapshot to keep an adjustment for comparison. The EQ checkbox bypasses the starting EQ and your tuning, while channel match has its own switch."],
  },
  {
    id: "snapshots", title: "Save and compare tuning snapshots", href: tuning, targets: ["[aria-label='Tuning snapshots']", ".pt-compare-start", "#tuning-headphones"],
    terms: "how to save snapshot; where are snapshots; save current sound for later; keep this version while trying another; store tuning adjustment; compare tuning versions; snapshot missing; rename snapshot; apply snapshot; replace snapshot",
    steps: ["In Tune by ear, use an available slot under Tuning snapshots to keep a copy of your current edits. Select a saved slot to hear it, or open its controls to rename, apply, replace or remove it.", "Snapshots belong to the current starting sound and headphone setup. Return to that setup to find them. Select Your tuning to continue editing."],
  },
  {
    id: "tuning-loudness", title: "Match the loudness of EQ versions in Tuning", href: tuning, targets: [".pt-listening-checks label:first-child input", "#tuning-curve"],
    terms: "match loudness; normalization in preference tuning; normalize eq; volume matching in tuning; loudness normalization; normalization; normalisation; equalize volume; match volume between eqs; playback level; loudness; level match",
    steps: ["Yes. Under Listening options, enable Match loudness. It estimates playback levels from the current track and turns louder versions down when comparing your tuning, the starting sound and snapshots.", "This changes listening levels. Your tuning and exported filters stay as saved."],
  },
  {
    id: "tuning-playback", title: "Play music, loop, or adjust dynamics in Tuning", href: tuning, targets: [".pt-music-toggle", "[aria-label='Listen and compare']"],
    terms: "choose music tuning; tuning use own song; load a track; add audio folder; waveform; dynamics slider; compression expansion; music preview; why tuning isnt playing",
    steps: ["Use Choose music to select a library song or a file or folder from your device. If the folder picker shows Load track, select it to load the track.", "The Dynamics control becomes available when the loaded track has been analyzed. Use the playback volume control to set a comfortable level."],
  },
  {
    id: "tuning-loop", title: "Loop a passage in Preference Tuning", href: tuning,
    targets: [".pt-loop-toggle:not(:disabled)", ".pt-strip-expand", ".pt-music-toggle"],
    terms: "loop a part; repeat a chorus; replay a verse; repeat a section in tuning; loop start and end; repetitive playback",
    steps: ["Load a track in Preference Tuning, then turn on Loop in the player. Open Show waveform to see the Start and End fields and set the part you want to repeat.",
      "Switch between Your tuning and Starting sound while the same passage repeats. Turn Loop off to resume normal playback."],
  },
  {
    id: "graphs", title: "Show measurement, target and EQ response graphs", href: tuning, targets: [".pt-response-overlays", ".pt-axis-button", "#tuning-curve"],
    terms: "how do i see the graph; show raw measurement; see frequency response; predicted headphone response; see what filters predict headphones will do; show measured curve; graph display; zoom chart; see overlays; show original and adjusted targets; see eq graph; show graph",
    steps: ["In Tune by ear, use the overlay checkboxes below the chart to show the available responses. Use Graph display to adjust the chart scale and size.", "A linked headphone measurement is needed for raw or predicted headphone response overlays. Saved filters can still work without a linked measurement."],
  },
  {
    id: "make-eq", title: "Make, save or download EQ settings", href: tuning, targets: [".pt-finalize-button", ".pt-sound-bar"],
    terms: "download eq; export eq to device; how do i get this eq onto my device; make my eq; generate eq; save eq preset; equalizer apo peace; export easyeffects; qudelix 5k; make eq button unavailable; no eq results; peq txt export",
    steps: ["Choose Target and a headphone measurement, adjust your sound, then select Make my EQ. Open EQ results and pick a fitting to listen to, save, or download for a compatible app.", "For Peace or Equalizer APO, download the Equalizer APO TXT, which includes the preamp. EasyEffects can also import that file. The Qudelix 5K download gives settings to enter manually."],
  },
  {
    id: "tuning-channels", title: "Use and export channel matching in Tuning", href: tuning, targets: ["#tuning-channel-match", ".pt-sound-bar"],
    terms: "download channel match; download stereo impulse; left right in tuning; channel match in tuning; download 48khz wav; left and right match export; show channel match graph; match two separate response files for left and right ears",
    steps: ["Choose a headphone measurement with Left and Right responses or a saved two-channel match preset. Use Channel match in Listening options to turn the correction on or off.", "The Channel match section offers parametric TXT and a stereo WAV for compatible convolvers when a match is available."],
  },
  {
    id: "curve-export", title: "Download the original or adjusted target curve", href: tuning, targets: [".pt-export-downloads", ".pt-sound-bar"],
    terms: "download target; export preference target; download original target; target csv txt; save target curve file; download adjusted curve; export frequency spl; target file download; actual points of the curve in spreadsheet; get the adjusted curve as a table",
    steps: ["In Target mode, use Download original target for the starting curve or Download preference target for the adjusted curve. Choose CSV or TXT from its menu.", "For EQ filters you can load into a compatible player or device, use Make my EQ with a headphone measurement."],
  },
  {
    id: "saved-measurements", title: "See saved headphone measurements", href: "/shootout?tab=measurements", targets: ["#saved-measurements", ".alpha-collection-heading h1"],
    terms: "show my measurements; see saved measurements; where can i find my measurements; view personal headphones; what headphone did i save; my headphone collection",
    steps: ["My Collection → Headphones lists your saved headphone measurements. Choose one to use it, or open its editor to review or change it.", "For contributed measurement records, check Your submitted data in My data."],
  },
  {
    id: "saved-eqs", title: "Find and use saved EQs", href: "/shootout?tab=eqs", targets: [".saved-eq-collection", ".alpha-collection-heading h1"],
    terms: "where is my saved eq; view saved eqs; show my presets; import preset; my collection eqs; manage saved eqs; get stored eq; saved eq missing",
    steps: ["Go to My Collection → Saved EQs to manage your presets. Choose Saved EQ in Preference Tuning or the Listening Pool to use one.", "If it was saved on another device, check that you are using the original browser or that private Sync was enabled and both devices were approved."],
  },
  {
    id: "sharing", title: "See or change data and sharing choices", href: data, targets: ["#data-sharing", "a[href='/participation?review=1&return_to=/my-data']"],
    terms: "turn off research sharing; consent settings; privacy permissions; review data choices; opt out; stop sharing personal choices; disable activity tracking; stop activity monitoring; music metadata sharing; what data is collected; stop collecting information about my usage; is it private; view sharing settings; stop consenting",
    steps: ["In My data, see your saved choices under Data choices. Use Review data choices to change comparison participation, optional monitoring, music details, Personal research sharing or private Sync.", "You can turn off optional Personal research sharing and keep listening. Withdrawing from comparison-data participation closes listening access. To remove past submissions, use Your submitted data."],
  },
  {
    id: "personal-privacy", title: "Where do Personal Tournament choices go?", href: data, targets: ["#data-sharing", "a[href='/participation?review=1&return_to=/my-data']"],
    terms: "does personal tournament count for rankings; are my personal votes shared; do personal results go public; is my tournament private; does my song upload to research; can people see what I chose in my private bracket; what is community preferences; share personal tournament choices",
    steps: ["Personal Tournament saves progress in your browser. Optional Personal research sharing covers future eligible choices for private research and reviewed Community group results. Personal choices are separate from the Blind Research rankings.", "Review the saved Personal research sharing choice in My data. Local audio bytes are not sent through Personal research sharing."],
  },
  {
    id: "submissions", title: "Find or delete a submitted record", href: data, targets: ["#data-submissions input", "#data-submissions", "a[href='#data-submissions']"],
    terms: "find research submissions; see uploaded data; delete a vote; erase a submission; see what i submitted; uploaded measurements; remove research data; delete individual record; server entry; find a choice I sent in yesterday; find submission id; see submitted comparisons",
    steps: ["Under Your submitted data, use Find a submission and check the title, date and record type. Choose Delete submission… next to the record you want to remove and review the confirmation.", "Removing a comparison submission can also remove its linked owned records. Deleting a browser copy is a separate action."],
  },
  {
    id: "clear-browser", title: "Clear or remove saved data in this browser", href: data, targets: ["#data-browser > .data-danger", "#data-browser"],
    terms: "clear this browser; clear saved data; remove browser copy; reset local data; delete local history; remove browser results; wipe this device; clean slate on this laptop only; clear cache progress",
    steps: ["Under This browser’s My results, choose the action for a single saved result, or Clear saved data in this browser… to clear local settings, measurements and progress. Review which copies the confirmation affects.", "Clearing this browser pauses its automatic Sync and keeps the existing account copy. Removing an individual synced result can also remove that saved result on approved devices. Research submissions are managed separately."],
  },
  {
    id: "delete-all", title: "Delete all linked data and sign out", href: data, targets: ["#data-submissions > .data-danger", "#data-submissions", "a[href='#data-submissions']"],
    terms: "delete all my data; erase everything; delete account; right to erasure; delete linked data and sign out; wipe server records; close my account and remove everything attached; forget me",
    steps: ["Under Your submitted data, find Delete linked data and sign out… and read the confirmation. This removes linked contributions and saved browser data, and ends access for that sign-in.", "If records are missing, review the older-records section before proceeding. Some older records may need individual ownership review."],
  },
  {
    id: "browser-id", title: "Find the ID for this browser", href: data, targets: ["#data-browser-id"],
    terms: "where is my browser id; find browser id; copy browser identifier; identify my previous submission; older vote ownership; identifier from the same browser I voted with; browser verification; find legacy submissions; my old votes missing",
    steps: ["Open Browser ID in My data from the browser you used to submit. The site shows whether an ID is available and offers a copy button when it finds one.", "For help with older submissions, contact the site owner privately. The helper never reads or displays the ID or verification codes."],
  },
  {
    id: "retention", title: "What deletion and sharing changes affect", href: data, targets: ["#data-retention", "#data-submissions"],
    terms: "how long do you keep data; retention; withdrawal; does turning off sharing delete old data; what happens to old submissions; old records not linked; earlier browser ownership; what happens if i opt out; does opting out remove choices I submitted",
    steps: ["Review Retention & deletion in My data. Changing permissions and deleting past records are separate controls. Older submissions without verified ownership may need help from the site owner.", "Use Your submitted data for linked submissions and This browser’s My results for local copies. Check the confirmation for the scope of each removal."],
  },
  {
    id: "activity", title: "See recorded activity", href: data, targets: ["#data-activity > details > summary", "#data-sharing"],
    terms: "where are my activity records; see tracking history; who can see activity; monitoring history; view recorded activity; activity logs",
    steps: ["Open Show activity records under Your recorded activity. Participant activity has a 30-day window.", "Use Review data choices to check or change identifiable activity monitoring."],
  },
  {
    id: "nickname", title: "Change your listener nickname", href: data, targets: ["#data-account-tools > summary"],
    terms: "change nickname; change display name; set listener handle; edit account nickname; rename me",
    steps: ["Open Nickname & account tools in My data. Edit your listener nickname and save it there when the signed-in account offers that control."],
  },
  {
    id: "sync", title: "Find your saved data on another device", href: "/account-sync",
    terms: "sync across devices; connect another browser; move progress to different phone; keep progress on my new phone; switch computer; active approved devices; pause sync; does sync upload songs; copy results; device approval; data on other browser; data not syncing; sync conflict",
    steps: ["Review private Account Sync in My data and open Sync settings & devices to see the options for your account. Review any differences before selecting a copy. A one-time browser transfer is also available under Connect a browser in My data.", "Music files still need to be selected on each device. If a result is missing, check the original browser and whether the setting and both devices were approved."],
  },
  {
    id: "collection", title: "See saved results, dates and measurements", href: "/shootout?tab=profile", targets: [".alpha-collection-heading h1"],
    terms: "my collection; find my results; how can i see my saved trials; view dated trials; show old trials; see old trials; see past trials; review history; see all dates; view headphone measurements; filter my history; where did my results go; show past results; personal tournament history",
    steps: ["Open My Collection → My results. Filter dated trials by headphone measurement. Personal Tournament history is in its own view, and the ranking shortlist summarizes all dates.", "For submitted research records and browser deletion controls, use My data."],
  },
  {
    id: "library-loudness", title: "Reduce volume differences between recordings", href: "/music-library", targets: [".library-loudness input"],
    terms: "normalize library songs; normalization; normalisation; loudness normalization; loudness; match music volumes; loud listening pool songs; library volume differences; even out different recordings; match volume across tracks",
    steps: ["Yes. In the Listening Pool, enable Reduce volume differences between recordings to bring the source levels closer together. The player’s volume still controls listening level."],
  },
  {
    id: "open-loudness", title: "Set track normalization in Open Comparison", href: "/shootout?mode=open", targets: [".shootout-view[data-mode='open'] select[aria-label='Track loudness target']", ".shootout-view[data-mode='open'] .shootout-setup-toggle"],
    terms: "normalization in open comparison; open comparison loudness; normalization; normalisation; loudness normalization; normalize open comparison track; adjust lufs in open; how do i make the volumes even",
    steps: ["In Open Comparison, use Track loudness target in the listening setup. Choose −14, −16, or −18 LUFS, or Normalization off.", "Blind Research uses a fixed −16 LUFS source target. Preference Tuning has a separate option to match levels between EQ versions."],
  },
  {
    id: "research-loudness", title: "Understand locked loudness in Blind Research", href: "/shootout?mode=blind", targets: [".shootout-view:not([data-mode='open']) .loudness-locked-value", ".shootout-view:not([data-mode='open']) .shootout-setup-toggle"],
    terms: "normalization in blind research; blind research loudness; normalization; normalisation; loudness normalization; loudness locked; why cant i change lufs; fixed loudness; volume adjustment stuck at one number; ranked loudness settings",
    steps: ["Blind Research uses a fixed −16 LUFS source loudness target. It shows Locked in the listening setup so research comparisons use the same source target.", "If you want to choose a different source level, use Open Comparison or Personal Tournament."],
  },
  {
    id: "blind-eq-loudness", title: "Match levels in Blind EQ Comparison", href: "/eq-compare", targets: [".eq-check input", ".eq-editors"],
    terms: "loudness normalization; normalization; normalisation; match eq playback levels; loudness; one eq louder; fair comparison if one preset comes in hotter; test eq at same level; volume match blind eq",
    steps: ["Yes. In Comparison settings, enable Match the EQs’ playback levels before starting the blind comparison. This reduces the chance that the louder preset wins just because of volume."],
  },
  {
    id: "sign-in", title: "Get help with listening access", href: "/listen", targets: ["#welcome-modes-title"],
    terms: "cant sign in; invitation expired; where do i sign in; listening access denied; cant access the music; participation required; why cant i enter; log in; need invitation; help with access",
    steps: ["Open Listen, choose your mode and follow the access prompt if one appears. When invitations are enabled, use the official sign-in form with the invitation issued by the site owner. If it expired, contact the owner privately.", "If listening access asks you to review your data choices, use Review data choices in My data. The help panel only explains where to go."],
  },
  {
    id: "rankings", title: "See research rankings and what counts", href: "/shootout?tab=rankings", targets: [".rankings-views"],
    terms: "where can i see global rankings; best target rankings; public leaderboard; what votes count; blind research results; standard cohort; rankings missing; read rank table; target leaderboard; see ranks",
    steps: ["Open Rankings in the Shootout. Check the cohort and headphone category to see what is counted. Blind Research rankings and your personal shortlist answer different questions."],
  },
  {
    id: "library", title: "Find music in the Listening Pool", href: "/music-library", targets: [".library-browse-controls"],
    terms: "where can i find songs; what music is here; listening pool; music library; find track artist; music not loading; licensed music; original or remastered; song versions",
    steps: ["Open the Listening Pool to browse and filter tracks and recording versions. You can listen with a saved EQ. Some tracks require listening access."],
  },
  {
    id: "ear-tuning", title: "Practice finding peaks and dips by ear", href: "/ear-tuning",
    terms: "ear training; find peaks and dips; practice frequency recognition; train ears; ear tuning; learn frequency bands",
    steps: ["Open Ear Tuning for guided practice with frequency regions, peaks and dips. Use Preference Tuning when you want to change a target or saved EQ for your own listening."],
  },
  {
    id: "glossary", title: "Look up EQ and listening terms", href: "/glossary",
    terms: "glossary; definitions; what does parametric mean; what is a target curve; what is lufs; what is frequency response; what is a measurement; what do these terms mean; what is a preamp; how does eq fitting work",
    steps: ["Open Glossary & Guides for terms such as target curves, measurements, EQ filters, LUFS and preamp. It also links to the guide and benchmark for EQ fitting."],
  },
];
