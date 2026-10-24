# Private blind EQ comparison — local feature, October 23, 2026

The new `/eq-compare` page compares two user-supplied EQ presets across a chosen
playlist. A separate navigation change links to it from Tournament mode selection. This feature is reconciled locally onto verified scrubbed GitHub main.
Local feature and navigation commits are authorized; push, deployment,
production mutation and backup exports remain separate. Live update117 and its immutable provenance remain unchanged.

## Workflow

1. Name and upload both presets, or use the manual filter forms. One shared
   preamp is the default. Separate Left / Right preamps are optional; importing
   unequal channel preamps automatically enables them. Turning the option off
   applies the displayed Left value to both channels. Imported filter values
   can be reviewed and edited before starting.
2. Select up to 30 Listening Pool and/or local songs. Local files stay in the
   tab; browser codec support applies. Listening Pool keeps existing access
   controls. EQ does not require a headphone measurement.
3. Starting removes the editors from the rendered page and randomly assigns a
   fixed A/B mapping for the entire session. Names, filenames and filter values
   are hidden during listening. This is listening blinding, not protection from
   someone inspecting the browser's memory or developer tools.
4. Prepare each song, listen and switch between synchronized looping passages.
   Move the 15-second passage if desired; changing it clears that song's
   listening evidence. Five seconds of audible, visible-tab playback on each
   side unlocks A/B/no-preference choices. Skipping is available independently.
5. Finish to reveal identities and per-song results. Early reveal explicitly
   ends the session and leaves remaining songs unanswered. Revealed sessions
   cannot accept further choices. An explicit JSON download includes presets,
   revealed mapping, settings and choices, but no audio bytes.

Presets, audio buffers and choices live only in component memory. They are not
written to browser storage, research, ranks, music votes, profiles or Sync.
The new route is outside optional activity-monitoring's page allowlist.
Starting a new session restores the saved preset settings in the editors.
Reloading/closing loses the session; active blind sessions warn on navigation.
Global site authentication, protected audio reads and existing unrelated account
status checks remain subject to the site's normal controls.

## TXT support

- Equalizer APO / Peace parametric TXT: `Preamp:`, enabled/disabled numbered or
  unnumbered filters, PK/PEQ, LS/LSC and HS/HSC, with frequency/gain/Q. Shelves
  without Q use the default Q of sqrt(0.5). Plain LS/HS use center frequency.
- Qudelix / PEQdB parametric TXT: `CH: 0` and `CH: 1`, `TYPE: PEQ`, per-channel
  preamps and filters. Both channel sections are required.
- APO `Channel: ALL`, `L`, `R`, `L R`, and equivalent stereo channel numbers.
  Sequential APO preamps sum on their selected channels.
- Manual entry supports these three filter types, shared/Left/Right scope,
  enabled/disabled rows and a flat reference with zero enabled filters.

Limits: 200 KB TXT, 32 enabled filters/channel, 10–24,000 Hz, ±30 dB filter gain,
Q 0.1–20, ±40 dB accumulated channel preamp. Local songs are limited to 100 MB
each. Filters at or above the decoded recording's Nyquist frequency are refused
rather than silently moved. Unsupported processing commands fail with a line
number. Native `.peace`, GraphicEQ, convolution, includes, slope/corner shelf
modifiers and bandwidth-in-octaves require a supported export or manual entry.

Syntax and center/corner shelf distinctions follow the primary
[Equalizer APO configuration reference](https://sourceforge.net/p/equalizerapo/wiki/Configuration%20reference/).

## Audio and interpretation

The browser decodes one song at a time. OfflineAudioContext renders each preset
on the same passage, including prior audio for filter settling. Explicit RBJ
IIR coefficients preserve shelf Q, which Web Audio's native shelf node ignores.
Mono is copied to both headphone channels; multichannel recordings are refused.

Matching is enabled by default and measures stereo RMS **after** EQ on the
selected passage. One scalar per preset preserves its Left/Right balance. Both
then receive common attenuation for 3 dB sample-peak headroom. Matching off
preserves original relative preamp levels and retains common headroom. No
compressor or limiter changes dynamics. RMS matching is not a promise of equal
perceived loudness or an integrated-LUFS measurement. Physical output clipping
and external DSP are outside the page's control; keep other EQ disabled.

Two output buffers run at the same playhead. A short gain crossfade switches
sides. Pausing, muted volume and hidden tabs do not earn listening time; leaving
the visible tab pauses playback. Results are personal preference counts, not
an ABX identification test, statistical significance or research evidence.

## Original draft verification

The following records the earlier draft review, not a fresh browser run of the
reconciled branch.

- `node scripts/check_blind_eq.mjs`: preset imports, strict rejection, bounds,
  channel scopes, shelf math, matching/headroom, session/reveal guards, initial
  shared-preamp form, import opt-in for unequal preamps and Sync exclusion.
- TypeScript, targeted ESLint and an isolated production build from freshly
  fetched scrubbed main plus this feature. Canonical unrelated drafts retained.
- Isolated synthetic component browser fixture; no admin or participant
  account/session. Actual Web Audio rendering, stereo/mono handling, matched
  RMS/headroom and player lifecycle. Manual validation, stereo TXT upload,
  hidden-name checks, voting lock, first-song playback/switching, next-song
  reset, skip, early-reveal cancellation, reveal and JSON download verified.
- Shared default preamp propagation and optional Left/Right behavior checked
  in the browser. Desktop and narrow layout, keyboard focus and native select
  expansion/selection checked. Explicit dark option colors are readable in
  computed styles; the browser screenshot omits the native popup surface, so
  expanded-menu pixel appearance is not certified.

Physical headphone audition, Safari/iOS, production authenticated playback and
full site acceptance are not claimed. Synthetic audio and review artifacts stay
in ignored `artifacts/blind-eq-review/`. The isolated main-based source/build is
`work/blind-eq-preview-20261023/`; it is a preview, not a deployment package.

## Reconciliation verification — October 23, 2026

The yinyangeqlab connector freshly verified GitHub main as
`787bf67d4dfa286202cd7694a87449f4e6085c08`, matching the complete local Git
object. Shell fetch remains blocked by DNS. All 200 ancestors have the required
lab author and committer, and none appear on the retired-publication list.
The original dirty checkout and index remain unchanged.

The reconciled feature adds the route to the existing share-preview table and
uses its shared metadata helper. A new-session fix restores the actual saved
presets in the editors; playback can no longer retain an old preset while the
form displays defaults. The focused suite now includes this regression.

Current checks: 73 focused EQ assertions, route/share-preview coverage, source
TypeScript, targeted ESLint and production build pass. The available runtime
is Node 26.12.1/npm 12.2.1; the recovery pin is 26.12.0 and was not changed. No
recovery operation was run.

Fresh browser review could not run: socket creation/local Chromium launch is
blocked in the shell, and the connected browser rejects file URLs. Desktop,
narrow, focus and expanded native-select observations above belong to the
earlier synthetic fixture review. They are not fresh acceptance of this branch.
Physical headphone audition and Safari/iOS remain unverified.

This branch is a source preview, not a deployment package. Immutable
LIVE_RELEASE.json, production deployment and recovery provenance are unchanged.
