<div align="center">

# YinYang EQ

**by Yin Yang EQ Lab**

### Find your sound. Let your ears decide.

A free listening experiment in headphone EQ. Compare target curves blind on your own headphones, find the ones you actually prefer, and help test how much listeners agree, repeat themselves, and differ.

**Public beta · 0.2.0-beta.1** — [About this version](https://yinyangeq.com/version) · [Keyboard shortcuts and help](https://yinyangeq.com/shortcuts)

**[Try it at yinyangeq.com](https://yinyangeq.com) · [Report a bug](https://github.com/yinyangeqlab/yinyang-eq-lab/issues/new)**

[![Source code license: Apache 2.0](https://img.shields.io/badge/source_code_license-Apache_2.0_code_only-59d9ce?style=flat-square)](LICENSE_SCOPE.md)
**Development assistance: OpenAI Codex and Anthropic Claude.**

</div>


The historical demo videos have been retired. The remaining screenshots show the October 17, 2026 interface.

**Current access — update121:** the site is closed for private testing. Only existing admin sign-in and authenticated admin sessions have app access. The lock stays enabled until the owner explicitly requests reopening. [Current live state](LIVE_STATE.md).

The private [blind EQ comparison](docs/BLIND_EQ_COMPARISON.md) compares two user presets with independent per-song randomization; its presets, local audio and results stay in the tab.

## What it is

Headphone EQ targets are easy to find and hard to choose between. Online, the choice often leans on a target's name or someone's reputation. YinYang EQ asks a simpler question: *which of these do you prefer, on your headphones, with music you know, when you don't know which is which?*

- **Blind, and fitted to your headphones.** In the target-based blind modes, target names are hidden and A/B order is randomized. Each target is fitted to *your* headphone measurement, so you hear the EQ that would actually be applied.
- **You leave with something usable.** Personal Tournament narrows many targets to a shortlist of favorites. Private blind EQ compares two supplied presets without a headphone measurement. Preference Tuning lets you shape a curve and export it as a target or preset.
- **Your listening can also be evidence, if you choose.** Optional, consented comparisons feed exploratory rankings and a longer-term question: how consistent are listeners with themselves, how much do they agree with one another, and does that depend on headphones, music, or experience?

YinYang EQ is a **free, noncommercial public beta and an exploratory research project**. It is not a validated measure of sound quality, and no findings from this data have been published. [What is established, what is only a question, and what is not claimed](#what-this-project-can-and-cannot-claim) is set out below.

## Why take part

**For you:** a blind answer to "which do I prefer?" on your own headphones and a saved shortlist. Personal Tournament can keep its choices local when optional research sharing is off; the private blind EQ tool keeps presets and choices in the tab. Preference Tuning can also produce a downloadable curve or preset, but those exports require the participation agreement and are recorded for private research, including the exported file and tuning settings.

**For the project (only if you opt in):** most public discussion of headphone targets is anecdotal. A pooled set of blind, loudness-matched, fitted comparisons could help show where listeners agree on a target and where they split, how repeatable individual preferences are, and whether differences track measurable context such as headphone type or music. Those are open questions, not findings. The data is self-selected and uncontrolled, so it can describe the people who took part, not listeners in general, and each contribution is only as useful as the methodology around it. That is why the limits are stated here.

**Your control:** research sharing, activity monitoring, music tags and sync are separate opt-ins, and you can delete submissions in **My data**.

## What you can do

| Mode | What happens | Where your choices go |
| --- | --- | --- |
| **Personal Tournament** | An adaptive, blind tournament narrows targets to your favorites, then rechecks finalists with different music. Progress can be saved. | Stay in this browser by default. Research sharing and private account sync are separate, optional choices. |
| **Blind Research · Listening Pool** | Compare hidden targets using a site-selected stereo track. | Eligible comparisons contribute to Research Rankings. |
| **Blind Research · Bring Your Own** | Compare hidden targets using a stereo song from your device. | Eligible comparisons contribute to Research Rankings. Audio stays on your device; sharing song tags and fingerprints is optional. |
| **Open Comparison · Unranked** | Pick two named targets, including your own private curves, and explore freely. | Approved-target comparisons can enter private admin research under the participation agreement; comparisons involving private targets stay local. Never counted in public Research Rankings. |
| **Private blind EQ comparison** | Import or enter two presets, compare a playlist with independent per-song A/B assignments, then reveal and download your results. No headphone measurement is required. | Presets, local audio and choices stay in this tab, outside research, rankings and Sync. |
| **Preference Tuning** | Start from a reference and shape bass, body, ear gain, presence and treble on an interactive curve, with undo/redo, exact value entry and bypass. Generate EQ fits and download a target or preset. | Exports are recorded for private research, including the downloaded file and tuning settings (see [Privacy](#participation-privacy-and-your-data)). |
| **[Shareable shootouts](https://yinyangeq.com/share-shootout)** | Pick two to four targets and share a blind A/B by link or embed. | Anonymous; see [below](#shareable-shootouts). |



Also available: a Listening Pool with stereo waveforms, source credits and song ratings (ratings are separate from target preferences), searchable creator-sourced headphone measurements, import of your own response, paired left/right channels, and saved results.

![Preference tuning with a raised bass curve, colored frequency regions, sliders, playback, and export controls](docs/images/preference-tuning.jpg)

*Preference Tuning (October 17 interface). The +7.5 dB bass boost is a demo setting, not a recommendation.*

**Keyboard:** **Space** play/pause · **1 / 2** select A or B · **S** switch sides · **← / →** seek a quarter second. See [all shortcuts](https://yinyangeq.com/shortcuts).

## How a comparison works

- **Blind and randomized.** In Blind Research the server issues the trial, assigns the target pair and randomizes A/B order. Personal Tournament uses an adaptive scheduler in the browser with randomized sides. Target names are hidden until you vote.
- **Same passage, both sides.** Controlled Blind Research unlocks voting only after at least **five seconds of the same source passage have been heard on each side**. Skipped audio does not count. Five seconds is an initial product setting, not a validated threshold.
- **Level matching.** Tracks are loudness-normalized (−16 LUFS in Blind Research) and A and B share gain and headroom. Source normalization does **not** guarantee equal perceived loudness after EQ is applied.
- **Three answers.** *Prefer A*, *Prefer B*, or *Unsure / Tie*. Eligible ties count as half a preference for each target. Identical-EQ trials are diagnostic checks and do not affect rankings.
- **Open Comparison is separate.** Free listening never enters controlled rankings.

**Research Rankings** use a participant-balanced, regularized Bradley–Terry-style score with a weak prior. Each participant group's total weight is split across the pairs they heard, so one person repeating many comparisons cannot stand in for many independent listeners. This is a descriptive score under stated assumptions, not a validated estimator, and its ranges are not population confidence intervals. Full definitions and limits are in the [research protocol](RESEARCH_PROTOCOL.md).

**Community Preferences** is a separate, optional validation pilot (future Personal choices plus randomized reference checks). Its public numerical summaries are withheld pending independent listener validation and privacy review. It is not another name for Research Rankings, and listeners do not receive a skill rank.

## What this project can and cannot claim

**Background from published sources (not results of this project)**

- General guidance for subjective sound-quality tests ([ITU-R BS.1284-2](https://www.itu.int/rec/R-REC-BS.1284-2-201901-I/en)) says comparison tests must match loudness accurately, that listeners should normally be trained, that listening conditions should be reported, and that statistical expertise is needed to design and analyze a test. This project borrows the loudness-matching idea. It does **not** meet the rest: participants are untrained, conditions are uncontrolled, and panel sizes are not planned.
- Published listening tests of headphone target preference exist. One example is Olive, Welti and McMullin, ["Listener Preferences for Different Headphone Target Response Curves"](https://aes2.org/publications/elibrary-page/?id=16768), AES Convention 134, Paper 8867 (2013). Its AES E-Library abstract describes two double-blind listening tests in which trained listeners rated eight headphone target responses on two headphone models. (We cite the public abstract only; the full paper has not been reviewed for this README.) YinYang EQ is a different kind of study: remote, self-selected and exploratory, and it does not replicate that design.

**Open research questions this project is built to explore (proposed, not demonstrated)**

These come from the project's [listener-consistency research notes](docs/research/README.md), which are proposals and do not authorize product changes:

- How do listeners vary in telling EQ differences apart, and does that depend on the EQ pair, track, equipment and session?
- How repeatable are individual preferences within and between sessions, and how do ties relate to repeatability?
- Do preference patterns differ across groups once listening context and comparison coverage are accounted for?
- What, if anything, would justify weighting listeners by consistency? No weighting or listener skill score is implemented or decided. How populations differ is an open question, not a result.

Disagreeing with the majority is not treated as an error, and no universal correct EQ preference is assumed.

**Not established**

- That rankings reflect sound quality, accuracy, or the "best" target.
- That participants are representative. They are self-selected, use uncontrolled equipment and rooms, and the site cannot verify that accounts are distinct people.
- That the five-second rule, the loudness normalization or the scoring weights are optimal or validated.
- Any publishable result. The [research notes](docs/research/README.md), [Community Preference design](docs/COMMUNITY_PREFERENCE_DESIGN.md) and [Community validation protocol](docs/COMMUNITY_VALIDATION_PROTOCOL_2026-10-19.md) record what would be needed first, such as a preregistered analysis, validation against independent samples and a privacy review.

If the data eventually supports a finding, it would be reported with its limits, including exclusions, protocol versions and sensitivity checks.

## Participation, privacy, and your data

During maintenance, only authenticated admins can use the app. The following describes the ordinary access policy when the owner reopens the site: browsing does not ask for consent. The participation agreement is requested **once, when an action would record data**: starting a test (Listen, Personal Tournament, a Community check), rating a song, sharing a target for review, or finalizing or exporting an EQ in Preference Tuning. Closing the box leaves you where you are. These are **optional, off by default and changed independently** in **My data**:

- tags and fingerprints of music from your own device
- identifiable activity monitoring
- Personal research / Community Preferences contributions
- private account sync
- an optional nickname (visible only to you and admins)

Declining optional choices still allows listening. Withdrawing stops future participation and access to the listening tools; deleting earlier submissions is a separate action in **My data**. Cancelling a consent form leaves saved choices unchanged.

What is recorded, in brief (the [live privacy notice](https://yinyangeq.com/privacy) is authoritative):

- **Comparisons:** your choice, the targets compared, headphone category, playback intervals and times, protocol version, measurement reference and EQ-fit summary. Blind votes and eligible ties feed public Research Rankings; Open Comparison results are for admin-only research. Valid comparisons are kept long term, and admins can view individual records.
- **Audio files** from your device are processed locally and are not uploaded by ordinary listening or sync.
- **Sync** (optional) copies saved results, measurements, targets, EQs and settings to the server and your approved browsers. It excludes audio, credentials and active playback, and does not grant research sharing.
- **Activity monitoring** (optional) is kept for 30 days and does not capture typed text, audio, raw IP addresses or device fingerprints.
- **Preference Tuning exports** are recorded for private research, including the downloaded file and tuning settings.
- Backups have separate retention. Downloaded copies and backups cannot be remotely erased. Data is not sold or used for advertising.

The notice also describes a protected public-archive release (rounded, uncertainty-bounded results with no identifiers) and states that its privacy budget is not an independent certification of anonymity.

### Shareable shootouts

When the owner reopens the site, the shareable tool lets anyone build a blind A/B for two to four targets and share a link (`/s/<id>`), an iframe snippet (`/embed/<id>`) and a private results link whose manage key lives in the URL fragment. Runs store only the picks, an hour bucket, an optional setup answer, whether curves were viewed and which sound played: no IP address, cookie, account or exact time. Shootouts are deleted 180 days after results were last opened, or when the sharer deletes them. Only built-in targets with a redistribution-compatible license (currently MIT or CC BY 4.0) can be used. See [docs/SHAREABLE_SHOOTOUTS.md](docs/SHAREABLE_SHOOTOUTS.md).

## Current status

- **Live release:** 0.2.0-beta.1 / update121 (October 24, 2026), under owner-only maintenance, recorded in [LIVE_RELEASE.json](LIVE_RELEASE.json) and [LIVE_STATE.md](LIVE_STATE.md); see the [release verification](docs/releases/update121-verification.json).
- **Not verified:** physical headphone output, and real Safari/iOS interruption and recovery.
- **Beta:** some features may be unfinished and bugs may appear.
- **Free and noncommercial:** the site has no advertising, payments or paid features, and its [privacy notice](https://yinyangeq.com/privacy) states that data is not sold or used for advertising.
- The remaining screenshots show the October 17, 2026 interface and demo data; labels, target names and counts have since changed.

## Run locally

Requires **Node.js 22.13 or newer** (and Python 3 for the release check). The commands below were last run end to end on a fresh export of this repository with Node.js 26.12.0 and npm 12.2.1.

```sh
npm ci
node scripts/check-live-source.mjs --source-only
npm run setup:local
npm run dev
```

`setup:local` creates a fresh local D1 database from the checked-in migrations plus ignored development secrets, and refuses to overwrite an existing database. Open the URL the dev server prints (normally `http://localhost:5173`). No Cloudflare account or production credentials are needed. See [local setup](docs/LOCAL_SETUP.md) for details.

The public repository is a **clean source release**. It excludes production data, credentials, deployment state, numerical target seed curves, **all music recordings** and participant records. In a fresh clone:

- Comparisons need target records, which `setup:local` does not install.
- The Music Library lists tracks with their waveforms, credits and license links, but **no recording will play**. On loopback hosts, a same-origin check explains a confirmed missing recording; other failures retain the generic playback message. This applies to all absent recordings, not only the Shantae tracks. Supply audio files you are entitled to use at the paths the catalog expects (for example `public/music/shantae/<id>.<ext>`) to restore playback.

Use `npm run build` then `node scripts/package-static-assets.mjs --public-only` for a clone preview; public-only packages cannot be deployed. Full `--snapshot` verification needs the owner's private release inputs.

Building, committing, pushing and deploying are separate operations. Maintainers: start at [docs/HANDOFF.md](docs/HANDOFF.md), [docs/RECOVERY.md](docs/RECOVERY.md) and [docs/REBUILD.md](docs/REBUILD.md). Before pushing, run `npm run check:release`, review `git diff --cached --name-only`, and never add `.env*`, tokens, working databases, `public/music/`, or build output.

## License and provenance

Copyright 2026 **Yin Yang EQ Lab (@yinyangeqlab)**. The [Apache License 2.0](LICENSE) covers only the original software source code and allows broad reuse, including commercial use, with its required notices. It does **not** grant rights to the project or lab names, logos, branding, site copy, screenshots or visual design. See [LICENSE_SCOPE.md](LICENSE_SCOPE.md), [NOTICE](NOTICE) and [THIRD_PARTY.md](THIRD_PARTY.md).

Music, target curves, measurements and datasets keep their own licenses and are **not** covered by Apache 2.0. A screenshot, video or running demo does not grant rights to them.

- **Music:** the Listening Pool has 224 recordings (217 song families). Two kinds are described below. The recordings are not in this repository. Library cards credit the artist and album and link to the source and, where one exists, the license.
  - **Creative Commons and other open recordings:** the live site plays 32 tracks from Jake Kaufman’s *Shantae: Half-Genie Hero OST* (26 FLAC, six AAC) from album downloads. Each of the 32 tracks’ [Bandcamp pages](https://virt.bandcamp.com/album/shantae-half-genie-hero-ost) states CC BY-NC-SA 4.0 (checked October 23, 2026); “Title” and “Let’s Go Shopping” are all rights reserved and excluded. Other library entries link to external audio with creator and license information.
  - **Used with permission, all rights reserved:** 24 recordings by Jason J. Chevallier are used on the site with the artist’s permission. They carry no Creative Commons license, and visitors receive no license to reuse or redistribute them; the library says so on each card. See [docs/JASON_MUSIC_IMPORT_2026-10-23.md](docs/JASON_MUSIC_IMPORT_2026-10-23.md).
- **Waveform data:** `data/music-waveforms.json` and `data/listening-pool-waveforms.json` hold cached waveform summaries, which are peak envelopes and not audio. They are outside the Apache grant and describe recordings that carry their own licenses; see [THIRD_PARTY.md](THIRD_PARTY.md).
- **Targets and measurements:** numerical target seed data is excluded because redistribution rights are not established for all of it. No PEQdB curves, preset exports or application code are included; PEQdB is referenced as a target creator and for its TXT preset format. The [target inventory](docs/TARGET_INVENTORY.md) lists names and categories only.

## Acknowledgments and how this was built

- Headphone measurement indexes: [AutoEq](https://github.com/jaakkopasanen/AutoEq) (MIT) and [Jay’s Audio](https://github.com/JaysAudio/JaysAudio.github.io) (0BSD). Target credits include Tryptify, AutoEq and MrChillStorm sources; see [TARGET_INVENTORY](docs/TARGET_INVENTORY.md) and [THIRD_PARTY](THIRD_PARTY.md). Credit does not imply endorsement.
- UI components adapted from [shadcn/ui](https://github.com/shadcn-ui/ui) (MIT). Sites integration code retains OpenAI’s MIT notice. Installed packages keep their own licenses.
- Trailer soundtrack: “Discovery” by [Scott Buckley](https://www.scottbuckley.com.au/library/discovery/), CC BY 4.0. Mobile walkthrough: “The Funk” by Hotham, CC BY 4.0. Full media credits: [DEMO](docs/DEMO.md), [MOBILE_DEMO](docs/MOBILE_DEMO.md), [VIDEOS](docs/VIDEOS.md).
- **Yin Yang EQ Lab directs and maintains this project, with assistance from OpenAI Codex and Anthropic Claude.** Both tools have assisted with code, documentation and review. Yin Yang EQ Lab remains responsible for project decisions and releases. Third-party components and data keep their original credits and licenses. Stack: TypeScript, React, Next.js/Vinext, the Web Audio API, Cloudflare Workers and D1.

## Bugs, ideas, and contact

Open a **[GitHub issue](https://github.com/yinyangeqlab/yinyang-eq-lab/issues/new)** with your browser/device, the page or mode, what you expected and what happened. Issues are public: leave out tokens, sign-in codes, private links and personal files. Questions can also go to **[yinyangeqlab@gmail.com](mailto:yinyangeqlab@gmail.com)**.
