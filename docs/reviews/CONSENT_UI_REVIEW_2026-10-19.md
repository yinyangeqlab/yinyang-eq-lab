# Consent follow-up deployed — update96

Deployed with owner authorization as update96, implementation89dc69e1bfc1. All three consent choices are visible; the shortcuts edit drafts only. No consent was saved during the hidden tester review. Tests stayed open, previous browser assets were retained, and the informational notice ended after verification. Matching encrypted backup and independent daily baseline validation passed. Evidence: artifacts/consent-release-20261019/. Earlier local-only statements below are historical review-stage notes.

# Consent choices — local follow-up after update95

Not pushed or deployed. The owner reported that the third music setting was hidden in full terms while update95's post-release recovery verification was running. The live immutable release remains unchanged.

All three choices now appear as numbered sections before nickname/profile details: comparison data (required for listening), identifiable activity monitoring (optional) and own-music tags/file fingerprint (optional). Music sharing is outside disclosures. Full terms remain expandable. Keyboard focus highlights the current section.

“Opt in to all three” selects the three drafts; “Required only” selects required comparison sharing and sets both optional choices off. Neither button saves or sends consent. The existing Save action still requires the current comparison notice and an explicit monitoring choice. Unchecking required participation clears optional draft selections. Personal research and Community Preferences permissions stay separate and are not enabled by either shortcut.

The actual component regression, agreement/atomic preference tests, activity-monitoring tests and nickname form rendering pass. Bounded TypeScript, isolated build and packaging all200 protected recordings pass. The hidden tester browser exercised both presets, individual music selection and closing without saving; no agreement or account setting was saved. Normal-listener nickname rendering is also covered by the actual component fixture.

Final viewport checks cover1280×720,390×844,320×568,768×1024,1024×320 and280×320. All three sections are outside disclosures, with no horizontal overflow. Short screens scroll; the320×568 browser check reached music sharing and retained the Save action. Physical device testing is not certified. Evidence and6 screenshots: artifacts/consent-choices-20261019/. The local gallery contains these marked as a later local-only draft.

An additional style-cleanup tool reports27 superseded CSS declarations on both the committed baseline and this change; this is pre-existing, not a new pass claim or rendering defect. No new duplicate exact selectors were introduced in this component. Unrelated recovery/backup changes stay excluded.
