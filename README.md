# YinYang EQ League

Source for the [YinYang EQ League](https://yinyangeq.com) listening site. Visitors compare headphone EQ targets with music, save measurements and tuning preferences, and review listening results. The app uses Next.js/Vinext, Cloudflare Workers, and D1.

## Development

This site was vibe coded by Yin Yang EQ Lab with GPT Codex. Yin Yang EQ Lab directed the project, reviewed its releases, and used Codex to help write and revise code and documentation. Third-party components and data keep their original credits and licenses below.

## License and provenance

Copyright 2026 Yin Yang EQ Lab (@yinyangeqlab). Original application code is licensed under [Apache License 2.0](LICENSE). See [NOTICE](NOTICE) and [THIRD_PARTY.md](THIRD_PARTY.md) for copied components, data sources, and their separate licenses. Apache 2.0 permits broad reuse, including commercial and closed-source reuse, with its required notices.

The source includes references to PEQdB as a target creator and to its TXT preset format. **No PEQdB target curves, preset exports, or PEQdB application code are included.** The working project's target seed data was deliberately excluded from this public repository. The live site can use target data held in its separate database; this repository does not grant rights to that data.

## Contact and bug reports

[Open a GitHub issue](https://github.com/yinyangeqlab/yinyang-eq-league/issues/new) to report a bug or ask a question. You can also email [yinyangeqlab@gmail.com](mailto:yinyangeqlab@gmail.com).

## Run locally

Requires Node.js 22.13 or newer. Run `npm ci`, then `npm run dev`. The checked-in `.openai/hosting.json` contains only a local D1 binding placeholder, `DB`; it has no account ID or credentials. The app needs a D1 database. Apply the SQL migrations in `drizzle/` in order, taking care with the separately named `0012` migrations.

The release package excludes production data, credentials, deployment state, invitation-gate infrastructure, target seed curves, and audio files. The site builds without them, but listening comparisons require target records and music playback requires the appropriate audio sources. The 32 Shantae soundtrack files hosted by the live site are omitted; `data/shantae-audio.json` is intentionally empty, so these tracks use the Bandcamp player fallback. Other music entries point to their creators' sites. The soundtrack is CC BY-NC-SA 4.0 and is **not** covered by this repository's Apache license.

The public production site has an invitation gate provided by separate deployment infrastructure. Do not deploy this source as a public replacement without first configuring equivalent access controls, D1 bindings, and secrets in your own hosting environment.

## Before pushing changes

Stage changes with Git and run `npm run check:release`. Review `git diff --cached --name-only` and each new file's redistribution rights. Never add `.env*`, local tokens, the working database, `infra/pulumi/Pulumi.*.yaml`, `public/music/`, `.sites-checkout/`, or build output.
