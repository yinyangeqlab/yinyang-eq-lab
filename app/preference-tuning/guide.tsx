"use client";
/**
 * The body of the Tuning Instructions dialog: a short first pass, two worked examples, then one expandable topic
 * for every group of controls on the page. The dialog shell, focus handling and Escape live in editor.tsx.
 * Control names are written as they appear on the page; keep them in step with the editor when a label changes.
 */
import { PERSONAL_AREA_TITLE } from "@/lib/personal-area";
import { useEffect, useRef, useState } from "react";

export type GuideTopic = "setup" | "playback" | "loop" | "compare" | "snapshots" | "tone" | "graph" | "filters" | "history" | "display" | "fit" | "export" | "dock" | "privacy";

type Row = [control: string, behavior: string];
type Topic = { id: GuideTopic; title: string; where: string; rows: Row[] };

const TOPICS: Topic[] = [
  {
    id: "setup", title: "Headphones, target and saved EQ", where: "The bar at the top of the page",
    rows: [
      ["Headphones · Target bar", "Shows the headphones and the target or saved EQ in use. Press it (Choose, Change or Close) to open or close the chooser. It opens by itself when something needed is missing and closes when the choice is complete."],
      ["Headphone measurement", "Pick In-Ear or Over-Ear, search the catalog for your model and select a measurement. It is copied into this browser so the lab can fit the target to your headphones. Switching between In-Ear and Over-Ear clears the selected measurement."],
      ["Upload, edit, delete, clear", "The upload button opens the measurement editor for your own measurement file. Close measurement editor puts it away. Measurements you have added stay listed in this browser, where you can select, edit or delete them. Clearing the selection keeps the saved measurements and returns the lab to tuning without a headphone fit."],
      ["Target", "Starts from a target curve. With a measurement chosen, the lab fits an EQ that brings your headphones to that target, and that fitted sound is your Starting sound. The Target curve list is ordered by the current listener ranking. Without headphones you hear only your own adjustments on the original sound."],
      ["Import", "Loads a target from a CSV or TXT file for this session."],
      ["Saved EQ", `Starts from an EQ saved in ${PERSONAL_AREA_TITLE}. Its stored filters are the Starting sound and your adjustments are added on top. If the EQ is linked to a headphone measurement kept in this browser, that measurement is selected for you. If the linked measurement is missing, the saved filters still play. The headphone curves need a linked measurement.`],
      ["Switching Target and Saved EQ", "Each mode keeps its own adjustments. Switching mode, or choosing a different saved EQ, clears Undo and Redo. A newly chosen saved EQ starts with all adjustments at zero."],
      ["Links that name a target", "A link that opens Tuning with a specific target loads it with neutral adjustments. Undo brings back the tuning you had."],
    ],
  },
  {
    id: "playback", title: "Playback, music and volume", where: "Listen and compare, beside the graph",
    rows: [
      ["Play / Pause", "The square button at the start of the strip. Starts or pauses the music. With no track chosen, Play starts a random library song. With playback shortcuts enabled, Space also plays or pauses when the player has focus. The shortcut follows your site playback preferences."],
      ["Song search beside Play", "Type a title or artist to find a library song, then choose it with the pointer, or with ↑, ↓ and Enter. Escape closes the list. It works with the card collapsed or expanded, and the chosen song is loaded ready to play. The field shows the loaded library song. The player shows the file name when you load a file from your device."],
      ["Show waveform / Hide waveform", "Show waveform opens the stereo waveform directly below Play and search. It also reveals Volume, Dynamics, zoom and the loop range when a loop is active. Music keeps playing when you close it."],
      ["Seeking", "Drag the thin progress line to seek. It also marks the active loop. In the expanded view, click the waveform to jump to that moment. With the waveform focused, ← and → step a quarter of a second, or one second with Shift."],
      ["Volume", "The slider under the waveform in the expanded card. Sets how loud the music plays on this page. It does not change your tuning, the graph or any export."],
      ["Zoom − / +", "Below the waveform, beside Hide waveform. Magnifies it from 1× to 8× for precise seeking and loop edges. Available once the waveform has been drawn."],
      ["Dynamics", "The switch beside Volume. It shows a slider beside the waveform for the track’s contrast between quiet and loud moments. Move up to expand the contrast and make quiet parts quieter. Move down to compress the contrast with makeup gain. 0% uses the original dynamics. It is a listening aid only and cannot restore detail already lost in a compressed recording. Available once a track has started playing."],
      ["Reset dynamics", "Appears beside Dynamics, showing the current amount, when dynamics is not at 0%. It puts dynamics back to 0%."],
      ["Choose music", "Below the comparison controls, in both player views. Opens the library search and the audio file and folder controls for your device."],
      ["Song search in Choose music", "The same search as the one beside Play. Both fields always show the same loaded library song, whichever one chose it, and after Random song too."],
      ["Random song", "Loads and plays a random library song. When several songs are available, it skips the one you just played."],
      ["Audio file and Music folder", "Plays audio from your device. After choosing a folder, Shuffle folder and the folder track list pick other tracks from it. These files play in this browser and stay on your device."],
      ["Selected sound", "Names the target and headphones or saved EQ you’re hearing. It also shows the active comparison, snapshot, channel match, loudness match or loop and tells you when EQ is still being prepared."],
      ["Messages", "“Preparing headphone EQ” means the fit for a new target or measurement is being calculated. Music already playing carries on with the previous sound. If a track cannot be played, the card says so and offers another choice."],
    ],
  },
  {
    id: "loop", title: "Loop passage", where: "Below the waveform, beside Your tuning and Starting sound",
    rows: [
      ["Loop from playhead", "Repeats about 5 seconds starting at the playhead. Near the end of a track the loop slides back to keep its length. A shorter track plays in a full-track loop. Press it again to return to normal playback."],
      ["Resize on the waveform", "With the player expanded, drag either edge of the highlighted passage. A loop is at least half a second long."],
      ["Start and End fields", "Type a time in seconds, to one decimal. A valid time applies as you type. Anything else is dropped when you leave the field. The length is shown beside them."],
      ["Start here / End here", "Moves that edge to the playhead. If that would cross the other edge, the loop keeps its length and moves instead."],
      ["Clear loop", "Removes the loop and plays on normally. Loading another track also clears it."],
      ["While comparing", "The loop keeps repeating when you switch between Your tuning, Starting sound and snapshots, so each switch plays the same moment. It also carries on in the player shown on other pages."],
    ],
  },
  {
    id: "compare", title: "Your tuning, Starting sound and the listening switches", where: "Listen and compare, beside the graph",
    rows: [
      ["Your tuning", "Plays the Starting sound plus every adjustment you have made. This is the sound the graph’s colored curve describes and the one you edit."],
      ["Starting sound", "Plays the fitted target or the saved EQ without your adjustments, at the same place in the music. Both buttons become available once you have changed something or saved a snapshot. Making an edit switches back to Your tuning."],
      ["Match loudness", "Turns the louder sounds down to the level of the quietest one among Your tuning, Starting sound and your snapshots, so a level difference does not pass for a better sound. The estimate comes from the music that is playing and needs about a second of it. It never makes anything louder, never changes your tuning, the graph or exports, and starts again when the track, loop or starting sound changes."],
      ["EQ on / off", "Turn EQ off to bypass the target fit or saved EQ and your tuning. Channel match and playback dynamics have their own controls. Turn EQ on to compare sounds again."],
      ["Channel match on / off", "Applies the left and right balance correction for your headphones, from paired measurements or an uploaded preset. It is unavailable when the selected headphones have no channel match."],
      ["Channel match downloads", "Under the graph. Download TXT (IIR) gives editable left and right parametric EQ settings. For an automatic match it approximates the correction. Download WAV (FIR) gives a 48 kHz stereo impulse to load into a convolver, which applies the channel correction and adds about 85 ms of delay. Saved channel matches links to the ones you have kept."],
    ],
  },
  {
    id: "snapshots", title: "Snapshots", where: "Listen and compare, under the compare buttons",
    rows: [
      ["What a snapshot is", "A copy of your current adjustments, kept so you can carry on editing and still listen to that version again. Saving one changes nothing in your tuning or its Undo history."],
      ["Save tuning snapshot", "Saves into the next free slot, from A through C. When all three are in use, replace or remove a snapshot to save another."],
      ["Naming", "The name field opens as soon as a snapshot is saved. Type up to 24 characters and press Enter, or leave it as “Snapshot A”. Escape puts the old name back. Rename later under “Name, apply, replace or remove”."],
      ["A, B, C buttons / Listen", "Plays that snapshot in place of your tuning. While it plays, editing is paused, on the sliders, in Filters and on the graph, so it is never unclear which sound an edit would change. Choose Your tuning, Stop listening or Back to Your tuning to carry on."],
      ["Apply to tuning", "Copies the snapshot’s settings into your tuning as one edit. Undo brings back the tuning you had. The ±20 dB range is switched on if the snapshot needs it."],
      ["Replace", "Overwrites the snapshot with your current tuning and keeps its name. This cannot be undone."],
      ["Remove", "Deletes the snapshot and frees its slot. This cannot be undone."],
      ["Where they are kept", "In this browser only, three per starting sound. A starting sound is one target with one headphone measurement, or one saved EQ. Choose a starting sound to see its snapshots. Reset does not delete snapshots. They are not part of any export."],
    ],
  },
  {
    id: "tone", title: "Tone and gain by ear", where: "Tone in the tuning controls, below the player",
    rows: [
      ["Gain sliders", "Bass, Mids & ear gain and Treble move in 0.5 dB steps. Bass and Treble reach ±12 dB and Mids & ear gain ±10 dB. One slider movement is one Undo step."],
      ["dB field", "Type an exact gain and press Enter or leave the field. The ↑ and ↓ keys step by 0.5 dB, or 0.1 dB with Shift. Escape restores the saved value."],
      ["± button", "Switches the gain between boost and cut, for keyboards with no minus key. From 0 dB it starts a 0.5 dB cut."],
      ["Back to 0 dB (↺)", "Returns that band to 0 dB."],
      ["All 6 bands / Show main 3", "All 6 bands adds Sub, Low mids and Sharpness. Pick a band from the six buttons, which also show each gain, and its slider appears. Show main 3 returns to Bass, Mids & ear gain and Treble. The sound still includes adjustments to all six bands."],
      ["What each band affects", "Sub affects deep rumble, Bass adds weight and drum impact, and Low mids change the fullness of voices and instruments. Mids & ear gain changes how forward voices feel. Sharpness affects consonants and “s” sounds. Treble affects brightness and cymbal detail. The graph labels show the general regions. Filters shows each band’s center or shelf transition and lets you change its shape."],
      ["±20 dB range / Allow ±20 dB", "The switch in Graph display lets every gain reach ±20 dB. Switching it off brings larger gains back inside the normal limits."],
      ["What to listen for", "A short list of what raising or lowering each main band sounds like."],
    ],
  },
  {
    id: "graph", title: "Graph dragging, selection and Q", where: "The graph",
    rows: [
      ["Drag in Tone", "Drag a region up or down to change that band’s gain, exactly like its slider."],
      ["Drag in Filters", "Drag at a frequency to add a narrow cut or boost there (a peak with Q 4), or drag an existing white point to adjust it. To remove a correction, use its ✕ button in Filters. Up to four narrow corrections can exist."],
      ["Shift-drag", "Swaps the two behaviors: in Tone it adds a narrow correction, in Filters it moves the whole region. On touch screens, switch between Tone and Filters instead."],
      ["Selection", "Pressing or dragging on the graph selects that band: its region is tinted and marked with a colored bar. Choosing a band or a correction in the controls selects it on the graph too."],
      ["Mouse wheel (Filters only)", "With a band selected, scrolling over the graph changes that band’s Q. The line “Scroll adjusts … Q” shows the value. In Tone, or with nothing selected, the wheel scrolls the page as usual."],
      ["B, EG and T markers", "Move the frequency of Bass (60–250 Hz), Mids & ear gain (1.5–4.5 kHz) and Treble (3.5–10 kHz). Drag a marker sideways, or focus it and use the ←, →, Home and End keys."],
      ["Readout under the graph", "Names the band or frequency under the pointer, then “≥0.1 dB change” with the frequency range over which that filter changes the level by at least 0.1 dB, its Q, its gain, and its effect at the pointer. The dashed area on the graph marks the same range. “Under 0.1 dB change across this view” means the filter changes the level by less than 0.1 dB throughout the visible range."],
      ["While a snapshot plays", "The graph cannot be edited and says so in the readout."],
    ],
  },
  {
    id: "filters", title: "Filter shapes, frequency, Q and narrow corrections", where: "Filters in the tuning controls, below the player",
    rows: [
      ["Band filters", "One row for each of the six bands. Changes apply when you press Enter or leave a field. Escape cancels what you typed."],
      ["Shape", "Peak raises or lowers a region around a center frequency. Low shelf changes everything below its transition frequency. High shelf changes everything above it."],
      ["Hz", "Bass, Mids & ear gain and Treble can move in frequency, here or with the B, EG and T markers. Sub (40 Hz), Low mids (320 Hz) and Sharpness (6.5 kHz) are fixed."],
      ["Q", "Higher Q narrows a peak, up to 20, or makes a shelf’s transition steeper. Shelf Q stops at about 0.707 so the transition stays smooth."],
      ["dB and ±", "The band’s gain, the same value as its Tone slider. ± switches between boost and cut."],
      ["Narrow corrections", "Up to four extra peaks for a single resonance or sharp note. Each row has its frequency, Q, gain and a remove (✕) button. To add one, enter Frequency (Hz), Gain (dB) and Q, then Add. Use negative gain to cut. Choose a gain other than 0 dB and add one correction per frequency."],
      ["Shape and Q help", "The same shape and Q explanation, kept beside the fields."],
    ],
  },
  {
    id: "history", title: "Undo, Redo and Reset", where: "At the top of the Tone or Filters controls",
    rows: [
      ["Undo / Redo", "Step back and forward through your edits. The numbers show how many steps are available. Ctrl or ⌘ with Z undoes. Ctrl or ⌘ with Shift and Z, or Ctrl with Y, redoes. A whole drag or slider movement is one step, and so is applying a snapshot."],
      ["Reset", "Asks first. Reset tuning then restores the starting target (the top-ranked target, or the flat reference), sets every gain, shape, Q and frequency back, removes narrow corrections, restores the graph display and turns EQ back on. It clears all Undo and Redo steps and removes generated EQ results, and cannot be undone. Your headphones, loaded music, loop and snapshots stay. Keep my changes closes the question."],
    ],
  },
  {
    id: "display", title: "Graph legend, overlays and Graph display", where: "Under and above the graph",
    rows: [
      ["Starting target / Saved EQ (gray)", "The sound you started from. Your adjustments add to it."],
      ["Your curve (colored)", "Your tuning, with the same color for each region as its Tone slider. The graph leaves out playback volume and headroom."],
      ["Live spectrum", "The moving shapes while music plays show where the music has energy, in the same region colors."],
      ["Raw headphones", "Overlay: the headphone measurement before any EQ."],
      ["Predicted EQ", "The overlay estimates the result on your headphones for what you are hearing now. It follows the EQ switch, channel match and the sound being compared."],
      ["Saved target", "Overlay, with a saved EQ only: the target stored with that EQ, when it has one."],
      ["Graph display", "Opens the graph scale and the ±20 dB range switch. Use Frequency start and end, Bottom and Top in dB (when Auto-fit dB to curve is off), Width, and Height (0 means automatic). Reset view restores the graph scale defaults. The settings are remembered in this browser."],
      ["About the curves on this graph", "A short reminder of these roles for the current setup."],
    ],
  },
  {
    id: "fit", title: "Advanced EQ settings", where: "Under the graph",
    rows: [
      ["The line on the left", "Names the fit in use for the Starting sound. “Preparing replacement; current sound continues” means a new fit is being calculated. With a saved EQ it describes the stored filters instead, and nothing can be changed."],
      ["Method", "How the headphone EQ for a target is calculated. Fixed bands keeps filters at set frequencies and fits their gains: predictable and easy to enter by hand. Movable bands also places each filter’s frequency and width where it helps most, so the same number of bands follows the target more closely. The PEQdB bounded optimizer searches frequency, gain and Q together within limits that keep the filters practical for real equalizers."],
      ["Bands", "How many filters the fit may use. Start with 10 bands. Try more if narrow peaks or dips still need correcting and your EQ app can use the additional filters."],
      ["Use this as my default", "Keeps the selected method and band count for new sessions in this browser. Uncheck it to return to the site default."],
    ],
  },
  {
    id: "export", title: "Making, saving and downloading EQ settings", where: "Export, at the bottom of the page",
    rows: [
      ["Kept as you go", "With a target, your tuning is saved in this browser as you work. Save & export jumps to the export section."],
      ["Make my EQ settings", "Fits finished EQ settings for your headphones to your adjusted curve. It needs a headphone measurement, and asks once for agreement because viewing or exporting keeps the file, curve and settings for private research. Regenerate EQ settings does it again after more tuning. A note appears when your sound or headphones have changed since the last set."],
      ["EQ results", `Several ready-made versions with different numbers of bands. Start with the recommended one, which favors smaller boosts, especially in deep bass, and listen to the closer fit too when it differs. Each can be compared by ear, saved to ${PERSONAL_AREA_TITLE} (where Tuning and the Music library can use it), or downloaded.`],
      ["View generated EQ results", "Jumps to the most recent results for this setup. Choose the Recommended EQ or Closer fit card to change which version you’ll save or download."],
      ["Listen to both EQs", "When the recommendation and closer fit differ, this opens a listening comparison using the same recording for both."],
      ["Result graph", "Response shows the predicted sound. Deviation from target shows how far the fit is above or below the adjusted target. Show all EQs overlays the generated results. Show selected EQ isolates the version you chose."],
      ["Advanced EQ results", "Opens the full set of fitters and band counts. Choose a result to inspect its fit or use Compare generated EQ results to audition a shortlist."],
      [`Download selected EQ and Save selected EQ to ${PERSONAL_AREA_TITLE}`, `Download uses the selected format. Save adds the selected filters to ${PERSONAL_AREA_TITLE}, where you can load them in Tuning or Music library.`],
      ["Download formats", "A parametric EQ text file, Equalizer APO, EasyEffects (use its Import APO action and set its input gain to the listed preamp if needed) and a Qudelix 5K manual-entry guide."],
      ["Download curve data", "Starting curve data (CSV) is the target you started from. My adjusted curve data (CSV) is that target with your tuning."],
      ["Volume adjustment (preamp)", "Each result lists a preamp that leaves headroom for its boosts. Keep some extra headroom on your player or device."],
      ["Save as new EQ (saved EQ mode)", `Saves the saved EQ plus your adjustments as a new EQ in ${PERSONAL_AREA_TITLE}, named “… · tuned”. The original EQ is unchanged. “Edited · not saved” means there are adjustments not yet saved this way.`],
    ],
  },
  {
    id: "dock", title: "The playback sidebar on other pages", where: "Right edge of the screen, away from Tuning",
    rows: [
      ["When it appears", "Once a track is loaded, leaving Tuning keeps the same music, sound, loop and position going. A small player stays at the right edge of the screen, lower on phones. It follows same-tab site navigation. A refresh starts a new playback session."],
      ["Blue bars", "Open and close the player’s panel."],
      ["Play / Pause", "Always available, open or closed."],
      ["Waveform", "With the panel open: click to seek, and drag the loop edges to resize the loop."],
      ["Hearing", "Switches between Your tuning and Starting sound, or names the sound when there is nothing to compare."],
      ["Loop passage", "Turns the loop on or off and shows its range."],
      ["Return to Tuning", "Goes back to this page with everything as you left it. Editing happens only here."],
      ["Other players", "Starting another player or comparison on the site pauses the Tuning music. Press Play in the sidebar to return to it."],
    ],
  },
  {
    id: "privacy", title: "What stays on your device", where: "The whole page",
    rows: [
      ["Kept in this browser", "Your tuning, snapshots, graph display, headphone measurements, saved EQs and fit defaults. If browser storage is unavailable, the page says so and everything still works in the open tab."],
      ["Music", "Audio files and folders you choose are played in this browser. They are not collected here."],
      ["Sent when you export", "For participating listener accounts, downloading sends the selected target, adjusted curve, settings and exported file for administrator-only research. EQ exports also include the measurement name. The page asks before the first time."],
    ],
  },
];

