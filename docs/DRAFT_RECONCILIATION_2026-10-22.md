# Local draft reconciliation — October 22, 2026

Current status: the reviewed code is deployed as update111 from implementation 9d896daacb7a28702fecae2ab9352e1cfe125005. Production asset/protection checks, source-only recovery handover and hosted validation passed. This publication includes the four reviewed source commits and verified release records using only the lab account. No new data export or snapshot occurred. Historical release provenance is unchanged. The reconciliation-stage notes below describe preparation before deployment.

## Baseline and preservation

GitHub main was fetched and verified through the yinyangeqlab connection at c26669cd2d5faecfd983a890a3ecd7dc9092427b. This review branch starts from that published history. The original canonical checkout, its index and all 61 existing modified/untracked file contents were preserved. The reviewed branch is `review/reconciled-drafts-20261022` in `work/reconciled-drafts-20261022`.

All commits use Yin Yang EQ Lab <343846436+yinyangeqlab@users.noreply.github.com> as both author and committer, checked immediately before and after each commit. Existing local identity hooks remain active.

## Reconciled source

- Passage timing: counters use unique source coverage within the current selection, cap the display at five seconds and avoid rounding an incomplete passage up to 5.0. Snapshots and completion evidence use the selected region. Buffering, replay, seeks, changed selection and optional/required modes are covered. Current keyboard and playback behavior is retained.
- Measurement entry: explicit database browsing, saved-measurement and upload actions, including the listening reminder. Catalog entry focuses search; saved-entry navigation uses the current section/scroll handling. The current published page and player layouts remain.
- Sync feedback: activity phases cover checking, transfer, verification, applying and confirmation. Concurrent requests retain their own activity; completion/unmount clears feedback. The compact dismissible healthy notice, storage-denial handling, consent rules and stale-edit protections remain.
- Research notes: listener discrimination, preference repeatability, subgroup inference and possible task-performance scoring remain proposals. These notes authorize no collection, reweighting, scoring or product behavior changes. The public discussion summary omits the private conversation identifier.
- Agent guidance: preserve the existing lab-only identity requirements and restore the canonical repository and daily/source-only handover guidance. The deployed baseline reference is corrected to update110.

## Excluded material

The original Codex preview records establish the Shootout and Sync draft scope; all ten Sync inputs matched their recorded build inputs. Claude checking/audit outputs are excluded. Older Personal/playback reorganization and podium changes overlap the later published redesign and are superseded rather than reapplied. Old README/package/version/dependency contents and historical deployment notes are not replayed over newer main.

Private recovery/backup tooling, workflow setup, operational inputs, credentials, receipts, keys, databases, participant records, recordings, numerical target seeds, generated builds, browser fixtures and audit output remain outside these commits. Some original local documentation already matches main and needs no new commit. No historical release source or recovery provenance was rewritten.

## Verification

Node26.12.0/npm12.2.1 and dependencies matching the exact current package lock were used. Source TypeScript and production build passed. Eleven relevant regression suites passed: selected-passage timing, comparison passage, Personal algorithm, Personal playback, optional passage, contribution status, listening reminders, setup auto-hide, automatic account Sync, Sync conflict review and blocked browser storage. Two synthetic harness dependencies were updated for current handlers; storage denial is checked with the real activity store.

A local account-free synthetic harness exercised the actual measurement picker, reminder and activity components at desktop1280px and a320px iframe viewport. Checks covered catalog focus/keyboard entry, dialog focus trap/return, the three measurement actions and native select closed/expanded keyboard behavior. Dark option surfaces, selected and disabled readability remain. This is component review, not whole-application acceptance, physical-device/audio certification or Safari/iOS testing. No production account/session, consent or Sync was used.

The public rebuild manifest now describes the verified update111 runtime and the subsequent release-record documentation. The original owner's full update110 snapshot check passed. Staged commits passed the public path/credential guard.
