export type ReleaseNotes = {
  update: number;
  date: string;
  title: string;
  changes: readonly string[];
  refreshReleases?: readonly { tag: string; label: string }[];
  publicationTag?: string;
  github?: {
    commit: string;
    pull?: number;
    releaseTag?: string;
    linkTaggedSource?: boolean;
  };
};

const update178Changes = [
  "On mobile, Help opens above the blind comparison so playback, voting, and results stay within reach.",
  "Find songs in smaller batches and see which preset was A and B for each song after reveal.",
  "Select two presets in Saved EQs and choose Compare blind. Both open in Blind EQ Comparison without requiring a target or another upload.",
  "Search release history by update number or keyword, share links that open individual updates, and find the restored GitHub release links.",
] as const;

const update177Changes = [
  "Upload a parametric EQ TXT from Saved EQs, Tuning, or Music library. No target curve or headphone measurement is needed.",
  "Open a preset directly from Saved EQs to hear it in Tuning with your music.",
] as const;

const update176Changes = [
  "IEM Measurement Guide Revision 01 adds bench gear and substitution checks, a fillable checklist, and illustrated left/right EQ verification.",
] as const;

const update175Changes = [
  "Try and download trudenpa’s original 19-band HiFiMAN Arya Stealth preset in Research Rankings, tagged Diamond and YYT1.",
] as const;

const update174Changes = [
  "Audio Fact Checks adds 19 searchable answers with direct citations. Share a permanent article link or copy the full answer and its sources for Discord.",
  "All six Tuning gain sliders stay grabbed at their limits, so you can reverse direction before releasing the mouse.",
] as const;

const update173Changes = [
  "Preference Tuning keeps music playing after the browser starts the prepared audio.",
] as const;

const update172Changes = [
  "The IEM measurement guide has its own Discord and static link preview with the Capra Audio coupler and AKG response plot.",
] as const;

const update171Changes = [
  "Homepage Wallpapers offers phone portrait, tablet portrait and landscape, and ultrawide downloads in 4K, 1080p, and 720p.",
  "Choose PNG, JPEG, MP4, or WebM in the Landscape only and Flying gear scenes. Wallpaper downloads are for personal use.",
] as const;

const update170Changes = [
  "Glossary & Guides includes a beginner IEM measurement guide with annotated REW screenshots, two AKG comparison plots, and a technical PDF.",
] as const;

const update169Changes = [
  "Research Rankings shows target and EQ preset rankings together. Use the All, Headphones or IEMs filter to explore both lists. EQ results are grouped by model.",
  "Play a published EQ preset preview to unlock thumbs up and thumbs down. Reactions have their own totals. Model rankings use level-matched A/B results.",
  "The Version page checks GitHub’s public release feed when the API is unavailable, so the matching link can appear after publication.",
] as const;

const update168Changes = [
  "EQ preset imports accept Q from 0.01 to 20, preserving the values of very broad filters in saved EQs and Blind EQ Comparison.",
] as const;

const update167Changes = [
  "The full and icon-only sidebars use a silver arrow that grows on hover and presses inward when held.",
  "The hidden sidebar shows a faint silver arrow. Approaching the left edge slides out a green-tinted glass strip.",
] as const;

const update166Changes = [
  "Peak & Dip Finder can start from a saved EQ or fit a target. A headphone measurement shows the raw, reference EQ and adjusted responses together.",
  "Hear peak cuts and dip boosts as you edit. Switch between raw playback, reference EQ and EQ with adjustments while listening.",
] as const;

const update165Changes = [
  "Preference Tuning selects Target match by default for generated EQ exports. Lower boost remains available, and both options show the preamp adjustment.",
] as const;

const update164Changes = [
  "Ask for help about Personal Tournament, Preference Tuning, My data, and related listening tools.",
  "A small model trained on site questions helps select reviewed instructions. Use Show me to find the control.",
  "Show me walks through reviewed steps and can lower Bass by 1 dB with confirmation and Undo.",
  "Site help asks short follow-up questions about saved data, tournament setup and Preference Tuning.",
] as const;

