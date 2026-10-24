import * as ts from "typescript";
import { createHash } from "node:crypto";
import * as cloudflare from "@pulumi/cloudflare";
import * as pulumi from "@pulumi/pulumi";
import { existsSync, readFileSync, readdirSync, statSync, mkdirSync, writeFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { abuseBindings } from "./abuse-controls.mjs";
import { publicAssetBypassPatterns } from "./public-assets.mjs";

const here = __dirname;
const projectRoot = resolve(here, "../..");
const buildRoot = process.env.DEPLOY_BUILD_ROOT || projectRoot;
const serverDir = join(buildRoot, "dist/server");
const clientDir = join(buildRoot, "dist/client");
const entrypoint = join(serverDir, "index.js");
const privateGate = join(here, "private-gate.mjs");

if (!existsSync(entrypoint) || !existsSync(clientDir)) {
  throw new Error("Run npm run build from the project root before pulumi preview/up.");
}

if (existsSync(join(buildRoot, "dist/.public-only-package"))) {
  throw new Error("Public-only packages cannot be deployed. Restore authorized media and run full packaging first.");
}

const config = new pulumi.Config();
const accountId = config.require("cloudflareAccountId");
const scriptName = config.get("scriptName") ?? "yinyangeq-staging";
const maintenanceMode = config.getBoolean("maintenanceMode") ?? true;
const ownerOnlyMaintenance = config.getBoolean("ownerOnlyMaintenance") ?? false;
const ownerOnlyMaintenanceMessage = config.get("ownerOnlyMaintenanceMessage");
if (ownerOnlyMaintenanceMessage !== undefined && (!ownerOnlyMaintenanceMessage.trim() || ownerOnlyMaintenanceMessage.length > 500)) throw new Error("ownerOnlyMaintenanceMessage must contain 1–500 characters");
const canonicalOrigin = config.get("canonicalOrigin") ?? "https://yinyangeq.com";
const canonicalUrl = new URL(canonicalOrigin);
if(canonicalUrl.protocol !== "https:" || canonicalUrl.pathname !== "/" || canonicalUrl.username || canonicalUrl.password || canonicalUrl.search || canonicalUrl.hash) throw new Error("canonicalOrigin must be an HTTPS origin");

function allFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true })
    .flatMap((entry) => {
      const path = join(directory, entry.name);
      return entry.isDirectory() ? allFiles(path) : entry.isFile() ? [path] : [];
    })
    .sort();
}

// Immutable content-addressed files keep compiled code out of Pulumi's event
// payloads while making every byte change visible as an input-path change.
const moduleCache = join(projectRoot, ".sites-runtime", "deploy-modules");
mkdirSync(moduleCache, { recursive: true, mode: 0o700 });
function moduleFile(file: string): string { return moduleSource(readFileSync(file)); }
function moduleSource(bytes: Buffer): string {
  const hash = createHash("sha256").update(bytes).digest("hex");
  const target = join(moduleCache, hash + ".mjs");
  if (!existsSync(target)) writeFileSync(target, bytes, { mode: 0o600 });
  if (createHash("sha256").update(readFileSync(target)).digest("hex") !== hash) throw new Error("Deployment module cache hash mismatch");
  return target;
}

const modules: Record<string, cloudflare.types.input.WorkersScriptFiles> = {};
modules["invite-settings.mjs"] = {contentType:"application/javascript+module",contentFile:moduleFile(join(buildRoot,"lib/invite-settings.mjs"))};
modules["share-pages.mjs"] = {contentType:"application/javascript+module",contentFile:moduleFile(join(buildRoot,"lib/share-pages.mjs"))};
modules["browser-pairing.mjs"] = { contentType:"application/javascript+module", contentFile:moduleFile(join(buildRoot,"lib/browser-pairing.mjs")) };
modules["account-sync-notice.mjs"] = {contentType:"application/javascript+module",contentFile:moduleFile(join(buildRoot,"lib/account-sync-notice.mjs"))};
modules["account-preferences.mjs"] = {contentType:"application/javascript+module",contentFile:moduleFile(join(buildRoot,"lib/account-preferences.mjs"))};
modules["browser-sync.mjs"] = { contentType:"application/javascript+module", contentFile:moduleFile(join(buildRoot,"lib/browser-sync.mjs")) };

