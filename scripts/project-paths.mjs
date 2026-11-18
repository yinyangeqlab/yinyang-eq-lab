import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { existsSync } from "node:fs";

export const repositoryRoot = fileURLToPath(new URL("../", import.meta.url));
export const siteRoot = join(repositoryRoot, "site");
export const publicRoot = join(repositoryRoot, "public");
export const buildRoot = join(repositoryRoot, "dist");
export const siteBuildRoot = join(siteRoot, "dist");
export const migrationsRoot = join(siteRoot, "drizzle");
export const releaseRecordPath = "docs/deployment/LIVE_RELEASE.json";

export function releaseRecordRelativePath(directory = repositoryRoot) {
  const legacyPath = "LIVE_RELEASE.json";
  if (!existsSync(join(directory, legacyPath))) return releaseRecordPath;
  if (existsSync(join(directory, releaseRecordPath))) {
    throw new Error("Both release record paths exist. Verify which record belongs to this checkout.");
  }
  return legacyPath;
}