const update163Changes = [
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
const update179Changes = [
  "Organized the repository into 16 top-level entries and updated the restore tools for the new layout.",
] as const;

const update180Changes = ["Compare EQs adds side-by-side EQ selectors with one shared waveform player, a shared headphone choice and optional blind switching. Match loudness defaults to −14 LUFS and the listening reminder resets for new sessions."] as const;

const update181Changes = [
  "Hear the same instrumental with two EQ settings on the animated homepage. Sound A and Sound B play immediately.",
  "Build your own EQ ranking in Personal Tournament. Review your data choices when you start.",
  "Open Glossary & Guides in the navigation to find the IEM Measurement Guide, Audio Fact Checks and EQ Fitter Benchmark. Guide text and jump links reflow on narrow screens.",
] as const;

const update185Changes = ["The Discord trailer preview and video now share the same portrait dimensions. The public player supports byte-range seeking."] as const;

const update184Changes = ["Watch and share the 58-second Companion trailer on the Android page, with native playback controls and English captions."] as const;

const update183Changes = [
  "Explore ten Companion screens in Blue, AMOLED black, Light, and YinYang green. Choose a theme or move between screens with the arrows, dots, or a swipe.",
  "Share the Android Companion at /q5k4android. The preview shows the original 5K, App Manager, PEQ import and export, and EQ pairing with Channel Match.",
] as const;

const update182Changes = [
  "Three EQ targets trade places on fixed gold, silver and bronze tiers, two EQ points move, theater masks trade places, and A/B ballots drop into boxes. Pause motion below the landscape. Discover mobile EQ import and export, linked Channel Match presets, blind comparisons, and everyday Qudelix 5K controls from the homepage and Android overview. The install button carries the Android robot alongside the two app icons.",
  "The IEM Measurement Guide identifies the KINGTOP headset splitter used on the bench and explains the electrical checks for compatible alternatives.",
] as const;

const update186Changes = ["The homepage fits the entire landscape to the screen. Pause motion or opt into the flying carpets using the controls beneath the art."] as const;

const update187Changes = ["The landscape fills the homepage width. The first listening section starts by the middle of the screen, including on short and ultrawide windows."] as const;

const update188Changes = [
  "Search engines can discover the public headphone EQ guides and Android Companion pages through a site-wide sitemap.",
  "The homepage, listening modes, and glossary provide clearer titles and descriptions for search results.",
] as const;

const update190Changes = ["Ultrawide displays show the whole yin-yang and more of the ocean. The headphone comparison still starts by mid-screen."] as const;

const update191Changes = [
  "The IEM measurement guide explains the resonance near 8 kHz and how insertion depth moves it.",
  "Download Revision 02 of the technical guide for research citations and advice on measuring your own IEMs and comparing 711 clone couplers.",
] as const;

const update192Changes = ["Choose Original landscape or Ultrawide panorama, with or without the yin-yang, in every wallpaper layout. Both scenes offer PNG, JPEG, MP4, WebM and offline HTML downloads."] as const;

const update193Changes = ["The Android page previews the redesigned Companion in ten screens and four themes, with updated Companion and App Manager icons and distinct download buttons."] as const;

const update195Changes = [
  "Aurora curtains fold independently behind the mountain peaks in the wallpaper gallery.",
  "Choose original or panoramic art, with or without the yin-yang. The flying-gear scenes animate headphones and IEMs on flying carpets across all five layouts.",
] as const;

const update194Changes = ["The IEM guide and its PDFs identify the measured coupler and explain how its level-aligned AKG sweeps compare with the PEQdB Studio reference."] as const;

const update197Changes = ["Approve read-only Android companion access to your saved EQs, headphone measurements and channel matches in Sync & Devices."] as const;

const update196Changes = [
  "Restore the GitHub release and tagged source links for update194 in Version history.",
] as const;

const update198Changes = ["Restore the GitHub release and tagged source links for update196 in Version history."] as const;

const update199Changes = [
  "Open site help from the question mark in the header. On desktop, hover over it or tab to it to see its label.",
  "The help panel and walkthrough expand above the page content, leaving the player and other controls clear.",
] as const;

const update200Changes = [
  "Use one Android companion for Qudelix 5K and 5K Plus, with model-specific EQ and audio controls.",
  "Preview five themes, including YinYangEQ, and get Companion 0.16.1 and App Manager 1.6.0 on the Android page.",
  "Approve a lasting companion link to save EQs, measurements and preset history to My Collection.",
] as const;

const update201Changes = ["Explore the Android Companion screen by screen and see how the 5K Plus divides its filters between Main EQ and Channel Match."] as const;

const update202Changes = ["Switch the entire Android screenshot tour between all five themes.", "Compare the original Qudelix 5K and 5K Plus, and share a Discord preview that shows both devices."] as const;

const update203Changes = ["See how to measure headphones using your usual Bluetooth codec in the Android Companion’s Auto EQ tour."] as const;

const update204Changes = ["Watch the new Android Companion trailer for Qudelix 5K and 5K Plus. It shows offline Auto EQ, preset import and export, My Collection sync, and all five themes."] as const;

const update205Changes = ["The Android Companion trailer has a slower opening, a continuous minute of BTFO, and app demos timed to the beat."] as const;

const update206Changes = ["The Android download page shows Companion v0.16.2 and App Manager v1.6.2."] as const;

const update207Changes = [
  "Compare EQs lines up with the other sidebar items.",
  "The Glossary & Guides icon and its submenu icons glow green on hover and keyboard focus.",
] as const;

const update208Changes = [
  "Watch the Companion trailer in portrait or landscape. The portrait cut opens with the phone panorama wallpaper, and the Welcome page links straight to the trailer.",
  "Install and update the Companion through App Manager. The Android apps have updated launcher names and icons.",
] as const;

const update209Changes = [
  "The homepage keeps the aurora visible behind the yin-yang as the wallpaper moves.",
  "Compare EQs puts volume, channel correction and session actions below the player.",
  "The Tuning graph stays below the site header when you scroll.",
  "My Collection puts Add measurement beside the heading and groups Use, Edit and Delete with each saved measurement. Remove automatic channel matches from the list individually or in bulk.",
] as const;
const update210Changes = [
  "The aurora behind the yin-yang stays visible after the homepage animation starts.",
  "Glossary & Guides and all its submenu icons use the same green glow as the other sidebar icons.",
  "The active Companion trailer format has one Share trailer button with the standard share icon.",
] as const;

const update211Changes = [
  "Screen-reader navigation is clearer on the homepage, in the footer, and in Music Library suggestions.",
  "Missing pages link back to the homepage. Shared listening links use the appropriate layout and announce the page while loading and during comparisons.",
  "The Companion linking reminder is easier to read, and the Finder’s disabled Custom width is legible in supported browsers.",
] as const;

const update212Changes = [
  "YYEQ5K can load rankings from your synced Personal Tournaments after you approve access in the browser.",
  "YYEQ5K searches saved measurements and site catalogs, fits Main EQ with Channel Match, and saves paired presets as TXT.",
] as const;

const update213Changes = [
  "The Android page at /android introduces YinYang Phone EQ, Shizuku setup, and the Quve audio engine.",
  "YYEQ5K 0.16.6 opens Main EQ, Channel Match, and Paired EQ in Phone EQ 0.3.0, where you can save and search your presets.",
] as const;

const update214Changes = [
  "Accept all, Required only, Cancel and Save stay visible while you scroll through consent choices.",
  "Accept all and Required only apply their choices immediately. Save applies custom choices, and Cancel discards the draft.",
] as const;

const update215Changes = [
  "Set up a Sync ID, passkey and saved recovery code in Sync & Devices.",
  "Approve YYEQ5K from a linked browser or recover the same Sync account when your other devices are unavailable.",
] as const;

const update216Changes = [
  "Browse and search the release history back to the first Cloudflare deployment.",
  "Open verified public source links and historical deployment records from the Version page.",
] as const;

const update217Changes = [
  "Search for a full update number, such as update1 or 1, to find that release. Partial keyword searches still work.",
] as const;

const update218Changes = [
  "The homepage and Android page use the new Electric Ridge App Manager icon and Split Response Ball Phone EQ icon.",
] as const;

const update219Changes = [
  "Glossary & Guides includes Listening and EQ Methodology, with direct links to each method and its research references.",
] as const;

const update220Changes = [
  "Target rankings open on All results, which includes eligible matched and earlier blind comparisons across fitters.",
  "Switch directly to Matched A/B or Earlier results and use the visible fitter, test version and music source filters.",
  "The Peak and Dip Ranked Listening Challenge uses its full name in Rankings and Finder.",
] as const;

const update215PublicationRevision = "4572fa8ead207e2cc3500626b335b67ac3690cb1";

export const archivedDeploymentReceipts = {
  revision: update215PublicationRevision,
  updates: new Set([204, 203, 202, 201, 198, 197, 193, 191, 176, 154, 151, 150, 131, 130, 129, 128, 127, 126]),
};

export const candidateChanges = [
  "The Android page lists the installed names, versions and build numbers for all three apps and links to the matching Android release.",
  "The EQ Fitter Benchmark ranks fitters at 10, 15, 20 and 30 bands and provides both the current and original per-case scores as CSV downloads."
] as const;

export const releaseHistory: readonly ReleaseNotes[] = [
  { update: 221, date: "2026-11-25", title: "Android app versions and EQ fitter rankings", changes: candidateChanges },
  { update: 220, date: "2026-11-25", title: "All target rankings", changes: update220Changes },
  { update: 219, date: "2026-11-25", title: "Listening and EQ methodology", changes: update219Changes },
  { update: 218, date: "2026-11-23", title: "Android app icons", changes: update218Changes, publicationTag: "update218" },
  { update: 217, date: "2026-11-23", title: "Exact update-number search", changes: update217Changes, github: { commit: "8dd52f8d2c7515ed5128a8b2e8c038ec428f6580", releaseTag: "update217", linkTaggedSource: true } },
  { update: 216, date: "2026-11-23", title: "Release history back to update1", changes: update216Changes, github: { commit: "a713724769b33151c25b6f28b0e9c690a849e0d2", releaseTag: "update216", linkTaggedSource: true } },
  { update: 215, date: "2026-11-22", title: "Sync ID and account recovery", changes: update215Changes, github: { commit: update215PublicationRevision, releaseTag: "update215", linkTaggedSource: true } },
  { update: 214, date: "2026-11-22", title: "Four consent actions in view", changes: update214Changes, github: { commit: "fea57f03dfd076ced6863b30508b9aa1e6a9560e", releaseTag: "update214", linkTaggedSource: true } },
  { update: 213, date: "2026-11-22", title: "Phone EQ and the Android apps page", changes: update213Changes, github: { commit: "3733d6428b50731d58dba45f94f52c296952c64c", releaseTag: "update213", linkTaggedSource: true } },
  { update: 212, date: "2026-11-22", title: "Android Auto EQ and Personal rank sync", changes: update212Changes, github: { commit: "d5082a94b379de52fa861b06d80d29bd67a4e35f", releaseTag: "update212", linkTaggedSource: true } },
  { update: 211, date: "2026-11-21", title: "Website accessibility and navigation fixes", changes: update211Changes, github: { commit: "b78e6f9fa501b4ab515bf235e632c6a87cea76f6", releaseTag: "update211", linkTaggedSource: true } },
  { update: 210, date: "2026-11-21", title: "Homepage aurora, guide icons and trailer sharing", changes: update210Changes, github: { commit: "4c907fd33ff8994565408526ae84754a33bdcda6", releaseTag: "update210", linkTaggedSource: true } },
  { update: 209, date: "2026-11-21", title: "Wallpaper, listening controls and My Collection", changes: update209Changes, github: { commit: "b5c0d90f9d25906299ed2cd309f1b147b4b44803", releaseTag: "update209", linkTaggedSource: true } },
  { update: 208, date: "2026-11-21", title: "Android trailer sharing and app branding", changes: update208Changes, github: { commit: "33b0c8006874bdeea2bda141c401f67709f0b044", releaseTag: "update208", linkTaggedSource: true } },
  { update: 207, date: "2026-11-21", title: "Sidebar alignment and guide icons", changes: update207Changes, github: { commit: "cd3fd76bbac2781e0a3c746607fe80b19bec080e", releaseTag: "update207", linkTaggedSource: true } },
  { update: 206, date: "2026-11-21", title: "Android download versions", changes: update206Changes },
  { update: 205, date: "2026-11-21", title: "Android trailer timing", changes: update205Changes, github: { commit: "bec3f393703ad2985d663d671bd18282f79d9206", releaseTag: "update205", linkTaggedSource: true } },
  { update: 204, date: "2026-11-20", title: "Android Companion trailer", changes: update204Changes },
  { update: 203, date: "2026-11-20", title: "Bluetooth measurement tip", changes: update203Changes },
  { update: 202, date: "2026-11-20", title: "Android device photos and theme tour", changes: update202Changes },
  { update: 201, date: "2026-11-20", title: "Android Companion feature tour", changes: update201Changes },
  { update: 200, date: "2026-11-20", title: "Qudelix Companion and collection sync", changes: update200Changes, github: { commit: "7ddc8fe2d8a79b7f6e61b8b2505386ce206f7d12", releaseTag: "update200", linkTaggedSource: true } },
  { update: 199, date: "2026-11-19", title: "Help in the site header", changes: update199Changes, github: { commit: "dbb7e53bf806fbe26793f449750f21c6dfa0ced9", releaseTag: "update199", linkTaggedSource: true } },
  { update: 198, date: "2026-11-19", title: "Update196 Version history links", changes: update198Changes },
  { update: 197, date: "2026-11-19", title: "Android companion account sync", changes: update197Changes },
  { update: 196, date: "2026-11-19", title: "Version history links", changes: update196Changes, github: { commit: "80debbf2b94b30d4ee4df0cd0e4064bccabbb247", releaseTag: "update196", linkTaggedSource: true } },
  { update: 195, date: "2026-11-19", title: "Independent aurora wallpaper motion", changes: update195Changes, github: { commit: "9d20326f35fee1e4fb25ba25c9b9c91fae6d65a2", releaseTag: "update195", linkTaggedSource: true } },
  { update: 194, date: "2026-11-19", title: "IEM guide coupler wording", changes: update194Changes, github: { commit: "60d91d0fd1b3a56200e053c8202145319a7add7e", releaseTag: "update194", linkTaggedSource: true } },
  { update: 193, date: "2026-11-19", title: "Android Companion UI gallery", changes: update193Changes },
  { update: 192, date: "2026-11-19", title: "Panorama and symbol-free wallpapers", changes: update192Changes, github: { commit: "8641b1c1bfd2489a50de71988c03148c1b1301da", releaseTag: "update192" } },
  { update: 191, date: "2026-11-19", title: "IEM measurement guide Revision 02", changes: update191Changes },
  { update: 190, date: "2026-11-19", title: "Ultrawide homepage panorama", changes: update190Changes, github: { commit: "8952dc90f3e0f7fc880fedfae6333a2f7b91cacb", releaseTag: "update190" } },
  { update: 189, date: "2026-11-19", title: "Standalone Android Companion download", changes: ["Download the signed standalone Companion APK directly from the Android page, alongside App Manager."], github: { commit: "3010dcc2cd2f78b69864903150b13404be0b9587", releaseTag: "update189" } },
  { update: 188, date: "2026-11-18", title: "Search discovery for public EQ guides and tools", changes: update188Changes, github: { commit: "7c1e46eca27b1067bd8f194e198d7ad815d622b2", releaseTag: "update188" } },
  { update: 187, date: "2026-11-18", title: "Edge-to-edge landscape and first-screen comparison", changes: update187Changes, github: { commit: "7547d00252da68822557e987ebbe84f8727b1b62", releaseTag: "update187" } },
  { update: 186, date: "2026-11-18", title: "Full homepage landscape and optional carpets", changes: update186Changes, github: { commit: "54ce48fdd2bbc9984d599df74c75b826014dcbb0", releaseTag: "update186" } },
  { update: 185, date: "2026-11-18", title: "Portrait trailer sharing on Android", changes: update185Changes, github: { commit: "484e70f97c1f2bb0b7c76ef8e804d3c70da5c45a", releaseTag: "update185" } },
  { update: 184, date: "2026-11-18", title: "Android Companion trailer", changes: update184Changes, github: { commit: "f1aa683d7c35c5cbea30939f0cd10eb6f5036bbc", releaseTag: "update184" } },
  { update: 183, date: "2026-11-18", title: "Qudelix 5K Companion gallery and sharing", changes: update183Changes, github: { commit: "35f76af011e397e08fe9c2757cf0678271dc8a45", releaseTag: "update183" } },
  { update: 182, date: "2026-11-18", title: "YinYang Android Companion and listening tools", changes: update182Changes, github: { commit: "4365a51a5fa0513e1266afe965dc19fabe7132c6", releaseTag: "update182" } },
  { update: 181, date: "2026-11-18", title: "Homepage listening preview and personal rankings", changes: update181Changes, github: { commit: "533a77d3953d379207de83b83cc4a87a1466ba51", releaseTag: "update181" } },
  { update: 180, date: "2026-11-18", title: "Compare saved EQs", changes: update180Changes, github: { commit: "421ed4c9e15ac7330f979938555ee5c7c3caa349", releaseTag: "update180" } },
  { update: 179, date: "2026-11-17", title: "Repository layout and restore", changes: update179Changes, github: { commit: "e10e4116f46ba6bf7cc7ec63566401ef63731dd3" } },
  { update: 178, date: "2026-11-17", title: "Blind comparison from Saved EQs", changes: update178Changes, github: { commit: "364dd980d5550a11218b3696d913ca5a64b8ddb6", releaseTag: "update178" } },
  { update: 177, date: "2026-11-17", title: "Saved EQ uploads", changes: update177Changes, github: { commit: "8a793603a57cf020fe8c799cca66f70ed4fbd485", releaseTag: "update177" } },
  { update: 176, date: "2026-11-17", title: "IEM measurement guide Revision 01", changes: update176Changes },
  {
    update: 175, date: "2026-11-16", title: "Arya Stealth preset", changes: update175Changes,
    github: { commit: "45bfbfb24de4fcfaed83718641228953533ce273", releaseTag: "update175" },
  },
  {
    update: 174, date: "2026-11-15", title: "Audio Fact Checks", changes: update174Changes,
    refreshReleases: [
      { tag: "update174-tuning-playback-release-link", label: "Tuning playback link refresh on GitHub" },
      { tag: "update174-wallpapers-version-link", label: "Version page refresh on GitHub" },
      { tag: "update174-version-release-links", label: "Release links refresh on GitHub" },
    ],
  },
  {
    update: 173, date: "2026-11-15", title: "Preference Tuning playback", changes: update173Changes,
    github: { commit: "d4757320e52b49ea4333eda337686c20c3ead032", releaseTag: "update173" },
  },
  { update: 172, date: "2026-11-15", title: "IEM guide link preview", changes: update172Changes },
  {
    update: 171, date: "2026-11-15", title: "Phone, tablet, and ultrawide wallpapers", changes: update171Changes,
    github: {
      commit: "96377f2570a0746895640cf3571a85f7e9a9a2bb",
      releaseTag: "update171",
    },
    refreshReleases: [{ tag: "update171-sidebar-version-link", label: "Version page refresh on GitHub" }],
  },
  {
    update: 170, date: "2026-11-15", title: "IEM measurement guide", changes: update170Changes,
    github: { commit: "30e7d9d6bc5ad4df11f2772aac76489ec8ce3db0", releaseTag: "update170" },
    refreshReleases: [{ tag: "update170-iem-guide-pdf-label", label: "IEM guide PDF title on GitHub" }],
  },
  {
    update: 169, date: "2026-11-15", title: "Target and EQ preset rankings", changes: update169Changes,
    github: {
      commit: "f6ecdacc99996d2ec46caa81869abd18f7fa28ce",
      releaseTag: "update169",
    },
    refreshReleases: [
      { tag: "update169-sidebar-rollout", label: "Sidebar refresh on GitHub" },
      { tag: "update169-version-history-refresh", label: "Version history refresh on GitHub" },
    ],
  },
  {
    update: 168, date: "2026-11-14", title: "EQ preset import compatibility", changes: update168Changes,
    github: {
      commit: "9fbf6acf1b0134dfe4af61d2d4803e44dfdf27ad",
      releaseTag: "update168",
    },
    refreshReleases: [{ tag: "update168-direct-release-link", label: "GitHub refresh release" }],
  },
  { update: 167, date: "2026-11-14", title: "Sidebar controls", changes: update167Changes, github: { commit: "677fd44ef9893134a5fa5e1553c28d6c49b54924", releaseTag: "update167" } },
  { update: 166, date: "2026-11-14", title: "Peak & Dip Finder saved EQ and live adjustments", changes: update166Changes, github: { commit: "42a3ddadbb2dcd9b7930f91bbade5439c09bc8ef", releaseTag: "update166" } },
  { update: 165, date: "2026-11-14", title: "Preference Tuning target match", changes: update165Changes, github: { commit: "da4977a00ba46537521b18340dd32e433110b662", releaseTag: "update165" } },
  {
    update: 164, date: "2026-11-14", title: "Site Help and guided walkthroughs", changes: update164Changes,
    github: { commit: "ad71f9a649f581cc246507ceb1add6108fec7a85", releaseTag: "update164" },
    refreshReleases: [{ tag: "update164-version-link-refresh", label: "Version page refresh on GitHub" }],
  },
  { update: 163, date: "2026-11-14", title: "Blind Shootout submission diagnostics", changes: update163Changes, github: { commit: "77a20497340c0cb90262d6e395470be37aca34c7", releaseTag: "update163" } },
  { update: 162, date: "2026-11-13", title: "Personal Tournament rotation and progress", changes: update162Changes, github: { commit: "e2ab7a147004882b60636ec57914ef6966ae4d62", releaseTag: "update162" } },
  { update: 161, date: "2026-11-13", title: "Blind Shootout playback and Free Listening rankings", changes: update161Changes, github: { commit: "5e0abc5d4e8e442fed3fa30e754d6b077efa5065", releaseTag: "update161" } },
  { update: 160, date: "2026-11-13", title: "Sidebar glass and chevron", changes: update160Changes, github: { commit: "118e051dc5e32a096c10a7e365091450bd4edb67", releaseTag: "update160" } },
  { update: 159, date: "2026-11-13", title: "Layout, accessibility and site review fixes", changes: update159Changes, github: { commit: "7fd72eeaca962c567c44c37477d173eae1ae2f87", releaseTag: "update159" } },
  { update: 158, date: "2026-11-13", title: "Preference Tuning target picker and downloads", changes: update158Changes, github: { commit: "679693ee9ae543669295ca9e4f601ccad5a148be", releaseTag: "update158" } },
  { update: 157, date: "2026-11-13", title: "Shootout submission diagnostics", changes: update157Changes, github: { commit: "890be93afa4e0b77459c4ad46b3efe13356636e8", releaseTag: "update157" } },
  { update: 156, date: "2026-11-13", title: "Shootout votes, target downloads and trial history", changes: update156Changes, github: { commit: "f465c1d2ed3ce5361387aeafdcb8ecec4d178443", releaseTag: "update156" } },
  { update: 155, date: "2026-11-11", title: "Glossary and shareable EQ guides", changes: update155Changes, github: { commit: "ce8704e878a782e68b90469f377a0475fabc5cbc", releaseTag: "update155" } },
  { update: 154, date: "2026-11-11", title: "Reading the EQ fitter benchmark", changes: update154Changes },
  { update: 153, date: "2026-11-11", title: "Browser ID verification", changes: update153Changes, github: { commit: "0ea0092ba4ef4b19eb1a347e2715f0de4b3e4279", releaseTag: "update153" } },
  { update: 152, date: "2026-11-11", title: "Home rocket and My Collection", changes: update152Changes, github: { commit: "2cb5c66a7c8582e2818cce4b1f2fc69b72444ff8", releaseTag: "update152" } },
  { update: 151, date: "2026-11-11", title: "Private admin table improvements", changes: update151Changes },
  { update: 150, date: "2026-11-11", title: "Terms of Use and target sharing", changes: update150Changes },
  { update: 149, date: "2026-11-11", title: "AutoEq targets in Shootout and Tuning", changes: update149Changes, github: { commit: "ec0269bfbb9c0f587747a1cd6265d76965d5aab0", releaseTag: "update149" } },
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
  ], github: { commit: "e769a0d7d81c7e6ad927324dda5b012da7a56528" } },
  { update: 111, date: "2026-10-22", title: "Passage timing and measurement entry", changes: [
    "Counted unique listening time within the selected passage and kept incomplete coverage from rounding up.",
    "Refined measurement entry, catalog keyboard focus, reminder focus and recording picker behavior.",
  ], github: { commit: "2ebf5b7cabf6add86394d8591ee5ec7cbe58e314" } },
  { update: 110, date: "2026-10-22", title: "Player, library and consent style cleanup", changes: [
    "Removed superseded style rules from the player, Music library and consent dialog.",
  ], github: { commit: "ed4482d7513f48f0b3a421600b7f40901fbca594" } },
  { update: 109, date: "2026-10-21", title: "Mobile readability and repository rename", changes: [
    "Improved mobile readability and updated source and issue links to the renamed YinYang EQ Lab repository.",
  ], github: { commit: "5cb3356da4875ee9cf60713676c970f1e5a38058" } },
  { update: 108, date: "2026-10-21", title: "Smoother sidebar transitions", changes: [
    "Aligned the sidebar, arrow and content transitions and simplified the hover effect.",
  ], github: { commit: "f35979dab3c66bc4ff22e0dd72a145a32611fe3b" } },
  { update: 107, date: "2026-10-21", title: "Sidebar controls and compact Sync", changes: [
    "Replaced separate sidebar controls with one divider control that cycles through three layouts.",
    "Refined keyboard navigation, small-screen controls, Sync presentation and saved data-choice colors.",
  ], github: { commit: "81eaa8a59f36dd698851c7bde272450b3ce36b7c" } },
  { update: 106, date: "2026-10-21", title: "Nickname and focus layout", changes: [
    "Moved the optional nickname earlier in the consent dialog and gave its input and help text room on narrow screens.",
  ], github: { commit: "85f9924e01353317857b556d068ea15ad28549ea" } },
  { update: 105, date: "2026-10-21", title: "Version and help access", changes: [
    "Made the version and help pages available to listeners who opt out of contributing data.",
  ], github: { commit: "bc59d0b8d3a89749900a359ae697b21c0e6e424b" } },
  { update: 104, date: "2026-10-21", title: "Beta launch", changes: [
    "Refreshed Welcome, navigation, listening setup, Personal Tournament, Tuning, Music library and My space.",
    "Added draggable frequency markers, a beta testing notice and links for reporting issues.",
  ], github: { commit: "e3eea27e55ba6bb003749207ba7bddb3e3117dbb" } },
  { update: 103, date: "2026-10-20", title: "Published beta baseline", changes: [
    "Isolated browser layout and consent tests from participant Sync, research and rankings.",
  ], github: { commit: "e5399cb869d1b7626f2abf779083d3b1f8c9a50a" } },

  // The early numbers include the failed operations and infrastructure imports preserved in the deployment log.
  { update: 102, date: "2026-10-20", title: "Consent exits and license terms", changes: ["Returned first-time opt-outs and cancellations to Welcome and clarified site reuse terms."], github: { commit: "2d1f9ad54b4ba9a4cc522d9d27980d98396e8667" } },
  { update: 101, date: "2026-10-19", title: "Sync for larger histories", changes: ["Transferred larger saved histories and measurements in verified pieces."], github: { commit: "e87995a5b0105002996c9de4327ba49f6fef674d" } },
  { update: 100, date: "2026-10-19", title: "Participant Sync", changes: ["Added opt-in browser Sync and approved device controls."], github: { commit: "37cd251306c8d3504686dacb460a661478e6fe19" } },
  { update: 99, date: "2026-10-19", title: "Profile sharing and consent", changes: ["Unified data choices and clarified category sharing and Sync review."], github: { commit: "0933762ac4e6eac3bc2056acee5af5160960469c" } },
  { update: 98, date: "2026-10-19", title: "History review compatibility", changes: ["Kept larger history reviews within the database query limits."], github: { commit: "77949a167ceed2d9d9e06442d5799facc4e59523" } },
  { update: 97, date: "2026-10-19", title: "Reserved account sync", changes: ["Added automatic sync and protected retention for the reserved account."], github: { commit: "faa258d9d8f9af94feb97af9bf55e0f8bd09636e" } },
  { update: 96, date: "2026-10-19", title: "Three consent actions", changes: ["Added three clear participation choices and presets for draft sharing settings."], github: { commit: "1d2e9a5e79d6f99efe4bf1b10aa31c8b06f9eab2" } },
  { update: 95, date: "2026-10-19", title: "Community and tournament refinements", changes: ["Simplified tournament review and addressed dependency findings."], github: { commit: "db43bcefbeb730582e043f381a62d6a4cb4a5918" } },
  { update: 94, date: "2026-10-19", title: "Personal Tournament", changes: ["Released the reviewed Personal Tournament and listening flow."], github: { commit: "dc84b5e4735a75bedd1f4399901070f391cef519" } },
  { update: 93, date: "2026-10-18", title: "Maintenance controls", changes: ["Refined notice durations and how paused tools are shown."], github: { commit: "7b1fb8813ef865a42d49a3ec725968ffc7dccdf6" } },
  { update: 92, date: "2026-10-18", title: "Independent maintenance and consent", changes: ["Added controls for individual tools and kept consent review accessible during a Shootout pause."], github: { commit: "0e16d82cdeda8dc50493f70f85788dd8f311a374" } },
  { update: 91, date: "2026-10-18", title: "Shootout-only maintenance", changes: ["Scoped a timed maintenance pause to Shootouts so other listening tools stayed available."], github: { commit: "0cca4cab881a82a5bbd348cc99d83392b549aa24" } },
  { update: 90, date: "2026-10-18", title: "Ranking file hashes", changes: ["Improved SHA-256 file matching and preserved ties."], github: { commit: "e008fe0bdcfcba09d3cc4719c7a2ea1f2bdd9c1d" } },
  { update: 89, date: "2026-10-18", title: "Rankings counts and file matching", changes: ["Corrected ranking subset counts and explained how the original song matching worked."], github: { commit: "b2e7dc2600a363b661a37bc950ebf49876f1dbd0" } },
  { update: 88, date: "2026-10-18", title: "Compact participation dialog", changes: ["Kept nickname and monitoring choices usable on shorter screens."], github: { commit: "308b411cb067b78043dcd5ddd1a1735a34b04148" } },
  { update: 87, date: "2026-10-18", title: "Nickname and monitoring choices", changes: ["Made both choices available in the participation dialog."], github: { commit: "b37e9f21ed52603603f7ca61aa26f9a390e04c2e" } },
  { update: 86, date: "2026-10-18", title: "Optional nickname and site fixes", changes: ["Added an optional nickname and addressed findings from the site review."], github: { commit: "c80102f680bd75778ceb5c6b32540fcdb1948e98" } },
  { update: 85, date: "2026-10-18", title: "Matched A/B rankings", changes: ["Recommended matched A/B rankings and clarified how to interpret them."], github: { commit: "764137a83c09a3ceb0036e668fcea47e9b0d8639" } },
  { update: 84, date: "2026-10-18", title: "Notice duration controls", changes: ["Added exact service-notice durations and refined the controls."], github: { commit: "0f5ed34b0d21a78b9c0a304e7cd4c4b71c7304b3" } },
  { update: 83, date: "2026-10-18", title: "Ultrawide and TV layouts", changes: ["Adjusted spacing and layout for ultrawide and television displays."], github: { commit: "e48cd00ea75a0b372f984f0ed279644effab5f38" } },
  { update: 82, date: "2026-10-18", title: "Invitation controls", changes: ["Added an invitation mode with open access as the default."], github: { commit: "4780286c2c7b1fe9d5f9d3572cbe5b2f7f490dcb" } },
  { update: 81, date: "2026-10-18", title: "Welcome tagline", changes: ["Updated the Welcome tagline and its readability over the artwork."], github: { commit: "7c191b8caf9f26ef411ac24f8ad8daddf65df717" } },
  { update: 80, date: "2026-10-18", title: "Continue button", changes: ["Restyled Continue and verified that it starts a new blinded pair."], github: { commit: "51c315c12090e61c3a306605de19ab6ee50d5ec0" } },
  { update: 79, date: "2026-10-18", title: "Matched listening passages", changes: ["Added movable five-second passages and improved the upload, listening and voting flow."] },
  { update: 78, date: "2026-10-18", title: "Matched-passage rollout", changes: ["An intermediate rollout exposed a stale application preload that was corrected in update79."] },
  { update: 77, date: "2026-10-18", title: "Alphabetical curve credits", changes: ["Sorted the curve credits alphabetically by curve name."], github: { commit: "afb97bfaf2ecf9094cb7a88399a01ba7f3bf7d2a" } },
  { update: 76, date: "2026-10-18", title: "Full curve attribution", changes: ["Added source, creator and use information for every built-in curve."] },
  { update: 75, date: "2026-10-18", title: "Responsive Welcome header", changes: ["Added an animated header with listening links and responsive controls."], github: { commit: "2890dc2aff7ae25bd445e230966ee873b04f3993" } },
  { update: 74, date: "2026-10-18", title: "Welcome Sync and data controls", changes: ["Made Browser Sync more prominent and renamed the Welcome disclosure Your data control."], github: { commit: "a923cc1d068a065149602375c000cc51b1ff201d" } },
  { update: 73, date: "2026-10-18", title: "Browser Sync", changes: ["Added the browser pairing flow and a Welcome Settings menu."], github: { commit: "19147e9bdbf9e5caeec2cc746d95d47a057afe4a" } },
  { update: 72, date: "2026-10-18", title: "Service notices", changes: ["Deployed timed service notices."] },
  { update: 71, date: "2026-10-18", title: "Early deployment", changes: ["The deployment is recorded. Release notes are unavailable."] },
  { update: 70, date: "2026-10-18", title: "Sodium credits", changes: ["Added Sodium attribution and explained the target reconstruction."], github: { commit: "24183cce8ae99e07b7b004ed1b9a85c577d309bb" } },
  { update: 69, date: "2026-10-18", title: "Agreement controls and navigation", changes: ["Updated data agreement controls and navigation on Welcome."], github: { commit: "4ec1271ac26d7956dca2b09c4bf0f8a5f1bfda2f" } },
  { update: 68, date: "2026-10-18", title: "Early deployment", changes: ["The deployment is recorded. Release notes are unavailable."] },
  { update: 67, date: "2026-10-18", title: "Early deployment", changes: ["The deployment is recorded. Release notes are unavailable."] },
  { update: 66, date: "2026-10-18", title: "Rankings and navigation fixes", changes: ["Updated the ranking controls, saved-agreement Close button and Welcome Shootout link."] },
  { update: 65, date: "2026-10-18", title: "Early deployment", changes: ["The deployment is recorded. Release notes are unavailable."] },
  { update: 64, date: "2026-10-18", title: "Early deployment", changes: ["The deployment is recorded. Release notes are unavailable."] },
  { update: 63, date: "2026-10-18", title: "YinYang target names", changes: ["Updated the names and creator attribution for the project’s three preference targets."], github: { commit: "de77fca3220259d5c39c0fc2577fa02587076019" } },
  { update: 62, date: "2026-10-18", title: "Listening and rankings integrity", changes: ["Updated linked deletion, listening and ranking records."] },
  { update: 61, date: "2026-10-18", title: "Early deployment", changes: ["The deployment is recorded. Release notes are unavailable."] },
  { update: 60, date: "2026-10-18", title: "Early deployment", changes: ["The deployment is recorded. Release notes are unavailable."] },
  { update: 59, date: "2026-10-18", title: "Early deployment", changes: ["The deployment is recorded. Release notes are unavailable."] },
  { update: 58, date: "2026-10-18", title: "FLAC seeking", changes: ["Fixed FLAC byte ranges and restored assets that had been omitted from the build."] },
  { update: 57, date: "2026-10-18", title: "Early deployment", changes: ["The deployment is recorded. Release notes are unavailable."] },
  { update: 56, date: "2026-10-18", title: "Early deployment", changes: ["The deployment is recorded. Release notes are unavailable."] },
  { update: 55, date: "2026-10-18", title: "Early deployment", changes: ["The deployment is recorded. Release notes are unavailable."] },
  { update: 54, date: "2026-10-18", title: "Early deployment", changes: ["The deployment is recorded. Release notes are unavailable."] },
  { update: 53, date: "2026-10-18", title: "Listening Pool", changes: ["Deployed the expanded Listening Pool and verified playback and seeking."] },
  { update: 52, date: "2026-10-18", title: "Early deployment", changes: ["The deployment is recorded. Release notes are unavailable."] },
  { update: 51, date: "2026-10-18", title: "Listening Pool rollout and history error", changes: ["The Worker upload succeeded. The infrastructure operation failed while recording its update history."] },
  { update: 50, date: "2026-10-18", title: "Privacy and linked deletion", changes: ["Updated the listening data privacy, deletion and archive workflows."] },
  { update: 49, date: "2026-10-17", title: "Diamond target names and export", changes: ["Renamed PEQdB Diamond entries and preserved exports through the name change."] },
  { update: 48, date: "2026-10-17", title: "Music voting and playback controls", changes: ["Added music voting, centered playback and moved volume into the player controls."], github: { commit: "320da2e532dbfbf69bdf3ce04915ebe02d0d4dde" } },
  { update: 47, date: "2026-10-17", title: "Public asset routing", changes: ["Enabled selective public routing for approved static assets."] },
  { update: 46, date: "2026-10-17", title: "Infrastructure import", changes: ["The deployment history records an infrastructure import."] },
  { update: 45, date: "2026-10-17", title: "Infrastructure import", changes: ["The deployment history records an infrastructure import."] },
  { update: 44, date: "2026-10-17", title: "Full-width Welcome art", changes: ["Extended the Welcome background artwork to the edges of the page."], github: { commit: "3f39750edf44fcf21f82812de1aacc2e70fb3ba8" } },
  { update: 43, date: "2026-10-17", title: "Hosting safeguards", changes: ["Added sampled logging, short-lived caching and deployment limits for static files."] },
  { update: 42, date: "2026-10-17", title: "Verified curve credits", changes: ["Published nine curve credits with verified source and license information."] },
  { update: 41, date: "2026-10-17", title: "Unsuccessful deployment attempt", changes: ["The deployment history records an unsuccessful rollout."] },
  { update: 40, date: "2026-10-17", title: "Raw preference results", changes: ["Updated research results to make the raw preference results easier to identify."] },
  { update: 39, date: "2026-10-17", title: "Early deployment", changes: ["The deployment is recorded. Release notes are unavailable."] },
  { update: 38, date: "2026-10-17", title: "Navigation icons and sound", changes: ["Added icons and hover sounds to major navigation links."], github: { commit: "d79bf54957e81663682562c99e83bfd67203a84d" } },
  { update: 37, date: "2026-10-17", title: "Responsive spacing", changes: ["Improved header spacing, the Music Library introduction and widths on pages with results."], github: { commit: "957cf9a48bb3a86471137542ad46a39bc1f5321b" } },
  { update: 36, date: "2026-10-17", title: "Early deployment", changes: ["The deployment is recorded. Release notes are unavailable."] },
  { update: 35, date: "2026-10-17", title: "Listening cooldown policy", changes: ["Removed the shared daily test cap and adjusted how cooldowns escalate and reset."] },
  { update: 34, date: "2026-10-17", title: "Early deployment", changes: ["The deployment is recorded. Release notes are unavailable."] },
  { update: 33, date: "2026-10-17", title: "Early deployment", changes: ["The deployment is recorded. Release notes are unavailable."] },
  { update: 32, date: "2026-10-17", title: "Early deployment", changes: ["The deployment is recorded. Release notes are unavailable."] },
  { update: 31, date: "2026-10-17", title: "Early deployment", changes: ["The deployment is recorded. Release notes are unavailable."] },
  { update: 30, date: "2026-10-17", title: "Early deployment", changes: ["The deployment is recorded. Release notes are unavailable."] },
  { update: 29, date: "2026-10-17", title: "Early deployment", changes: ["The deployment is recorded. Release notes are unavailable."] },
  { update: 28, date: "2026-10-17", title: "Early deployment", changes: ["The deployment is recorded. Release notes are unavailable."] },
  { update: 27, date: "2026-10-17", title: "Early deployment", changes: ["The deployment is recorded. Release notes are unavailable."] },
  { update: 26, date: "2026-10-17", title: "Early deployment", changes: ["The deployment is recorded. Release notes are unavailable."] },
  { update: 25, date: "2026-10-17", title: "Early deployment", changes: ["The deployment is recorded. Release notes are unavailable."] },
  { update: 24, date: "2026-10-17", title: "Early deployment", changes: ["The deployment is recorded. Release notes are unavailable."] },
  { update: 23, date: "2026-10-17", title: "Early deployment", changes: ["The deployment is recorded. Release notes are unavailable."] },
  { update: 22, date: "2026-10-17", title: "Music Library waveforms and EQ", changes: ["Added optional Music Library EQ, hosted tracks and precomputed waveforms."] },
  { update: 21, date: "2026-10-17", title: "Undecided track label", changes: ["Renamed New listening to Undecided in Music Library."] },
  { update: 20, date: "2026-10-16", title: "Early deployment", changes: ["The deployment is recorded. Release notes are unavailable."] },
  { update: 19, date: "2026-10-16", title: "Early deployment", changes: ["The deployment is recorded. Release notes are unavailable."] },
  { update: 18, date: "2026-10-16", title: "Unsuccessful deployment attempt", changes: ["The deployment history records an unsuccessful rollout."] },
  { update: 17, date: "2026-10-16", title: "Early deployment", changes: ["The deployment is recorded. Release notes are unavailable."] },
  { update: 16, date: "2026-10-16", title: "Early deployment", changes: ["The deployment is recorded. Release notes are unavailable."] },
  { update: 15, date: "2026-10-16", title: "Early deployment", changes: ["The deployment is recorded. Release notes are unavailable."] },
  { update: 14, date: "2026-10-16", title: "Early deployment", changes: ["The deployment is recorded. Release notes are unavailable."] },
  { update: 13, date: "2026-10-16", title: "Early deployment", changes: ["The deployment is recorded. Release notes are unavailable."] },
  { update: 12, date: "2026-10-16", title: "Early deployment", changes: ["The deployment is recorded. Release notes are unavailable."] },
  { update: 11, date: "2026-10-16", title: "Unsuccessful deployment attempt", changes: ["The deployment history records an unsuccessful rollout."] },
  { update: 10, date: "2026-10-16", title: "Early deployment", changes: ["The deployment is recorded. Release notes are unavailable."] },
  { update: 9, date: "2026-10-16", title: "Voting data acknowledgement", changes: ["Restored the homepage voting data notice for newly invited browsers."] },
  { update: 8, date: "2026-10-16", title: "Private browsing invitation fix", changes: ["Fixed invitation redemption in private browsing."] },
  { update: 7, date: "2026-10-16", title: "Private tester invitations", changes: ["Added one-time invitations and browser sessions for private testing."] },
  { update: 6, date: "2026-10-16", title: "Built-in tracks for Open comparison", changes: ["Added the 20 built-in tracks to the Open comparison selector."] },
  { update: 5, date: "2026-10-16", title: "Private access session", changes: ["Kept private site access active after sign-in while the research dashboard used a separate authorization."] },
  { update: 4, date: "2026-10-16", title: "Staging maintenance ended", changes: ["Reopened the staging app behind private access."] },
  { update: 3, date: "2026-10-16", title: "Staging JavaScript and CSS", changes: ["Fixed routing for the application’s JavaScript and stylesheet files."] },
  { update: 2, date: "2026-10-16", title: "Private staging access", changes: ["Added password protection for the site and its assets."] },
  { update: 1, date: "2026-10-16", title: "First Cloudflare deployment", changes: ["Created the staging Worker and database for the first hosted version."] },
];
