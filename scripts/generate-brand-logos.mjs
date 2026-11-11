// Regenerate the active browser icons. Historical artwork URLs keep their original assets.
import { copyFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const publicDir = new URL("../public/", import.meta.url);
const file = name => fileURLToPath(new URL(name, publicDir));
const mark = file("brand-mark.svg");

await copyFile(mark, file("favicon.svg"));
await sharp(mark, { density: 288 }).resize(64, 64).png().toFile(file("brand-favicon.png"));
await sharp(mark, { density: 288 }).resize(180, 180).png().toFile(file("brand-yin-yang.png"));
