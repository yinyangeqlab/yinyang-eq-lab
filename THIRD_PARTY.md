# Third-party material

The top-level Apache 2.0 license covers original application code. It does not replace licenses or ownership of third-party components, packages, catalogs, music, or target data.

- `components/ui/` contains shadcn/ui generated or adapted components. The [official shadcn/ui source](https://github.com/shadcn-ui/ui) is MIT licensed; its license and copyright notice are in `vendor/shadcn-ui.LICENSE.md`.
- `build/sites-vite-plugin.*` and related Sites integration code retain OpenAI's MIT notice in `build/sites-vite-plugin.LICENSE`.
- `vendor/shadcn-tailwind-4.13.0.css` retains its notice in `vendor/shadcn-tailwind-4.13.0.LICENSE.md`.
- Packages installed from `package-lock.json` retain their own package licenses.
- `data/open-music.json` and `data/music-candidates.json` contain track metadata and source/license links. The recordings themselves are not included.
- `data/shantae-cc-tracks.json` lists tracks from *Shantae: Half-Genie Hero OST*. Their audio is CC BY-NC-SA 4.0, is not Apache licensed, and is not included. `data/shantae-audio.json` is empty by design.
- `data/music-waveforms.json` is empty. Cached waveform summaries from third-party recordings are excluded.
- `data/autoeq-catalog.json` is a file-name and hash index of the [AutoEq repository](https://github.com/jaakkopasanen/AutoEq), which is MIT licensed; its notice is in `vendor/autoeq.LICENSE.md`. The index has no measurement points.
- `data/jaysaudio-catalog.json` is a file-name and hash index of [Jay’s Audio](https://github.com/JaysAudio/JaysAudio.github.io), which is 0BSD licensed. The index has no measurement points.
- Both indexes link to external measurements. Measurement creators retain their rights; raw measurements are not included.

No PEQdB application code, target curves, or preset exports are included. The working project's PEQdB and other outside-contributor curve seeds were excluded because this package does not establish redistribution rights for them.

The names-only [live target inventory](docs/TARGET_INVENTORY.md) credits the target families used or added on the separate live service, including Tryptify, AutoEq and MrChillStorm sources. No numerical target data is included, including the MIT-licensed experimental curves. Their inclusion on the live service does not relicense this repository or imply creator endorsement. New live imports require explicit redistribution terms; the earlier pool's licensing audit remains incomplete.