export default function TuningGuide({ topic }: { topic?: GuideTopic | null }) {
  const index = useRef<HTMLHeadingElement>(null);
  const [open, setOpen] = useState<ReadonlySet<GuideTopic>>(() => new Set(topic ? [topic] : []));
  // Opened from a help link beside a control: show that topic first.
  useEffect(() => { if (topic) document.getElementById(`pt-guide-${topic}`)?.scrollIntoView({ block: "start" }); }, [topic]);
  const allOpen = open.size === TOPICS.length;
  function toggle(id: GuideTopic, shown: boolean) {
    setOpen(current => {
      if (current.has(id) === shown) return current;
      const next = new Set(current);
      if (shown) next.add(id); else next.delete(id);
      return next;
    });
  }
  return <div className="pt-guide">
    <section className="pt-guide-first" aria-labelledby="pt-guide-first-title">
      <div className="pt-guide-index">
        <h3 id="pt-guide-first-title">A simple first pass</h3>
        <button type="button" onClick={() => index.current?.focus()}>Browse all controls</button>
      </div>
      <ol>
        <li>Open the bar at the top and choose your <strong>headphones</strong>, then a <strong>Target</strong> or a <strong>Saved EQ</strong>.</li>
        <li>Press <strong>Play</strong> in the Playback card. It starts a library song. To pick one, use the <strong>song search</strong> beside it. For your own files, expand the card and use <strong>Music</strong>. Keep the volume comfortable.</li>
        <li>Move <strong>Bass</strong>, <strong>Mids &amp; ear gain</strong> or <strong>Treble</strong> by 0.5–1 dB, or drag that part of the graph up or down.</li>
        <li>Switch between <strong>Your tuning</strong> and <strong>Starting sound</strong>. Turn on <strong>Loop from playhead</strong> to hear the same few seconds each time.</li>
        <li>When you like a version, press <strong>Save tuning snapshot</strong> and keep going. <strong>Undo</strong> takes back any step.</li>
        <li>Finish with <strong>Make my EQ settings</strong>, or <strong>Save as new EQ</strong> when you started from a saved EQ.</li>
      </ol>
    </section>
    <section className="pt-guide-examples" aria-labelledby="pt-guide-examples-title">
      <h3 id="pt-guide-examples-title">Two examples</h3>
      <div>
        <p><strong>Voices sound distant.</strong> Play a song with a clear vocal and press Loop from playhead on a sung line. Raise Mids &amp; ear gain by 1 dB, then switch between Your tuning and Starting sound. If it is better, press Save tuning snapshot, try 2 dB, and listen to snapshot A against Your tuning to pick one.</p>
        <p><strong>One sharp “s” sound.</strong> Open Filters. Under Narrow corrections enter Frequency 6500, Gain −3 and Q 4, then Add, or simply drag down on the graph near 6.5 kHz. Turn on Match loudness and compare with Starting sound to hear the cut at a similar level.</p>
      </div>
    </section>
    <div className="pt-guide-index">
      <h3 ref={index} tabIndex={-1}>Look up a control</h3>
      <button type="button" aria-pressed={allOpen} onClick={() => setOpen(allOpen ? new Set<GuideTopic>() : new Set<GuideTopic>(TOPICS.map(row => row.id)))}>{allOpen ? "Close all topics" : "Open all topics"}</button>
    </div>
    <div className="pt-guide-topics">
      {TOPICS.map(row => <details key={row.id} id={`pt-guide-${row.id}`} open={open.has(row.id)} onToggle={event => toggle(row.id, event.currentTarget.open)}>
        <summary><strong>{row.title}</strong><span>{row.where}</span></summary>
        <dl>{row.rows.map(([control, behavior]) => <div key={control}><dt>{control}</dt><dd>{behavior}</dd></div>)}</dl>
      </details>)}
    </div>
  </div>;
}
