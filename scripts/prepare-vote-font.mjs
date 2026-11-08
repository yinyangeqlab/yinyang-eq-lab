import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve, join } from "node:path";
import { fileURLToPath } from "node:url";
import { voteFontFiles, verifyVoteFontBytes, verifyVoteFontAssets } from "./vote-font-assets.mjs";

const root = fileURLToPath(new URL("..", import.meta.url));
const args = process.argv.slice(2);
const downloading = args.length === 1 && args[0] === "--download";
const supplied = args.length === 2 && args[0] === "--inputs";
if (!downloading && !supplied) throw new Error("Use --download or --inputs EXTERNAL_FONT_FOLDER.");
const input = downloading ? join(root, "artifacts/font-inputs/public-sans") : resolve(args[1]);
const prepared = [];
for (const file of voteFontFiles) {
  let bytes;
  if (downloading) {
    const response = await fetch(file.url, { signal: AbortSignal.timeout(30000) });
    if (!response.ok) throw new Error(`Font download failed: ${response.status} ${file.input}`);
    bytes = Buffer.from(await response.arrayBuffer());
  } else bytes = await readFile(join(input, file.input));
  verifyVoteFontBytes(bytes, file);
  prepared.push({ file, bytes });
}
// Validate both inputs before writing either prepared asset.
const destination = join(root, "public/fonts/public-sans");
await mkdir(destination, { recursive: true });
if (downloading) await mkdir(input, { recursive: true });
for (const { file, bytes } of prepared) {
  if (downloading) await writeFile(join(input, file.input), bytes);
  await writeFile(join(destination, file.output), bytes);
}
verifyVoteFontAssets(root);
console.log("Prepared verified Public Sans Bold Latin font and SIL license for local serving.");
