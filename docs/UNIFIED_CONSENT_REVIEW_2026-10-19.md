# Unified data choices and sync wording — local candidate, October 19, 2026

Live remains update98. This work is implemented/tested locally only. No push, deployment, migration, real consent write, publication or backup export was performed. Keep the preceding category-sharing candidate and independent Shootout/recovery drafts separate from live instructions.

## Current collection permissions

The initial consent dialog and its review mode now show five numbered choices: required comparison participation, optional identifiable activity monitoring, optional music tags/fingerprint, optional future Personal Tournament private research, and optional Community Preferences. “Opt in to all current sharing” sets all five drafts. “Required only” clears the four optional drafts. Neither shortcut saves. Unchecking participation clears all optional drafts.

Both entry points (initial /participation and the Tournament dialog) use one request builder. Save includes each enabled scope's current notice acknowledgement. The existing My data transaction saves the five choices atomically; GET now includes the current effective Community permission. Withdrawal also clears stored Community permission, even from an older client, so it cannot revive on required-only rejoin. Existing choices and notice versions remain authoritative; old all-three agreements do not become new research permission. No existing user is silently opted in.

Personal and Community tool components now show read-only saved status with a link to the central data choices page. They still load current consent tokens for guarded contributions and fail closed on error. My data shows all five saved statuses and the same editor link instead of duplicate immediate-save checkboxes/presets. Public profile publication, deliberate file contributions and individually described historical-study reuse remain distinct actions; no unspecified future study, audio upload or profile publication is granted by “all current sharing.” Protected owner activity retention remains indefinite; ordinary monitoring expiry/opt-out behavior is preserved.

Known historical-study permissions remain in My data with per-study disclosures. They are historical reuse permissions rather than new collection scopes; this change does not blanket-approve them or change any archive rules.

## Phone sync wording

The sync inspector previously captured local storage only on mount/manual reload. Incoming automatic sync could finish while a stale “only on this browser” comparison remained visible. It now refreshes on incoming-data events and focus, and ignores stale read responses. An absent displayed account field is no longer described as “Keep account deletion.” Browser-only sections show the actual copy, “Add this browser’s copy to account,” and a separately confirmed removal action. Both resolution directions reject unseen local edits. The UI explains that choices apply to the whole displayed section and do not preserve two versions of the same item. This is independent of the automatic merge/conflict engine, which is unchanged.

## Validation and scope

Actual synthetic component/page tests cover all-five drafts, required-only/withdrawal, explicit monitoring, saved initial/review state, current notice receipts, no silent upgrade, close without save and local return-path restrictions. Actual synthetic API tests cover all-five save/read, per-notice acknowledgement, transaction rollback, withdrawal and required-only rejoin. Status tests cover stale reads, errors, and absence of duplicate opt-in controls. Sync inspector tests cover incoming/focus refresh, absent-key wording, canceled removal, stale local edits and adding a browser-only section while preserving existing results. Automatic-sync API/client tests, monitoring/admin isolation and category-sharing regressions pass. Bounded application TypeScript reports zero diagnostics. Isolated production build combines this candidate with the preceding category controls and excludes independent Shootout/recovery work; app/shootout/page.tsx is assembled by applying only this task's consent transform to the committed baseline.

Desktop and320px iframe reviews use synthetic data, no account/session, and no actual consent writes. They check all-current selection, one Save, status-only follow-up panels, scroll/focus access and readability. No native select controls were added. Evidence: `artifacts/unified-consent-20261019/`.

A read-only live account integrity check after the owner's mobile sign-in confirmed the preserved original results and measurement still exist in the account copy and match the private admin viewer. Participant data and private receipts stay outside Git. No new device was approved by this task.
