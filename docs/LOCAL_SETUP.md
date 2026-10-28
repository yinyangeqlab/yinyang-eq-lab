# Local setup and deployment boundaries

## Fresh checkout

Use Node.js 22.13 or newer, npm, and Python 3 for the release check. From the repository root:

```sh
npm ci
npm run setup:local
npm run dev
```

Open the URL printed by the server, normally `http://localhost:5173`. The setup command uses Wrangler's local D1 emulator with the same placeholder database ID and `.wrangler/state` directory as the Vite preview. It reads every checked-in SQL file in filename order, including both historical `0012` migrations. It creates ignored `.dev.vars` values for `ABUSE_RATE_SECRET` and `OWNER_ANALYTICS_TOKEN` using local random bytes. It does not contact or seed a production database. An existing `.dev.vars` is preserved; both values must be at least 32 characters long.

Setup refuses a database that already contains application tables. It is an initializer, not a migration-history detector. If initialization fails partway through, inspect the local schema before retrying; preserve any data you need. The checked-in migration journal and current schema snapshot describe the source schema, not the migration state of a database you already operate.

During `npm run dev`, the portable preview supplies a mock sign-in. Use the welcome page’s sign-in link, or open `/signin-with-chatgpt?return_to=%2Fmusic-library`, to establish the local mock session before saving account music votes. For loopback requests only, development Worker code supplies a fixed local client IP and the configured owner token to owner-research API requests. This development behavior is removed from production builds. Keep the preview on loopback. `npm run start` runs the production build and does not supply this development edge emulation.

## What a fresh clone includes

The welcome, tuning and music-library interfaces are present. Library metadata and audio manifests describe current live recordings and external source URLs, but actual protected audio bytes are excluded. Audio maps can reference missing hosted files; clone playback is not guaranteed equivalent. Network availability and source browser-access policy affect playback. Without restored hosted audio, supported Shantae entries may use Bandcamp fallback players; the application's EQ cannot process those embeds. Waveform availability depends on available summaries and recording sources.

No approved target records or numerical target seeds are included. Listening comparisons and reference-based EQ need target records that you are authorized to use. A private local target does not automatically become an approved database target. No production votes, accounts, measurement archives or access invitations are supplied.

Ordinary measurement saves and My results use browser storage. Optional original-file contributions use D1 and require migrations through `0016`. Research attachments are CSV/TXT response files, each up to 4,000,000 bytes, stored in chunks to respect D1's [row and query limits](https://developers.cloudflare.com/d1/platform/limits/). Private owner downloads verify each reconstructed file's SHA-256.

## Existing local database

Back up existing state first and determine which migrations have already been applied from your own deployment records/schema. Never rerun all migrations against a populated database: several historical files contain non-idempotent `ALTER TABLE` statements. The two `0012` files are distinct and must both have been applied.

For a local database already current through `0015`, apply only the new additive attachment migration:

```sh
npx wrangler d1 execute DB --local --config wrangler.local.json --persist-to .wrangler/state --file drizzle/0016_measurement_file_chunks.sql
```

For an older database, apply its missing SQL files individually in filename order. The journal no longer references the nonexistent `0011_research_records.sql`; it lists the actual files. Historical filenames and SQL are retained. Do not treat repaired metadata as permission to replay previously applied migrations or automatically convert an existing database's migration bookkeeping.

If you already initialized a local DB outside the new setup command, create an ignored `.dev.vars` with separate random development values for `ABUSE_RATE_SECRET` and `OWNER_ANALYTICS_TOKEN`. For example, generate each value with `node -p "require('node:crypto').randomBytes(32).toString('hex')"`. Keep those values local; use your production host's secret manager for production secrets.

## Production configuration

The repository supplies application source, local configuration and audited credential-free gate/deployment code under infra/pulumi. Account-specific stack configuration/state and secret values remain excluded. See REBUILD.md for the restoration inventory. A production replacement needs:

- A real D1 binding named `DB`, the required SQL migrations, and appropriately licensed target records.
- A server-side `ABUSE_RATE_SECRET` of at least 32 characters and a trusted edge-supplied `CF-Connecting-IP` header. Protected writes fail closed when these are absent.
- A server-side `OWNER_ANALYTICS_TOKEN` of at least 32 characters. Owner research and original-file downloads require its bearer token. The live site's separate gate injects it only for an authenticated owner; browser clients must never receive the secret.
- A trusted identity layer for account music votes. The application reads `oai-authenticated-user-*` identity headers; the edge must remove caller-supplied values and supply verified ones.
- Access controls appropriate to the deployment, with upload authorization, retention/deletion policy and backups. A pseudonymous contributor ID is not proof of identity or rights.

The application's public write gate rate-limits and bounds measurement contributions; the production invitation gate provides participant access. The standalone development preview does not install that invitation system; the tracked production gate wraps the built app. Do not expose an unprotected replacement while assuming these local development conveniences provide production authentication.

Build with `npm run build` and package public-clone assets with `node scripts/package-static-assets.mjs --public-only`. This marks output as nondeployable until authorized protected media is restored and full packaging succeeds. Publishing code to GitHub does not deploy a Worker, install recordings or apply a migration. Existing production databases need their own reviewed migration operation before using new attachment storage.

## PEQdB AutoEQ source package

The AutoEQ worker uses a separately prepared LGPL engine package, with the original TypeScript fitter retained as fallback. Follow [PEQDB_AUTOEQ.md](PEQDB_AUTOEQ.md) to build the pinned WASM and its corresponding source/notices outside Git. Development previews can use fallback when the package is absent; packaging a PEQdB-enabled build requires the complete verified binary/source/license package. No deployment is implied.
