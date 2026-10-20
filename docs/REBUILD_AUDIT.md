# Rebuild audit — October18,2026

Baseline: verified live update81, implementation08f166f. Fetched origin/main before editing: clean checkout, no divergence. Owner main runtime matched update81; only pre-existing tsconfig/license-copy differences remained. No pull/merge was needed. Latest Welcome/tagline release was preserved.

## Fixed

- Added the missing clone-safe source verifier and versioned356-file public rebuild input manifest. Full owner snapshot checker is also supplied, with explicit --source-only mode for clones.
- Added real browser-pairing regression coverage using tracked generic pairing code and synthetic random credentials. Existing test-only portability adjustments are retained.
- Added credential-free Pulumi deployment/gate source, provider lockfile, abuse/static routing helpers and independent cost-guard source/policy. No stack config/state, credentials or data were included. Ignore rules and publication checks allow only these named files.
- Added explicit --public-only asset packaging for clones; full packaging still requires all authorized protected media. A marker causes the deployment code to reject a preview package before stack config/resource creation.
- Excluded the separate infrastructure project from app TypeScript checking; infrastructure is checked using its own package lock/config.
- Replaced obsolete update73 current handoffs; archived their historical content. Updated source alignment, README terminology, local setup, agent instructions, deployment workflow and owner-private restoration inventory. Full live rebuild requires private media, existing authorized D1/catalog, stack state/config, credentials and external guard/WAF bindings.

## Fresh tracked-files-only verification

Exported the staged Git index into an empty directory, with no workspace node_modules, .dev.vars, database or production state. Installed app and infrastructure dependencies independently using npm ci and their committed locks. Tested with Node26.12.0/npm on Linux; no claim of byte-identical output or physical-device testing.

Passed:

- Public rebuild input hashes, runtime parity with the verified live snapshot, and complete public branding/worklet asset coverage.
- Production app build, public-only packaging17 static assets,69 client import checks,6 redundant stale preload removals.
- App and separate infrastructure TypeScript checks.
- All18 upload/session/Continue regression cases; passage boundary/order/interruption/recovery suites.
- Pairing suite against real gate code and synthetic SQLite; all31 migration/schema checks.
- Documented fresh local DB setup:31 migrations, newly generated ignored local-only secrets, no target seeds or production contact.
- Full packaging refused missing protected media; preview marker remained. Deployment program rejected the preview package before reading stack configuration or creating resources.
- Publication scan of the staged tree and whitespace checks.

The first install attempt hit temporary-filesystem quota; its incomplete dependency/cache directories were removed, and a clean install succeeded on the project filesystem. Restricted sandbox blocked the first local DB subprocess; the same local-only initializer passed with subprocess permission. These were environment issues, not silently skipped checks.

No live deployment, production writes, schema changes, user-record restoration or security/cost configuration changes were performed. Private recordings, numerical curve seeds, participant data, credentials, stack configuration/state and generated output remain excluded. See REBUILD.md for restoration requirements. Owner local evidence: artifacts/rebuild-audit-{install,build,package,types,local-setup,infra-install,infra-types,full-package-refusal}.log.
