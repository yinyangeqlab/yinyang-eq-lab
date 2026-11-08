# Beginner audit: participation, privacy, account, community, and public journal

Reviewer: Astra (`gpt-6-astra`), ultra reasoning. Commissioned as part of the October 28 whole-site beginner audit.

## Basis and limits

Read-only source audit of **deployed update125**, Git source **c9d6cc0e66804710f1948a71bbc568d75cfe7642**. All product evidence was read with `git show` / `git grep` at that exact commit, not from the dirty active checkout. The immutable source directory supplied by the parent is `work/peqdb-release-final-20261028`. File references below are relative to that directory and have exact source line numbers. Many components keep a whole rendered section on one long source line.

Read workspace/AGENTS.md. No product source edits, browser sessions, production requests, admin sessions, participant data, backups, commits, pushes, or deployments. No legal/privacy certification or empirical novice study was performed. **The displayed language and code paths are source observations; anticipated confusion is a hypothesis requiring novice usability validation.** Desktop/narrow rendering, expanded native menus, keyboard behavior, and real loading/error timing were not exercised.

Priority here describes beginner experience: P1 = meaningfully risky choice or blocker; P2 = substantial friction/comprehension gap; P3 = polish or advanced-route improvement. None of these labels alone establishes a security/privacy defect.

## Main assessment

The product is unusually explicit about who sees data and what deletion does. Its difficulty is density and vocabulary, not an absence of disclosure. A new listener is asked to understand comparisons, targets, monitoring, fingerprints, Personal research, reference checks, sync, historical studies, measurement-file rights, and several kinds of retained copies before they can confidently begin. Preserve the detailed notice, but give each decision a short explanation of **what the person chooses, who can see it, and what happens if they later turn it off**.

The strongest actionable issues are whole-section sync resolution presented as an “item” decision, consent presets bundling separate research and account functions, community-start prerequisites hidden behind a disabled button, and deletion controls that require the listener to mentally reconcile browser, account, and research copies.

## Findings and concrete recommendations

### T01 — P1: Sync conflict resolution is not reviewable by an everyday user

