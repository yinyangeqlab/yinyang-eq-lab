// Rebuilds looping share artwork from the original SVGs and the Welcome renderer.
// Requires FFmpeg with libwebp_anim and libsvtav1, and Playwright/Chromium for Welcome.
import { spawn } from "node:child_process";
import { once } from "node:events";
import { mkdir, mkdtemp, readFile, rename, rm, stat, writeFile } from "node:fs/promises";
import { basename, join, resolve } from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { fileURLToPath, pathToFileURL } from "node:url";
import sharp from "sharp";
import ts from "typescript";
import { SHARE_IMAGE_SIZE, SHARE_MOTION_FPS, shareAnimationUrl, sharePreviewCards } from "../lib/share-pages.mjs";
import { encodeShareStill, prepareShareCard } from "./generate-share-cards.mjs";

const publicDir = new URL("../public/", import.meta.url);
const assets = new URL("share/", publicDir);
const scratch = new URL("../artifacts/", import.meta.url);
const slug = process.argv.find(arg => arg.startsWith("--slug="))?.slice(7);
const browserModule = process.argv.find(arg => arg.startsWith("--browser-module="))?.slice(17);
const stillOnly = process.argv.includes("--still-only");
const cardsOnly = process.argv.includes("--cards-only");
const maxBytes = 5 * 1024 * 1024;

async function captureWelcome(size, callback) {
  const moduleUrl = browserModule ? pathToFileURL(resolve(browserModule)).href : "playwright";
  const { chromium } = await import(moduleUrl);
  const browser = await chromium.launch({
    ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}),
    args: ["--enable-unsafe-swiftshader", "--use-angle=swiftshader"],
  });
  try {
    const artwork = await readFile(new URL("brand-landscape.webp", publicDir));
    const page = await browser.newPage({ viewport: size, deviceScaleFactor: 1 });
    const source = await readFile(new URL("../lib/welcome-landscape.ts", import.meta.url), "utf8");
    const renderer = ts.transpileModule(source, {
      compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
    }).outputText;
    await page.setContent('<body style="margin:0"><canvas style="width:100vw;height:100vh"></canvas></body>');
    const cycleSeconds = await page.evaluate(async ({ renderer, artwork, size }) => {
      const moduleUrl = URL.createObjectURL(new Blob([renderer], { type: "text/javascript" }));
      const { createLandscapeRenderer, LANDSCAPE_CYCLE_SECONDS } = await import(moduleUrl);
      URL.revokeObjectURL(moduleUrl);
      const image = new Image();
      image.src = `data:image/webp;base64,${artwork}`;
      await image.decode();
      const canvas = document.querySelector("canvas");
      const engine = createLandscapeRenderer(canvas, image, () => {}, { maxWidth: size.width, maxHeight: size.height });
      if (!engine) throw Error("Chromium could not render the Welcome artwork.");
      engine.load();
      if (canvas.width !== size.width || canvas.height !== size.height) throw Error("Unexpected capture resolution.");
      window.captureLandscape = seconds => {
        engine.renderAt(seconds);
        return canvas.toDataURL().split(",")[1];
      };
      return LANDSCAPE_CYCLE_SECONDS;
    }, { renderer, artwork: artwork.toString("base64"), size });
    return await callback(page, cycleSeconds);
  } finally {
    await browser.close();
  }
}

async function* welcomeFrames(page, cycleSeconds) {
  const count = Math.round(cycleSeconds * SHARE_MOTION_FPS);
  for (let start = 0; start < count; start += 6) {
    const images = await page.evaluate(({ start, count, fps }) =>
      Array.from({ length: count }, (_, index) => window.captureLandscape((start + index) / fps)),
    { start, count: Math.min(6, count - start), fps: SHARE_MOTION_FPS });
    for (const image of images) yield await sharp(Buffer.from(image, "base64")).removeAlpha().raw().toBuffer();
  }
}

async function* cardFrames(page, size) {
  const render = await prepareShareCard(page, size);
  const count = Math.round(3.6 * SHARE_MOTION_FPS);
  for (let index = 0; index < count; index++) {
    yield await render(.16 + index / count).removeAlpha().raw().toBuffer();
  }
}

async function encodeMotion(name, size, frames) {
  await mkdir(scratch, { recursive: true });
  const temp = await mkdtemp(fileURLToPath(new URL("share-render-", scratch)));
  const output = join(temp, name);
  const avif = name.endsWith(".avif");
  const codec = avif
    ? ["-vf", "scale=out_color_matrix=bt709:out_range=full,format=yuv420p10le,setparams=range=full:color_primaries=bt709:color_trc=iec61966-2-1:colorspace=bt709",
       "-movflags", "+write_colr", "-c:v", "libsvtav1", "-preset", "8", "-crf", "22", "-b:v", "0",
       "-svtav1-params", "lp=2:mbr=3000:mbr-overshoot-pct=0", "-g", "240"]
    : ["-c:v", "libwebp_anim", "-lossless", "1", "-compression_level", "2"];
  try {
    const ffmpeg = spawn("ffmpeg", [
      "-hide_banner", "-loglevel", "error", "-f", "rawvideo", "-pixel_format", "rgb24",
      "-video_size", `${size.width}x${size.height}`, "-framerate", String(SHARE_MOTION_FPS), "-i", "pipe:0",
      ...codec, "-loop", "0", output,
    ], { stdio: ["pipe", "ignore", "inherit"] });
    const closed = once(ffmpeg, "close");
    const [written, exited] = await Promise.allSettled([pipeline(Readable.from(frames), ffmpeg.stdin), closed]);
    if (exited.status === "rejected") throw exited.reason;
    if (exited.value[0] !== 0) throw Error(`FFmpeg failed to encode ${name} (${exited.value[0] ?? exited.value[1]}).`);
    if (written.status === "rejected") throw written.reason;
    const { size: bytes } = await stat(output);
    if (bytes >= maxBytes) throw Error(`${name} exceeds the ${maxBytes / 1024 / 1024} MiB preview budget.`);
    await rename(output, new URL(name, assets));
    console.log(`${name} ${Math.round(bytes / 1024)} KiB`);
  } finally {
    await rm(temp, { recursive: true, force: true });
  }
}

await mkdir(assets, { recursive: true });
const pages = sharePreviewCards
  .filter(page => (!slug || page.slug === slug) && (!cardsOnly || page.slug !== "welcome"))
  .sort((a, b) => Number(b.slug === "welcome") - Number(a.slug === "welcome"));
if (!pages.length) throw Error("Unknown animated share-card slug.");
if (stillOnly || pages.some(page => page.slug === "welcome")) {
  await captureWelcome(SHARE_IMAGE_SIZE, async page => {
    const rendered = await page.evaluate(() => window.captureLandscape(0));
    await writeFile(new URL("welcome.jpg", assets), await encodeShareStill(sharp(Buffer.from(rendered, "base64"))));
  });
}
if (!stillOnly) {
  for (const page of pages) {
    const { url, width, height } = shareAnimationUrl(page);
    const size = { width, height };
    const name = basename(new URL(url).pathname);
    if (page.slug === "welcome") {
      await captureWelcome(size, (browserPage, cycle) => encodeMotion(name, size, welcomeFrames(browserPage, cycle)));
    } else {
      await encodeMotion(name, size, cardFrames(page, size));
    }
  }
}