modules["service-status.mjs"] = {contentType:"application/javascript+module",contentFile:moduleSource(Buffer.from(ts.transpileModule(readFileSync(join(buildRoot,"lib/service-status.ts"),"utf8"),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText.replaceAll("@/lib/maintenance-options","./maintenance-options.mjs")))};
modules["maintenance-options.mjs"] = {contentType:"application/javascript+module",contentFile:moduleSource(Buffer.from(ts.transpileModule(readFileSync(join(buildRoot,"lib/maintenance-options.ts"),"utf8"),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText))};
modules["abuse-controls.mjs"] = { contentType:"application/javascript+module", contentFile:moduleFile(join(here,"abuse-controls.mjs")) };
modules["public-assets.mjs"] = {
  contentType: "application/javascript+module",
  contentFile: moduleFile(join(here, "public-assets.mjs")),
};
modules["media-response.mjs"] = {
  contentType: "application/javascript+module",
  contentFile: moduleFile(join(buildRoot, "lib/worker-media-response.mjs")),
};
// These small modules keep media requests out of the application renderer.
modules["media-route.mjs"] = { contentType:"application/javascript+module", contentFile:moduleFile(join(buildRoot,"lib/worker-media-route.mjs")) };
modules["media-stream.mjs"] = {
  contentType:"application/javascript+module",
  contentFile:moduleSource(Buffer.from(ts.transpileModule(readFileSync(join(buildRoot,"lib/listening-audio.ts"),"utf8"), {compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText)),
};
modules["media-manifest.mjs"] = { contentType:"application/javascript+module", contentFile:moduleSource(Buffer.from("export default " + JSON.stringify(JSON.parse(readFileSync(join(buildRoot,"data/listening-pool-audio-manifest.json"),"utf8"))) + ";\n")) };
const assetFiles = allFiles(clientDir);
// Some production builds disable publicDir copying to avoid duplicating large
// audio during compilation. Never publish a bundle missing its protected media.
const mediaManifest = JSON.parse(readFileSync(join(buildRoot,"data/listening-pool-audio-manifest.json"),"utf8"));
for (const asset of Object.values(mediaManifest) as {parts:{path:string;bytes:number}[]}[]) {
  for (const part of asset.parts) {
    const file = resolve(clientDir, "." + part.path);
    if (!file.startsWith(resolve(clientDir) + "/") || !existsSync(file) || statSync(file).size !== part.bytes) {
      throw new Error("Protected media is missing or incomplete in dist/client; package public assets before deployment.");
    }
  }
}

if (assetFiles.length > 20_000) throw new Error("Static assets exceed the Workers Free limit of 20,000 files.");
for (const file of assetFiles) {
  const bytes = statSync(file).size;
  const name = relative(clientDir, file);
  if (bytes > 25 * 1024 * 1024) throw new Error(`Static asset exceeds 25 MiB: ${name}`);
  if (bytes >= 23 * 1024 * 1024) pulumi.log.warn(`Static asset approaching the 25 MiB limit: ${name} (${(bytes / 1024 / 1024).toFixed(2)} MiB)`);
}
for (const file of allFiles(serverDir)) {
  if (!file.endsWith(".js")) continue;
  const moduleName = relative(serverDir, file).replaceAll("\\", "/");
  modules[moduleName] = {
    contentType: "application/javascript+module",
    contentFile: moduleFile(file),
  };
}

const database = new cloudflare.D1Database(
  "target-shootout-db",
  { accountId, name: `${scriptName}-db` },
  { protect: true },
);

function requiredSecret(name: string): pulumi.Output<string> {
  return config.requireSecret(name).apply((value) => {
    if (value.length < 32) throw new Error(`${name} must contain at least 32 characters.`);
    return value;
  });
}

const worker = new cloudflare.WorkersScript("target-shootout-worker", {
  accountId,
  scriptName,
  // Bound per-request computation while allowing long native audio streams.
  limits: { cpuMs: 5000 },
  mainModule: "private-gate.mjs",
  content: readFileSync(privateGate, "utf8"),
  files: modules,
  assets: {
    directory: clientDir,
    // Keep the value list-typed: the bridge cannot diff Boolean -> list (#3122).
    // Rollback is ["/*"], never false or asset-first (private music lives here).
    config: { runWorkerFirst: ownerOnlyMaintenance ? ["/*"] : ["/*", ...publicAssetBypassPatterns] },
  },
  bindings: [
    ...abuseBindings,
    { name: "ASSETS", type: "assets" },
    { name: "DB", type: "d1", databaseId: database.uuid },
    { name: "CANONICAL_ORIGIN", type: "plain_text", text: canonicalUrl.origin },
    { name: "MAINTENANCE_MODE", type: "plain_text", text: String(maintenanceMode) },
    { name: "OWNER_ONLY_MAINTENANCE", type: "plain_text", text: String(ownerOnlyMaintenance) },
    ...(ownerOnlyMaintenanceMessage ? [{ name: "OWNER_ONLY_MAINTENANCE_MESSAGE", type: "plain_text", text: ownerOnlyMaintenanceMessage }] : []),
    { name: "ABUSE_RATE_SECRET", type: "secret_text", text: requiredSecret("abuseRateSecret") },
    { name: "OWNER_ANALYTICS_TOKEN", type: "secret_text", text: requiredSecret("ownerAnalyticsToken") },
    { name: "PRIVATE_ACCESS_PASSWORD", type: "secret_text", text: requiredSecret("privateAccessPassword") },
  ],
  compatibilityDate: "2026-05-15",
  compatibilityFlags: ["nodejs_compat"],
  observability: {
    enabled: true,
    headSamplingRate: 0.1,
    logs: { enabled: true, headSamplingRate: 0.1, invocationLogs: true },
    traces: { enabled: false },
  },
});

// The Site's owner-only policy is not inherited by a direct Cloudflare Worker.
// Leave the default public workers.dev route and preview URLs disabled.
new cloudflare.WorkersScriptSubdomain("target-shootout-subdomain", {
  accountId,
  scriptName: worker.scriptName,
  enabled: false,
  previewsEnabled: false,
});

export const databaseId = database.uuid;
export const workerName = worker.scriptName;
export const serverModuleCount = Object.keys(modules).length + 1;