- Evidence: [components/account-sync-manager.tsx:24](../../components/account-sync-manager.tsx#L24): “Each button below resolves the entire displayed section; it does not keep two versions of the same item.” The same line renders `<pre>{JSON.stringify(JSON.parse(value),null,2)}</pre>` and buttons **“Use account copy for this item”** / **“Use this browser’s copy for this item.”** Section names are derived from storage keys by removing `target-lab-` and hyphens. Browser-only values are also raw JSON.
- Likely struggle: A listener cannot tell which song, saved result, preset, or entire history will be replaced. “Item” suggests a single record although the explanatory copy correctly says the whole section is resolved. Picking based on unreadable JSON can discard a desired version.
- Recommendation: Present a readable comparison: section name, number of entries, identifiable titles, saved times where available, and a difference summary. Use **“Keep the account’s entire Results section”** / **“Keep this browser’s entire Results section”**, followed by a scope confirmation listing affected counts. Offer “Decide later.” Keep raw JSON under “Technical details.”
- Accuracy constraint: Do not promise a per-record merge when the implementation resolves one storage section. Preserve concurrent-edit checks, retained copies until resolution, verified writes, and distinctions from research submissions.

### T02 — P1: Community start can be disabled without telling the listener what to do

- Evidence: [app/community-preferences/page.tsx:101](../../app/community-preferences/page.tsx#L101): “Headphone setup” → **“Choose a saved measurement”**, and **“Start or resume ten reference checks”** is disabled for `busy || !measurement || !permission.enabled || permission.testOnly`. The “Add an upload or catalog measurement first” link is inside a closed **“Setup, timing and skipped-check rules”** disclosure. The visible description says “Compare the same audio on two targets.”
- Likely struggle: A person who only knows their headphone model sees an empty selector and an inert button, with no explanation of a measurement, where to get one, or which missing permission is relevant.
- Recommendation: Above the button show a short checklist driven by actual state: **“1. Choose your headphones’ sound measurement”**, with **“Find my headphones”** linking to the catalog/measurement flow; **“2. Enable optional Personal research sharing”**, with the existing consent link; then **“3. Compare ten pairs of sound settings.”** Use an explicit empty state when no measurement is saved and an explicit explanation in test mode.
- Accuracy constraint: Do not silently pick a measurement, relax rig/reference-system restrictions, enable sharing, or imply these checks are required for ordinary listening. Existing contribution controls must remain explicit.

### T03 — P2: The consent shortcut groups choices users are likely to regard as unrelated

- Evidence: [components/comparison-data-settings.tsx:39–41](../../components/comparison-data-settings.tsx#L39): **“Opt in to all current sharing”** / **“Required only”**; helper text says “All current sharing includes optional research, private account sync and available unsealed studies.” `:14` also selects an available file contribution, while separate rights confirmation is retained. `:43–53` shows comparison data, monitoring, music details, Personal sharing, private sync, historical studies, and file contributions in the same form.
- Likely struggle: “All sharing” can sound like one generous research choice, while it also enables private cloud copies and currently available historical studies. A person wanting only cross-device use may not expect research permissions to be bundled in a preset. This is a hypothesis about comprehension, not a claim that choices are hidden—the helper is explicit.
- Recommendation: Make the primary path **“Use required settings”**, with **“Review optional choices”** exposing grouped, independently labeled settings. If retaining the all shortcut, rename it **“Select every optional choice shown below”** and immediately summarize selected categories before Save. Keep account sync visibly separate from research sharing.
- Accuracy constraint: Do not preselect optional choices, remove the monitoring Yes/No choice, grant future studies, conflate file rights with contribution consent, or silently change existing partial historical permissions.

### T04 — P2: “Nothing is published” can overstate what required comparison sharing means

- Evidence: [components/comparison-data-settings.tsx:41](../../components/comparison-data-settings.tsx#L41): “Nothing is published, audio is not uploaded, and future studies are not approved.” `:45`: “I agree to share comparisons for research & rankings.” `:61`: “Qualified blind preferences and ties can affect exploratory public rankings.”
- Likely struggle: The unqualified reassurance may be read as “my choices will not affect anything public,” although personal-profile publication is distinct from effects on public aggregate rankings.
- Recommendation: **“This does not publish your personal profile or individual history. Eligible blind comparisons can affect public rankings. Your audio files are not uploaded by these choices.”** Preserve the future-study statement and contextual exceptions.
- Accuracy constraint: Verify exact scope for each contribution type; do not claim all source records are anonymous, publicly visible, or excluded from public aggregates.

### T05 — P2: Essential consent descriptions assume audio/research vocabulary

- Evidence: [components/comparison-data-settings.tsx:45](../../components/comparison-data-settings.tsx#L45): “target rankings”; `:49`: **“my music’s tags and file fingerprint”**; `:50`: “Personal Tournament”; `:51`: “measurement curves, custom targets, EQs…metadata/segment data”; `:52`: **“A sealed noisy group result and its non-identifying privacy ledger”**; `:53`: “model, rig, fit, source, driver and nozzle details.”
- Likely struggle: A novice cannot tell a target from their headphones, a file fingerprint from device tracking, or a noisy result from poor-quality sound. Some terminology is necessary, but not explained at the point of decision.
- Recommendation: Pair technical terms with short definitions: **“target: a sound profile you compare”**; **“song information, such as title and artist, plus a code used to recognize the file (file fingerprint)”**; **“headphone measurement: a graph describing how the headphones reproduce different pitches”**; **“once a study’s protected group result is finalized, that result stays, even if you delete your original answers.”** Keep mathematical privacy details in linked methods.
- Accuracy constraint: A file fingerprint is not guaranteed anonymous and must not be described as a random ID. Distinguish ordinary listening, optional metadata sharing, optional sync, and deliberately contributed measurement files. “Finalized” should be consistently paired with the implementation’s “sealed” term.

### T06 — P2: Decision labels should distinguish a first refusal from withdrawing existing participation

- Evidence: [components/comparison-data-settings.tsx:32–33,66](../../components/comparison-data-settings.tsx#L32): first-time title “Your data choices,” initial status “Optional participation,” primary action when comparison sharing is unchecked **“Save opt-out”**; returning opt-out notice correctly states “past data stays until deleted.” [components/data-choices-editor.tsx:19](../../components/data-choices-editor.tsx#L19) routes a nonparticipant to Welcome or My data, depending on the existing agreement.
- Likely struggle: A first-time listener may wonder what they are “opting out” of or why saving is needed when they have not joined. The page also describes “Required for listening,” which is compatible with voluntary participation but needs a concise explanation.
- Recommendation: First use: **“Agree and open listening tools”** / **“Save without joining”** (or an equivalent accurately reflecting saved optional settings). Returning use: **“Stop participating and save”**, with **“Stops listening access; previous submissions stay until you delete them.”** Keep “Leave without saving” as a distinct action.
- Accuracy constraint: Sync can be managed separately; do not imply declining comparison participation necessarily deletes or disables every optional account setting. Do not change routing or consent semantics merely to simplify wording.

### T07 — P2: The privacy notice needs a plain-language summary before the full research-method detail

- Evidence: [app/privacy/page.tsx:13](../../app/privacy/page.tsx#L13) contains a long contents list; `:15` includes “EQ-fit summaries,” “normalization status,” and “target-curve fingerprints.” `:19` includes “sealing,” a “noise” uncertainty range, “ε ≤ 25/16, δ=0,” immutable ledger allocations, and caveats on account-level protection. `:22` includes IndexedDB, localStorage, verified pieces, and a “512 KB total-history cap.”
- Likely struggle: A listener looking for “who sees my results?” or “will delete remove everything?” must pass through research and storage implementation vocabulary. Dense technical disclosure may reduce understanding rather than improve it.
- Recommendation: Add a short top summary in ordinary language covering: what is required; optional choices; who sees individual submissions; public aggregate effects; long-term retention; where to delete; the distinction between deleting source records and already finalized protected statistics; copies/backups limitations. Keep full current terms, the permanent-result qualification, and methods accessible under clear headings.
- Accuracy constraint: This audit is not legal review. Do not call the protected result simply “anonymous,” promise zero inference risk, immediate backup erasure, or a population confidence interval. Do not weaken annual-review/no-automatic-expiry wording.

### T08 — P2: “Delete all my submitted data” understates the operation’s full scope

- Evidence: [app/my-data/page.tsx:62](../../app/my-data/page.tsx#L62): **“Delete all my submitted data…”**. `:68` confirmation states it also erases “privacy settings and data sessions” and clears this browser’s “saved measurements, targets, EQ presets and results.” `:67` says it removes access and signs this browser out. `:64` separately distinguishes synced results from server submissions.
- Likely struggle: Someone trying to remove their research contributions may start an action that also removes account settings/local work and signs them out. The confirmation is protective, but the initiating label gives a narrower mental model.
- Recommendation: Label the action **“Delete all linked data and sign out…”** and show its scope before the typed confirmation. Use three plain-language rows: “Research submissions,” “Private account data,” “This browser’s saved work,” and identify any retained copies/results. Keep individual submission deletion prominent.
- Accuracy constraint: Check exact backend scope before promising private account deletion; do not equate deleting a single server submission with clearing all saved local or synced data. Preserve special owner-account confirmation and backup/external-copy caveats.

### T09 — P2: Three storage locations need a persistent visual explanation

- Evidence: [app/my-data/page.tsx:64](../../app/my-data/page.tsx#L64): “Saved trials are separate from server submissions. Deleting a browser copy does not erase the server record.” The same line has **“Delete from synced account history (keeps server submission)”**, **“Remove browser copy only (keeps server data)”**, **“Find server submission / request legacy review”**. `:42` says browser clearing pauses sync while retaining account and server copies.
- Likely struggle: “Server,” “account,” and “synced account” can sound like the same location. Users cannot confidently choose a deletion button unless the app explains why copies exist and which will remain.
- Recommendation: A compact map with consistent names: **“On this browser — your saved work”**, **“Private synced copy — available to your approved browsers and the admin”**, **“Research submissions — records you sent to the project.”** Every removal action should identify which row it affects and which rows remain. Add “Pause syncing and clear this browser” when that is the actual clear behavior.
- Accuracy constraint: Do not describe private account sync as inaccessible to the admin. Keep research erasure, local result deletion, clearing all browser data, and disconnecting distinct.

### T10 — P2: Legacy recovery asks newcomers to classify internal record types

- Evidence: [components/legacy-review.tsx:15](../../components/legacy-review.tsx#L15): **“Ranked vote / trial ID”**, **“Listening run / browser result ID”**, **“Open choice ID”**; field **“Verification context”**; button **“Request independent legacy review.”** `:17`: “Sealed group results remain after withdrawal.”
- Likely struggle: A user needing deletion assistance may not know which record type applies or where to find the ID. “Legacy review” sounds like an administrative system feature rather than help recovering old submissions.
- Recommendation: Start with **“Need help finding an older result?”** and an ID-prefilled path from My results. Label the free text **“What can help the owner recognize this result? For example, approximate date and headphones used.”** Button **“Ask the owner to check this older result.”** Keep advanced record-type choice only if needed, with examples and an “I’m not sure” help path rather than guessing ownership.
- Accuracy constraint: IDs alone must never establish ownership; do not request passwords, government IDs, sensitive documents, or reveal another person’s data. Ownership recovery must remain separate from research/archive permission.

### T11 — P2: Community’s primary explanation speaks to researchers before listeners

- Evidence: [app/community-preferences/page.tsx:101](../../app/community-preferences/page.tsx#L101): **“PROSPECTIVE RESEARCH PILOT”**, “Patterns from Personal Tournaments, checked against a separate randomized reference sample,” “primary complete-block estimate,” “missingness,” “declared rig/reference-system label,” “−16 LUFS source matching.” [components/community-method.tsx:1](../../components/community-method.tsx#L1) adds uniform-target reference, catalog freezes, coverage, cycles, and independent-validation limits.
- Likely struggle: A listener cannot tell whether this is a leaderboard, another listening mode, or a mandatory study. A newcomer should not need to know prospective sampling, calibration, or LUFS to understand the purpose.
- Recommendation: Top copy: **“Help us check patterns in listeners’ preferences. This optional test asks you to compare ten pairs of sound settings. Public results are not available yet while the method and privacy protections are reviewed.”** Define a “reference check” at its first use. Keep the detailed sampling rules in “Research method and limitations.”
- Accuracy constraint: Do not call the ten checks representative of all people, validated, calibrated, or sufficient to establish a winner. Preserve skip/incomplete-block handling and its effects.

### T12 — P2: Error and loading states sometimes leave the next action unclear

- Evidence A: [app/listeners/yinyangeq/page.tsx:8](../../app/listeners/yinyangeq/page.tsx#L8) sets an error after a failed request but leaves `data` null, so it renders the error **and “Loading published activity…”**. It also does not clear `error` at the start/success of a subsequent page load. No retry button is rendered.
- Evidence B: [components/data-choices-editor.tsx:18,26](../../components/data-choices-editor.tsx#L18) sets `failed` after load failure; [components/comparison-data-settings.tsx:66](../../components/comparison-data-settings.tsx#L66) disables Save on `loadFailed` without a retry action. Also the initial loading state passes `busy={busy||loading}` and the primary action displays **“Saving…”**, while the status correctly says **“Loading your saved choices…”**.
- Evidence C: [app/my-data/page.tsx:30–32,59,69](../../app/my-data/page.tsx#L30) renders load errors but no direct retry action; the browser-local area remains available, which is useful but can make the missing server area look empty or absent.
- Recommendation: Explicit states: **“Couldn’t load your published history. Try again.”**, **“Couldn’t check your saved choices. Nothing has changed.”**, and a Retry button. Separate loading from saving labels. Keep local-only data available with a clear banner distinguishing it from unavailable submitted data.
- Accuracy constraint: Do not reset choices to off, imply an empty dataset, or allow saving over an unverified consent state on failure. These are source-derived display-path observations, not browser-tested incidents.

### T13 — P2: Owner-specific exceptions and recovery controls leak into ordinary participant guidance

- Evidence: [app/my-data/page.tsx:60–61](../../app/my-data/page.tsx#L60) explains protected YinYangEQ retention/no expiry even for ordinary participants. `:65` always renders `HistoryCapture` under account tools. [components/yinyangeq-history-capture.tsx:4](../../components/yinyangeq-history-capture.tsx#L4): **“Owner’s historical Brave transfer”**, history-capture code, admin-console instructions, and **“YinYangEQ private publication controls.”**
- Likely struggle: A regular listener may think they must transfer Brave history, have an admin approval, or obtain a public profile before their data can be managed. The component does identify the owner scope, but remains unnecessary cognitive load.
- Recommendation: Show owner-specific controls and exception summaries only in the owner participant context. For everyone else, give their actual retention and access rules, with the complete notice available. Preserve an explanatory access page for direct owner-route visits.
- Accuracy constraint: Conditional presentation is not authorization. Keep all server access checks and protected-account erasure safeguards. Do not erase owner retention exceptions from the full applicable notice.

### T14 — P2/P3: Sync status is careful but too operational for the main view

- Evidence: [components/account-device-status.tsx:25–28](../../components/account-device-status.tsx#L25): **“Not all devices have recently confirmed the account copy”**, **“Idle · no transfer running here”**, “A checkmark means…within the last two minutes,” plus verified pieces/512 KB detail. [lib/device-sync.mjs:11](../../lib/device-sync.mjs#L11): **“Consent update waiting to be read”**, **“Last matched · not recently checked.”** [app/account-sync/page.tsx:5](../../app/account-sync/page.tsx#L5) explains that unconfirmed is not proof of being offline.
- Likely struggle: “Not confirmed” can look like data loss or a failed connection when another device simply has the page closed. The source already addresses this, but the operational language dominates.
- Recommendation: Lead with **“This browser is up to date”** and, per other device, **“Last matched [time]. Open the site there to check again.”** Use **“Your sharing choices changed; open this browser to receive the update”** where accurate. Move storage internals to technical details.
- Accuracy constraint: Never label a device “online,” “offline,” or “fully up to date now” based only on last-confirmed metadata. Keep the recent-check time and the distinction between device checking and optional activity monitoring.

### T15 — P2: The source/receiving-browser language and actions should be consistent throughout linking

- Evidence: [lib/browser-pairing.mjs:107](../../lib/browser-pairing.mjs#L107): title **“Connect another browser”** but button **“Create code to sync this browser”** and secondary link **“Connect this browser to an existing account instead.”** `:84` asks users to return after entering the code; `:138` asks them to “refresh requests.” `:131,135` can return **“Start a handshake”** / **“This handshake expired.”**
- Likely struggle: During a two-device flow, “this browser” shifts meaning, and a listener can create a code on the wrong device or wait without realizing the old device needs refreshing.
- Recommendation: Keep stable role labels: **“Browser with your existing data”** and **“Browser you’re adding.”** Code button: **“Create a code for another browser.”** Number screen: numbered steps naming the role at each step. Replace “handshake” with **“browser connection request.”** Preserve the existing code-expiry and mismatch protections.
- Accuracy constraint: Linking grants access to account data, shared choices, and deletion controls; those consequences must remain visible. Do not suggest files/audio are copied. Do not bypass explicit approval or reinterpret owner-device approval.

### T16 — P3: Credits are transparent but assume the visitor already understands curves

- Evidence: [app/curve-credits/page.tsx:24](../../app/curve-credits/page.tsx#L24): “Target curves”; `:30`: “numerical frequency-response targets,” “imported and normalized,” “tracing or resampling”; `:38`: labels **“Provenance”**, **“Use basis”**, **“Import / recreation”**, and “Experimental 85-phon design.” `:40` already gives a good no-search-results next step.
- Likely struggle: A curious newcomer understands “giving credit” but not what the credited object is or how it relates to the sound they heard.
- Recommendation: Add one sentence: **“A target curve describes a sound profile—how much bass, midrange and treble a comparison aims for.”** Labels can be **“Where this came from”**, **“Why it is included”**, **“Changes made for this site.”** Explain the 85-phon note in an advanced detail, keeping the no-calibration caveat.
- Accuracy constraint: Do not change copyright/permission claims, imply attribution grants reuse rights, or present fair use as established. This is a copy hierarchy recommendation, not legal advice.

### T17 — P3: Public journal fields need a human-readable mapping

- Evidence: [components/profile-entry.tsx:2](../../components/profile-entry.tsx#L2) renders detail keys/values directly. [lib/yinyangeq-records.ts:48,51,53,55,58](../../lib/yinyangeq-records.ts#L48) passes through `test_mode`, `headphone_type`, `type`, method, priority, and technical fields such as **“Preamp (dB)”**. [app/listeners/yinyangeq/page.tsx:8](../../app/listeners/yinyangeq/page.tsx#L8) correctly says these are one listener’s preferences.
- Likely struggle: Values such as mode/type codes are meaningful to developers, not everyday visitors. A page framed as a listening journal should first say what was compared and which was preferred.
- Recommendation: Map internal mode/category values to consistent full names; keep ordinary story first, then an expandable **“Listening setup and technical details.”** Explain that “matched seconds” means source audio heard on both options.
- Accuracy constraint: Preserve exact public-field previews, source validation, and no-extra-ranking-vote meaning. Do not expose additional private fields for convenience.

### T18 — P2, overlap with results audit: Avoid making diagnostic metrics feel like a hearing exam

- Evidence: [components/results-profile.tsx:52–53](../../components/results-profile.tsx#L52) shows **“answer-score SD,” “accuracy SD,” “Identical-target check reliability,” “Beta(2, 2) prior”** alongside careful disclaimers; `:62` says **“tie is the accuracy answer”**; `:67` labels **“Correct tie response.”** `:69` says only **“No answered trials yet.”**
- Likely struggle: A novice may interpret a low percentage or “not calibrated yet” as poor hearing or invalid preferences despite the disclaimers. The empty state lacks a direct first-action link.
- Recommendation: Main view: **“Your saved comparisons”**, **“You preferred the same option on X repeated comparisons.”** Put advanced consistency metrics and assumptions behind a disclosure. For identical settings: **“Both options used the same settings; this check records whether you chose ‘No preference.’”** Add **“Start a comparison”** to the empty state.
- Accuracy constraint: Do not relabel these statistics as hearing tests, confidence in true preferences, or validated reliability. Parent is covering the listening/results surface more fully; treat this as cross-route evidence.

## Owner-only and advanced material — separate from newcomer burden

These are not ordinary participant onboarding requirements and should not inflate the beginner score for the main listening flow.

- **My profile is an owner participant publication console.** [app/my-profile/page.tsx:22](../../app/my-profile/page.tsx#L22): “Owner participant account” / “Your YinYangEQ profile.” [lib/yinyangeq-records.ts:121–122](../../lib/yinyangeq-records.ts#L121) enforces the specific owner participant account. Do not describe this route as a generic user profile feature. Strong existing behavior: exact public preview (`:26`), hidden vs removed distinction (`:22`), and unchanged future-entry privacy ([components/profile-category-sharing.tsx:17](../../components/profile-category-sharing.tsx#L17)). Improvement: [components/profile-category-sharing.tsx:18](../../components/profile-category-sharing.tsx#L18) **“cleaned downloadable files”** should be **“generated curve-only downloads (frequency and sound-level values)”**, with comments excluded; “cleaned” alone may imply broader anonymization. [app/my-profile/page.tsx:25](../../app/my-profile/page.tsx#L25) “snapshot” can be “extra private recovery copy.” Advanced/owner priority P3.
- **Profile access is explicitly owner-only.** [app/profile-access/page.tsx:3](../../app/profile-access/page.tsx#L3): “This is the owner’s participant account. It has no admin privileges.” It directly sends ordinary participants to browser linking. [components/profile-device-signin.tsx:17](../../components/profile-device-signin.tsx#L17) explains replacement, merge, and admin-session ending. Do not push this into ordinary sign-in. Optional owner wording improvement: “single-use approval code” is clearer than portal jargon; pending-recovery errors should retain the “keep this tab open” recovery instruction.
- **Private test history belongs to admin/private test activity.** [app/test-history/page.tsx:2](../../app/test-history/page.tsx#L2); [components/admin-test-panel.tsx:9](../../components/admin-test-panel.tsx#L9): up to 100 records/2 MB, excluded from rankings/music votes/participant Sync, with JSON detail and download. Technical records are appropriate here. Optional P3: empty state **“No private test activity saved in this browser”**; label clear scope. This is not research-participant history.
- **Owner research page inspected in source only.** [app/owner-research/page.tsx:126](../../app/owner-research/page.tsx#L126): “Admin access only.” `:148` explicitly explains raw win percentages, ties excluded, repeats included, and the difference from official rankings; the “1 win out of 1” vs “9 wins out of 10” example is excellent. `:151` shows JSON playback segments; `:152` shows rig, fit, driver, nozzle, SHA-256. These are advanced operational details and should stay available to the owner, not be simplified into unsupported claims.
- **Owner labels worth clarifying:** [app/owner-research/page.tsx:128](../../app/owner-research/page.tsx#L128) navigation **“Test activity”** points to activity monitoring while the page also has an actual private test panel (`:129`); use **“Opt-in participant activity”** if that accurately describes the panel. `:148` **“Raw preference results”** is correctly qualified and should retain those qualifiers. `:130` deletion totals distinguish records from people; preserve it. No admin component was executed or supplied real records.
- **Public journal is beginner-facing even though publication controls are owner-only.** Audit it as an informational page, not an invitation for everyone to create a public profile.

## Strengths to preserve

- Consent begins with the actual required condition and mentions tuning-export recording: [components/comparison-data-settings.tsx:37](../../components/comparison-data-settings.tsx#L37).
- Draft vs saved state and leaving without saving are explicit: `:33,41,66`. Optional monitoring has separate Yes/No controls and the ordinary 30-day/opt-out rule: `:46–48`.
- Music bytes staying on-device is repeatedly distinguished from tags/fingerprints and deliberate contributions; sync disclosure notes reselecting files: `:49,51,53`.
- Private research, public group results, and public profile publication are separated: `:50,57`; [app/my-profile/page.tsx:22,26](../../app/my-profile/page.tsx#L22); [app/listeners/yinyangeq/page.tsx:8](../../app/listeners/yinyangeq/page.tsx#L8).
- My data explains withdrawal vs deletion, no reason required, browser vs server records, signed-out outcome, and older-record help: [app/my-data/page.tsx:56,60,64,67–68](../../app/my-data/page.tsx#L56).
- Retention language avoids falsely promising automatic expiry, no-recovery copies, or immediate backup deletion: [app/privacy/page.tsx:17–19,25](../../app/privacy/page.tsx#L17).
- Community correctly withholds unvalidated public numeric results and labels simulated examples as not participant data: [app/community-preferences/page.tsx:101](../../app/community-preferences/page.tsx#L101).
- Sync copy retention, pause/disconnect differences, and last-confirmed limitations are explicit: [components/account-device-status.tsx:27–28,33,37](../../components/account-device-status.tsx#L27); [components/account-auto-sync.tsx:42,44,56](../../components/account-auto-sync.tsx#L42).
- Credits separate attribution from permission and do not claim endorsement: [app/curve-credits/page.tsx:29–30,43](../../app/curve-credits/page.tsx#L29).
- Public journal publication does not create another ranking vote: [app/listeners/yinyangeq/page.tsx:8](../../app/listeners/yinyangeq/page.tsx#L8).

## Coverage inventory

Full rendered/source flow reviewed: `app/participation/page.tsx`, `components/data-choices-editor.tsx`, `components/comparison-data-settings.tsx`, `components/use-consent-prompt.tsx`; `app/privacy/page.tsx`; `app/my-data/page.tsx`, `components/legacy-review.tsx`, `components/listener-nickname-panel.tsx`, `components/yinyangeq-history-capture.tsx`; `app/account-sync/page.tsx`, `components/account-sync-manager.tsx`, `components/account-device-status.tsx`, `components/account-auto-sync.tsx`, `components/account-sync-activity.tsx`, `lib/device-sync.mjs`, `lib/account-sync-notice.mjs`; `app/community-preferences/page.tsx`, `components/community-method.tsx`, `components/community-sharing.tsx`, `components/personal-research-sharing.tsx`, `components/personal-sharing-status.tsx`, `components/sharing-permission-status.tsx`, `lib/community-notice.ts`, `lib/personal-sharing-notice.ts`; `app/my-profile/page.tsx`, `components/profile-category-sharing.tsx`, `app/profile-access/page.tsx`, `components/profile-device-signin.tsx`, `components/account-page-heading.tsx`; `app/listeners/yinyangeq/page.tsx`, `components/profile-entry.tsx`, `lib/yinyangeq-records.ts`; `app/curve-credits/page.tsx`; `app/test-history/page.tsx`, `components/admin-test-panel.tsx`.

Associated source sampled: [lib/browser-pairing.mjs:53–150](../../lib/browser-pairing.mjs#L53) for actual /sync UI and states (there is no `app/sync/page.tsx` in this commit); [components/results-profile.tsx:51–69,86–92](../../components/results-profile.tsx#L51) for cross-route terminology; page metadata-only layouts. `app/owner-research/page.tsx` rendered body `:126–153` plus supporting code `:75–125` was inspected; imported owner diagnostics panels were inventoried but not comprehensively audited here. No participant/API dataset was read.

Not tested: browser rendering; first-time consent through completion; screen-reader reading order; mobile/narrow layouts; expanded select menus; device linking; actual network failures; actual deletion; generated downloads; account/profile access enforcement at runtime; actual privacy method/statistical implementation validation. Recommendations should first be checked with source/fixture tests and then a dedicated isolated layout/test account, never production/admin or contributing participant activity.

## Suggested validation tasks after copy/flow design

Use novice task-based testing with fictitious data: (1) start with required settings only; explain who sees answers; (2) enable sync without enabling extra research sharing; (3) explain what happens when monitoring is off; (4) remove one research submission while keeping personal work; (5) clear this browser without deleting the account copy; (6) resolve a conflict affecting several results; (7) begin Community checks from an empty measurement list; (8) distinguish published owner journal from personal results. Ask users to predict consequences before acting. Measure successful independent completion and accurate explanation, not merely whether they can repeat terms.
