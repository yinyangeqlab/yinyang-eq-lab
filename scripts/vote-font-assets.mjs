import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";

// External font inputs stay outside Git; preparation verifies the exact reviewed bytes.
export const voteFontFiles = [
  {
    input: "public-sans-700-latin.woff2",
    output: "bold-latin-dace7416.woff2",
    sha256: "dace741613696827f61dbee2d984e8685f14a2846136783f3ad1c8950914bf1d",
    url: "https://fonts.gstatic.com/s/publicsans/v21/ijwGs572Xtc6ZYQws9YVwllKVG8qX1oyOymu8Z6JxAco.woff2",
  },
  {
    input: "public-sans-OFL.txt",
    output: "OFL.txt",
    sha256: "157a9e77f7580246e97c769490e2e977ae94399f9d30f4556015c41fe8c28bac",
    url: "https://raw.githubusercontent.com/google/fonts/main/ofl/publicsans/OFL.txt",
  },
];
export function verifyVoteFontBytes(bytes, file) {
  const actual = createHash("sha256").update(bytes).digest("hex");
  if (actual !== file.sha256) throw new Error(`Public Sans hash mismatch: ${file.input}`);
}
export function verifyVoteFontAssets(root = process.cwd()) {
  for (const file of voteFontFiles) {
    let bytes;
    try { bytes = readFileSync(join(root, "public/fonts/public-sans", file.output)); }
    catch { throw new Error("Missing Public Sans assets. Run node scripts/prepare-vote-font.mjs --download, or pass --inputs with the reviewed external font folder."); }
    verifyVoteFontBytes(bytes, file);
  }
}
