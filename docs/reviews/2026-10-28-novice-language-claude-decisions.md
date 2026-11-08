# Decisions on Claude's independent beginner audit

October 28, 2026. [Raw independent report](2026-10-28-novice-language-claude.md). Model `claude-fable-5-1`, requested effort **max**, successful completion, 158 turns, no permission denials. Only Read/Glob/Grep tools were available; browser/MCP/shell/edit tools were not provided. An initial network-restricted attempt failed without a substantive review; the authorized network run completed. The long report arrived in two contiguous response segments and is preserved in full.

All 80 inventory entries are addressed below. **Accept** means the issue/direction belongs in the design backlog, not that copy is final or a change has been implemented. **Amend** means the observation is useful but the proposed wording/behavior needs the correction recorded here. **Defer** identifies a product, consent or scientific decision that the audit cannot make. **Reject** means the stated conclusion/replacement should not be used. The main integrated audit and four detailed reports carry the reviewed recommendations.

## Main conclusion

The independent review strongly supports the need for a guided first listen, definitions before necessary decisions, consistent page names, readable setup/recovery, and optional technical detail. Its source quotes are useful evidence. Its draft replacements sometimes overpromise sound accuracy, deletion, perceived loudness, safety, saving or account merging. Those shortcuts are not accepted.

The current owner-only maintenance lock returns the maintenance response before ordinary invitation access. A missing maintenance warning is not proof that a visitor can access the site. The private EQ comparison and shared uncorrected shootouts do not require a headphone measurement; the measured comparison modes do. Avoid the report's overly broad opening claims about every listening path.

## Per-entry decisions

