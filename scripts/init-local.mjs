import { randomBytes } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync, unlinkSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const wrangler = fileURLToPath(new URL("../node_modules/wrangler/bin/wrangler.js", import.meta.url));
const run = args => {
  const result = spawnSync(process.execPath, [wrangler, "d1", "execute", "DB", "--local", "--config", "wrangler.local.json", "--persist-to", ".wrangler/state", ...args],
    { cwd: root, encoding: "utf8", env: { ...process.env, WRANGLER_SEND_METRICS: "false", WRANGLER_LOG_PATH: ".wrangler/logs" } });
  if (result.status !== 0) throw new Error(result.stderr || result.stdout || result.error?.message || `Local D1 initialization failed (${result.signal || result.status}).`);
  return result.stdout;
};
const result = JSON.parse(run(["--json", "--command", "SELECT name FROM sqlite_master WHERE type = 'table'"]));
const tables = result.flatMap(row => row.results || []).map(row => row.name)
  .filter(name => !name.startsWith("sqlite_") && !name.startsWith("_cf_"));
if (tables.length) throw new Error("Local D1 already contains tables. Preserve it and apply only missing migrations as described in docs/LOCAL_SETUP.md.");
const migrations = readdirSync(new URL("../drizzle/", import.meta.url)).filter(name => /^\d{4}_[a-z0-9_]+\.sql$/.test(name)).sort();
mkdirSync(new URL("../.wrangler/", import.meta.url), { recursive: true });
const sqlPath = new URL("../.wrangler/local-schema.sql", import.meta.url);
try {
  writeFileSync(sqlPath, migrations.map(name => readFileSync(new URL(`../drizzle/${name}`, import.meta.url), "utf8")).join("\n"));
  run(["--file", fileURLToPath(sqlPath)]);
} finally { if (existsSync(sqlPath)) unlinkSync(sqlPath); }
const vars = new URL("../.dev.vars", import.meta.url);
if (!existsSync(vars)) {
  writeFileSync(vars, `ABUSE_RATE_SECRET=${randomBytes(32).toString("hex")}\nOWNER_ANALYTICS_TOKEN=${randomBytes(32).toString("hex")}\n`, { mode: 0o600, flag: "wx" });
  console.log("Created ignored development-only secrets in .dev.vars.");
} else console.log("Preserved existing .dev.vars; check that both required development secrets are present.");
console.log(`Initialized local DB with ${migrations.length} migrations. No production data or target curves were installed. Run npm run dev.`);
