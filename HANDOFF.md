# Project handoff

<!-- release-state:start -->
Recorded deployment: **update169**, source `258bd1867844ed927e722896e0cb43cbb7776b48`.
Current maintenance, publication and recovery status: [LIVE_STATE.md](LIVE_STATE.md).
<!-- release-state:end -->

## Update169 sidebar refresh

The Home icon is larger. The strip that extends from the fully closed sidebar is teal in both themes. The production refresh was deployed on top of the Rankings release.

All 126 selected deployment checks passed. Brave verified the packaged sidebar at desktop, tablet and phone widths. The matching encrypted off-device source-only recovery passed hosted validation.

[Deployment verification](docs/releases/update169-sidebar-rollout-verification.json) · [Recovery verification](docs/releases/update169-sidebar-rollout-recovery-verification.json)

## Update169 Target and EQ preset rankings

Research Rankings shows target and EQ preset rankings together. The Version page can discover the current GitHub release using the public release feed when the API is unavailable.

[Update169 source release](https://github.com/yinyangeqlab/yinyang-eq-lab/releases/tag/update169) · [Deployment verification](docs/releases/update169-verification.json) · [Recovery verification](docs/releases/update169-recovery-verification.json)

## Update168 EQ preset imports

EQ preset imports accept Q from 0.01 to 20. Blind EQ Comparison and saved EQs preserve wide filter settings and their precision. The Version page includes the verified update166 history link.

[Update168 source release](https://github.com/yinyangeqlab/yinyang-eq-lab/releases/tag/update168) · [Deployment verification](docs/releases/update168-version-link-refresh-verification.json)

## Update167 sidebar controls

The full and icon-only sidebars use a silver arrow that grows in place on hover and presses inward when held. The collapsed arrow reveals green-tinted glass near the left edge.

All 125 selected release checks passed. Brave verified all three sidebar states, keyboard focus, reduced motion and the phone menu. The live sidebar assets matched the verified package. Encrypted source-only recovery and hosted validation passed.

[Update167 source release](https://github.com/yinyangeqlab/yinyang-eq-lab/releases/tag/update167) · [Deployment verification](docs/releases/update167-verification.json) · [Recovery verification](docs/releases/update167-recovery-verification.json)

## Update166 Peak & Dip Finder

Peak & Dip Finder accepts a saved EQ or target fit as its reference and plays boosts and cuts as they are edited. Update167 carries forward this deployed source.

[Deployment verification](docs/releases/update166-verification.json) · [Recovery verification](docs/releases/update166-recovery-verification.json)

Begin with [docs/HANDOFF.md](docs/HANDOFF.md) and [AGENTS.md](AGENTS.md). This entry point is regenerated with the other release views; it carries no separate deployment authority. [Historical source inventory](docs/history/foundation-20261031/README.md).