| ID | Decision | Assessment and guardrail |
|---|---|---|
| W1 | Amend | Improve page/share descriptions; “turn it into an EQ” must retain the measurement and supported-output prerequisites. |
| W2 | Accept | Define the target before the first action. Describe desired sound balance, without implying one correct way headphones should sound. |
| W3 | Amend | Make participation plain, but the required collection includes more than A/B picks. Scope audio-file reassurance to the relevant flow and preserve export/metadata disclosures. |
| W4 | Reject replacement | “Same song, same level”, “slightly different” and “using a published measurement” overgeneralize. Matching can be off; perceived differences are not bounded; uploaded measurements also work. Use Entry E05/Listening L06. |
| W5 | Amend | One recommended path is useful. “About 10 minutes” needs observed timing evidence; do not invent a duration or combine independent research permissions. |
| W6 | Amend | Consistent names are accepted. Changing the Listen destination is a product-flow change; preserve existing routes and deliberate research entry. |
| W7 | Reject hiding rule | A new browser with no local data may need Sync most. Keep a clear “Use my saved account data here” path; do not hide it solely because this browser is empty. |
| W8 | Amend | The cheerful rate-limit heading should change. Do not blame fast clicking without evidence, or say an action was not saved for every failed/read request. Use actual retry data and cause-specific state. |
| W9 | Accept | Align historical League branding on the feature-maintenance page with the product name. Preserve the lock and timing semantics. |
| C1 | Amend | Explain required participation first. Summarize all material collection categories, including tuning downloads, and distinguish first refusal from later withdrawal. |
| C2 | Amend | Do not make broad “all sharing” an equal primary shortcut without readable categories. Keep optional choices distinct; important consequences cannot exist only in collapsed detail. |
| C3 | Accept | Move optional nickname after the necessary decision or into account settings. Preserve accurate name validation and clear error recovery. |
| C4 | Defer | Preselecting No would change the current explicit monitoring Yes/No interaction. Record as a design proposal; do not implement as a copy cleanup or remove informed choice. |
| C5 | Amend | Define tags and file fingerprint with examples. It is a calculated identifier, not guaranteed anonymous or random; retain the complete disclosed metadata scope. |
| C6 | Amend | Group advanced historical/file contributions with readable summaries. Labels such as “none open” must reflect actual state, and selected choices/material permanent-result consequences must remain apparent. |
| C7 | Defer | A next-step cue is useful. Removing the reload needs analysis of access/consent refresh and pending-action state; a smoother transition cannot bypass those requirements. |
| C8 | Accept | Add plain first-layer privacy summaries while preserving full methods, retention and deletion limitations. This is not legal approval. |
| S1 | Amend | Give familiar examples of external sound processing. Preserve supported channel-correction, comfortable-volume and exposure limitations; do not imply the website controls device settings. |
| S2 | Accept | Make headphone model search the primary path and existing measurement-file upload the expert alternative. |
| P1 | Reject replacement | “Comes out as intended on your pair” repeats an accuracy overpromise. A model measurement supports an estimate; unit/fit/source differences remain. |
| P2 | Amend | Rename sources consistently. Keep a brief advance warning when a one-song choice will limit later checks, with specific recovery at the blocker. |
| P3 | Amend | Explain session size dynamically; no untested ten-minute promise. Say this browser when that is the actual storage scope, and respect storage failures. |
| P4 | Accept | Translate advanced-panel summary into the effect of source level and left/right correction, with exact values available. |
| P5 | Amend | Plain method introduction is useful. Do not imply every session automatically completes a fixed top-three test; reflect the actual selected finalist count and stage. |
| P6 | Amend | Clear progress and Sound A/B labels help. Selecting A/B is not always the same action as starting playback. Preserve actual tie/uncertainty meaning rather than blindly renaming every choice. |
| P7 | Reject replacement | Distinct recording references/file fingerprints do not prove different songs. “Rested sounds are shown less often” also should not replace precise bench/exclusion behavior without checking it. |
| P8 | Amend | Hide setup diagnostics from the result headline, but retain separate-run identity. A saved checkpoint is not necessarily “your last break.” |
| P9 | Amend | Clarify pool choice and missing uploaded correction. Do not assume Automatic can perform a correction without the necessary left/right responses; offer only valid choices. |
| P10 | Reject simplification | “Your picks stay on this device” can conceal sync/research copies. An old contribution can remain even if sharing is now off, so Undo must still explain any surviving record. |
| L1 | Amend | Lead with the next listening action. Keep a concise actual data-destination status visible; place the longer explanation in detail. |
| L2 | Amend | Expand IE/OE/BOTH where displayed. Preserve actual counts/categories. Digital clipping is not a measured ear-level “Too loud” warning. |
| L3 | Accept | Plain source-level labels with the actual LUFS values accessible. Do not promise equal perceived loudness or headphone-output safety. |
| L4 | Accept | Put specialized channel-correction selection in advanced setup, with state/prerequisites available and no silent policy change. |
| L5 | Accept | Lead results with preferences/progress; put unvalidated consistency diagnostics below and explain their limits. |
| L6 | Amend | Action-oriented selector labels are useful. “Your upload” does not replace the privacy meaning of a “private” badge; preserve both origin and audience. |
| L7 | Amend | Make lock reasons visible rather than tooltip-only. A single tie label is suitable only if it preserves each mode's recorded answer meaning. |
| L8 | Amend | Explain the same-section requirement and retain its switch where permitted. “Your pick is still saved” must reflect actual save success, consent and storage availability. |
| L9 | Amend | Promote Play both. It randomizes order: never promise A then B. Say it plays the same selected section on each sound. |
| L10 | Accept | Put technical player diagnostics in readable disclosures; retain useful controls and mode-specific availability. Validate dynamics descriptions against actual processing. |
| L11 | Amend | Use one name for music from the device. Keep stereo, size and browser-format restrictions, and explain them plainly instead of removing them. |
| L12 | Defer wording | Separate optional song ratings from A/B choices. The actual song-rating question requires a product/research decision; do not invent the study construct. |
| L13 | Amend | Preference first is good. Keep save/submission status visible; do not label an “ideal answer” as a hearing grade or claim nothing can count against a listener beyond verified policy. |
| L14 | Amend | Correct the missing-headphone/empty-pool path. Do not suggest choosing the wrong headphone category merely to get available targets. |
| L15 | Amend | Translate server errors by their actual cause and save state. A blanket “Your pick is kept” may be false, and Refresh should not precede protecting unsaved work. |
| L16 | Accept | Keep A/B naming and operator identity consistent. Optional feedback descriptions need examples without silently changing research tag meaning. |
| M1 | Amend | Brand/model search and source details help. Do not broaden in-ear/over-ear to unsupported earbuds/on-ear categories without a compatibility decision. |
| M2 | Amend | Lead with who the form is for and show the easier catalog route. “Choose Unknown” is not currently a measurement-form option; never encourage invented provenance. |
| M3 | Accept | Make My space's contents and advanced target-creation purpose explicit; preserve target/measurement/EQ distinctions. |
| R1 | Amend | Lead with preferences and disclose diagnostics. Use “this browser” and account-copy qualifications, not a universal device-only/erased-on-clear claim. |
| R2 | Amend | Expand result tags consistently, preserving browser-only/research/ranking differences and the exact meaning of fit RMS. |
| R3 | Reject replacement | “Delete everywhere” is too broad: backups, external exports, other copies and finalized protected group results can have different handling. Name the exact deletion scope. |
| K1 | Amend | Add an everyday explanation, but “strict tests” can sound certified. Describe the included listening protocol and retain exploratory limits. |
| K2 | Reject replacement | Participant groups are not verified unique people. Do not replace “4 participant groups” with “4 listeners” or imply a population sample. |
| K3 | Accept | Add a plain method introduction while preserving assumptions. Model SD is not interchangeable with a confidence interval or proof of an order. |
| U1 | Accept | Consistent library/source naming and clearer tabs reduce avoidable vocabulary. |
| U2 | Reject category replacements | “Compressed-sounding / Natural dynamics” infers audible qualities and processing causes from classification. Keep neutral measured descriptions and no quality hierarchy. |
| U3 | Defer wording | The rating question needs a defined purpose. Do not replace an actual authentication failure with consent advice; these are separate states. |
| U4 | Reject safety phrase | “Keeps the volume safe” is not supported by digital preamp/headroom. Explain reduction intended to reduce distortion, with no guarantee of safe ear exposure. Other hierarchy improvements are accepted. |
| T1 | Amend | Outcome-first Tuning language is useful. Explain the unmeasured preview precisely: added EQ changes work, but selected target fitting is absent until a measurement is supplied. |
| T2 | Accept | Explain slider effects and advanced marker controls in plain language; keep units/filter behavior available and avoid universal perceptual promises. |
| T3 | Reject rank replacement | “Most preferred by listeners” overgeneralizes a filtered, exploratory model result and may invent a particular option's rank. Keep scope and uncertainty near the claim. |
| T4 | Reject bypass label | “Hear original” is incorrect: bypass retains baseline headphone fitting and separate dynamics processing. Use “Hear without my added EQ changes.” |
| T5 | Amend | Five choices are shown at a time and ten bands is already default. Recommend a destination-based path only after method/compatibility review. Fit error is not perceptual “accuracy”; Qudelix remains a manual guide. |
| T6 | Amend | Keep administrator-only research consequences at download. Generation/consent prompting is separate from the actual export-record request. Include measurement name when relevant; do not imply every viewer/account creates the same record. |
| T7 | Amend | Plain readiness messages help. Display the actual preparing/ready state; do not ask people to guess when “a moment” has passed. |
| T8 | Accept | Reuse familiar listening examples consistently, while treating “thump/voices/sparkle” as cues rather than exact definitions. |
| E1 | Accept | State that this route needs two EQ settings/presets and provide a clear beginner alternative. |
| E2 | Amend | Keep a simple first layer and advanced syntax. Preserve the distinction between preference and reliable identification, not only “better EQ.” |
| Q1 | Amend | Clearly label the optional pilot and unavailable public numbers. “Nothing to read here” wrongly dismisses existing methods/instructions; retain useful study information and start prerequisites. |
| D1 | Amend | Explain where targets came from. “Why we can use it” may imply a settled permission conclusion; keep the documented use basis and limitations accurate. |
| D2 | Accept | Lead Help with a short first-comparison guide; then shortcuts, vocabulary and methods. |
| D3 | Reject access claim | No reported maintenance closure does not prove the site is open to a particular visitor. Explain access separately from beta/version status; retain the unavailable-check state. |
| Y1 | Amend | A readable data hub is useful. Sync means ongoing supported synchronization for these accounts, not merely one copying action; keep the browser/account distinctions. |
| Y2 | Amend | Human titles and recovery help are accepted. Do not reduce three storage destinations to two ambiguous delete actions or omit linked-record scope. |
| Y3 | Accept | Ordinary participants should not be presented with owner-only Brave history-transfer instructions. Preserve actual server authorization as well as UI visibility. |
| Y4 | Reject merge proposal | Current conflict controls replace an entire storage section. A “Keep both” action would be a new merge capability, not a wording change. Use readable section differences and honest whole-section actions. |
| Y5 | Amend | Numbered steps and stable device roles are accepted. The shortened approval text omits access to deletion controls and shared choices; preserve those material consequences. |
| Y6 | Reject current-state claim | Owner-only maintenance is checked first at private-gate lines 179–182. Ordinary visitors currently receive maintenance, not the alleged invitation form. Do not offer invitation entry as a route through the current lock. |
| H1 | Reject loudness replacement | Matching mean band power over a band is not proof of roughly equal perceived loudness. Explain the signal adjustment with its audible limitation and the absence of headphone correction. |
| H2 | Amend | Explain sighted runs/graph and descriptive uncertainty plainly. Do not turn model ranges into validated population confidence or remove exact license conditions. |

