import { fileURLToPath } from "node:url";
import { join } from "node:path";

export const repositoryRoot = fileURLToPath(new URL("../", import.meta.url));
export const siteRoot = join(repositoryRoot, "site");
export const publicRoot = join(repositoryRoot, "public");
export const buildRoot = join(repositoryRoot, "dist");
export const siteBuildRoot = join(siteRoot, "dist");
export const migrationsRoot = join(repositoryRoot, "drizzle");
