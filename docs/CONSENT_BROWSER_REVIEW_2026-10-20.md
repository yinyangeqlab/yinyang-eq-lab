# Live isolated consent browser verification — October 20, 2026

Production update103 at https://yinyangeq.com uses lab-attributed local source `dae6526b753309c9837c6ff2fc8f2b2ad772b059`. Source and verified release records are published separately from deployment using only the lab account. The browser checks used only the authenticated hidden `layout-test-only` identity, confirmed by the visible fixture notice before modifying choices. No admin or participant session was used for verification.

| Flow | Desktop 1440×900 | Mobile 390×844 |
| --- | --- | --- |
| Cancel an initial unsaved draft | Escape returned to Welcome; reopening showed no saved draft | Header close returned to Welcome; reopening showed unchecked consent |
| Save initial opt-out | Returned to Welcome | Returned to Welcome |
| Save consent fixture | Comparison/music selections and nickname saved; entered Preference Tuning | Same |
| Discard draft edits | Unsaved withdrawal and nickname edits discarded; saved comparison/music choices preserved | Unsaved music/nickname edits discarded; saved comparison/music choices preserved |
| Save withdrawal | Opened My data with participation=off | Same |

The saved state was reloaded from production when reopening review. Browser UI confirmed comparison/music choices and saved status; independent fixture-only database reads confirmed both saved nicknames survived discarded drafts. Browser privacy redaction prevents direct text-input-value comparison. The final fixture is opted out with music details and monitoring off. Research, Community, historical and Sync permissions remain off.

At 320×568 the dialog was 284px wide, with no page horizontal overflow; both header/footer exits remained enabled and within the viewport. At 390×844 the dialog was 354px wide with both exits visible. Desktop Escape and mobile keyboard Tab were exercised. These are browser viewport checks, not physical-device certification. No native selects were modified.

The live /sync page showed the private-test restriction and no enrollment form. Production readback verified zero test-owned submission records, music votes, activity events and legacy/current Sync payloads. Focused tests execute 48 actual admin/test contribution denial cases, 24 gate mutation denial cases, exact consent-only PATCH allowlisting, forged permission enable/transaction rollback cases and one-use sign-in scoping. All passed. The form permits comparison/music/nickname fixtures only; optional research, monitoring, historical sharing, file contributions and Sync are blocked. Existing aggregation exclusions for this fixed subject remain intact.

Deployment verification matched 443 live JS/CSS files and retained 366 prior browser assets. Only one existing Worker code/assets update occurred; no other resource mutation, schema migration or media change. Schema213, CPU5000ms, six abuse bindings, protected media/admission, disabled public Worker/preview URLs, service notice and independent edge/cost controls remain. Full snapshot/assets and source-only backup metadata handover passed. Hosted validation-only checks passed; the daily workflow is active. Existing data recovery timestamp is unchanged; no data export or new data snapshot occurred. Only the disposable fixture's sign-in/consent rows were provisioned/edited.

The first preview stopped before apply because the prior runner allowed modules/assets but not main Worker gate code. The final reviewed plan permits the sealed gate code and still rejects non-code settings or other infrastructure mutations. There was one production apply. A localhost sign-in helper failed to carry the Strict cookie through a cross-site redirect; no choices were changed there. Direct same-origin sign-in succeeded. The helper is stopped and the consumed code removed. Future review must open the production sign-in form directly and use a new privately provisioned one-use code.

## Evidence

The credential-free deployment and browser verification receipt is [update103-verification.json](releases/update103-verification.json). Screenshots and private fixture/backup diagnostics remain in the owner workspace and are not part of this source publication. No test codes, sessions, provider credentials, production database records or media are published.