## Further corrections to the proposed journey and glossary

- The shared uncorrected shootout is not an equivalent substitute for measured headphone comparison. A no-measurement route would need a separately designed explanation and usable destination; do not imply an instant ready-made comparison already exists.
- Channel correction cannot simply be described as making both ears equally loud. It involves measured response/balance behavior with prerequisites and limitations; avoid guarantees about a person's hearing.
- A target curve, a measured response and a CSV container are different concepts. Define the object and accepted file format separately.
- A file hash is computed from audio/data, even though the hash does not contain the audio bytes. Do not promise anonymity, or use “never the audio” to conceal other explicitly disclosed metadata.
- Consent/data consequences required for a meaningful choice belong in the first layer. Detailed explanations can expand, but moving everything about where data goes behind Details would defeat informed use.
- Some genuine states and files were reviewed only partly by Claude, as its limitations section acknowledges. Its initial broad “every component” statement is not a guarantee of exhaustive dynamic-state coverage. The combined audit adds the Astra source reviews, sampled catalog prose, the hidden-status/private-bookmark findings, and owner-page source inspection.

## Additional accepted detail to retain in the backlog

The rate-limit title in `lib/service-warning.ts:15–16` is a useful additional finding: “Thanks for listening!” does not explain a failed action. Prefer “Please wait before trying again”, preserve the actual retry interval and earlier-saved-results reassurance, and tailor the explanation to audio, sign-in or general requests. Do not infer user blame from a rate limit.

The approved first-pass direction is recorded in [the integrated beginner audit](2026-10-28-beginner-language-audit.md). No source implementation or consent/method change was made as part of accepting these audit findings.
