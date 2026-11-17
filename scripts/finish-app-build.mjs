import { existsSync, mkdirSync, mkdtempSync, renameSync, rmSync, statSync } from "node:fs";
import { join } from "node:path";
import { buildRoot, repositoryRoot, siteBuildRoot } from "./project-paths.mjs";

for (const path of ["client/_next/static", "server/index.js", "server/wrangler.json", ".openai/hosting.json", "peqdb-build-source.json"]) {
  if (!existsSync(join(siteBuildRoot, path))) throw new Error(`Incomplete application build: ${path}`);
}
if (!statSync(join(siteBuildRoot, "client/_next/static")).isDirectory()) {
  throw new Error("Application build is missing its client chunks.");
}

const artifacts = join(repositoryRoot, "artifacts");
mkdirSync(artifacts, { recursive: true });
const backup = mkdtempSync(join(artifacts, "previous-app-build-"));
const previous = join(backup, "dist");
if (existsSync(buildRoot)) renameSync(buildRoot, previous);
try {
  renameSync(siteBuildRoot, buildRoot);
} catch (error) {
  if (existsSync(previous)) renameSync(previous, buildRoot);
  throw error;
}
rmSync(backup, { recursive: true, force: true });
