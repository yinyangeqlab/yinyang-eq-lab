// Welcome uses Chromium via Playwright. Other pages share the static card renderer.
// node scripts/generate-share-motion.mjs --browser-module=/path/to/playwright-core/index.mjs [--slug=welcome]
// Use --still-only for the homepage fallback or --cards-only for the other pages.
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import sharp from "sharp";
import ts from "typescript";
import { shareAnimationUrl, sharePreviewCards } from "../lib/share-pages.mjs";
import { prepareShareCard } from "./generate-share-cards.mjs";

const publicDir = new URL("../public/", import.meta.url);
const assets = new URL("share/", publicDir);
const slug = process.argv.find(arg => arg.startsWith("--slug="))?.slice(7);
const browserModule = process.argv.find(arg => arg.startsWith("--browser-module="))?.slice(17);
const stillOnly = process.argv.includes("--still-only");
const cardsOnly = process.argv.includes("--cards-only");

function eased(lower, upper, value) {
  const position = Math.max(0, Math.min(1, (value - lower) / (upper - lower)));
  return position * position * (3 - 2 * position);
}

async function writeWelcomeArtwork(artwork, rendered, orb) {
  const { data, info } = await sharp(artwork).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;
  const resting = await sharp(Buffer.from(rendered, "base64")).resize(width, height).removeAlpha().raw().toBuffer();
  const radius = orb.radius * height;
  const centerX = orb.x * width, centerY = orb.y * height;
  const featherEnd = 1.20;
  const valleyEnd = .67;
  // Keep the aurora and the low valley fog in the still artwork.
  for (let y = 0; y < Math.max(height * valleyEnd, centerY + radius * featherEnd); y++) {
    const heightFraction = y / height;
    const skyBlend = 1 - eased(.435, .50, heightFraction);
    const valleyBlend = 1 - eased(.57, valleyEnd, heightFraction);
    for (let x = 0; x < width; x++) {
      const distance = Math.hypot(x + .5 - centerX, y + .5 - centerY) / radius;
      const valleyWidth = 1 - eased(.28, .48, Math.abs((x + .5) / width - orb.x));
      const blend = Math.max(skyBlend, valleyBlend * valleyWidth, 1 - eased(1.015, featherEnd, distance));
      if (!blend) continue;
      const pixel = (y * width + x) * channels;
      for (let channel = 0; channel < channels; channel++) {
        const index = pixel + channel;
        data[index] = Math.round(data[index] * (1 - blend) + resting[index] * blend);
      }
    }
  }
  const wide = await sharp(data, { raw: info }).webp({ quality: 94 }).toBuffer();
  await writeFile(new URL("brand-landscape-crimson.webp", publicDir), wide);
  return wide;
}

async function welcomeFrames(size, delay) {
  const moduleUrl = browserModule ? pathToFileURL(resolve(browserModule)).href : "playwright";
  const { chromium } = await import(moduleUrl);
  const browser = await chromium.launch({
    ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}),
    args: ["--enable-unsafe-swiftshader", "--use-angle=swiftshader"],
  });
  try {
    const artwork = await readFile(new URL("brand-landscape.webp", publicDir));
    const original = await sharp(artwork).metadata();
    const page = await browser.newPage({ viewport: { width: original.width + 20, height: original.height + 20 } });
    const source = await readFile(new URL("../lib/welcome-landscape.ts", import.meta.url), "utf8");
    const renderer = ts.transpileModule(source, {
      compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
    }).outputText;
    await page.setContent(`<canvas style="width:${original.width}px;height:${original.height}px"></canvas>`);
    const { cycleSeconds, orb } = await page.evaluate(async ({ renderer, artwork }) => {
      const moduleUrl = URL.createObjectURL(new Blob([renderer], { type: "text/javascript" }));
      const { createLandscapeRenderer, LANDSCAPE_CYCLE_SECONDS, LANDSCAPE_ORB } = await import(moduleUrl);
      URL.revokeObjectURL(moduleUrl);
      const image = new Image();
      image.src = `data:image/webp;base64,${artwork}`;
      await image.decode();
      const canvas = document.querySelector("canvas");
      const gl = canvas.getContext("webgl");
      let timeLocation;
      let time = 0;
      const uniformLocation = gl.getUniformLocation.bind(gl);
      const uniform = gl.uniform1f.bind(gl);
      gl.getUniformLocation = (program, name) => {
        const location = uniformLocation(program, name);
        if (name === "time") timeLocation = location;
        return location;
      };
      gl.uniform1f = (location, value) => uniform(location, location === timeLocation ? time : value);
      const engine = createLandscapeRenderer(canvas, image, () => {});
      if (!engine) throw Error("Chromium could not render the welcome artwork.");
      engine.load();
      window.captureLandscape = seconds => {
        time = seconds;
        engine.resize();
        return canvas.toDataURL().split(",")[1];
      };
      return { cycleSeconds: LANDSCAPE_CYCLE_SECONDS, orb: LANDSCAPE_ORB };
    }, { renderer, artwork: artwork.toString("base64") });
    const wide = await writeWelcomeArtwork(artwork, await page.evaluate(() => window.captureLandscape(0)), orb);
    if (!size) return;
    const still = await sharp(wide).resize(1200, 630).jpeg({ quality: 89, mozjpeg: true }).toBuffer();
    await writeFile(new URL("welcome.jpg", assets), still);
    await page.evaluate(({ width, height }) => {
      Object.assign(document.querySelector("canvas").style, { width: `${width}px`, height: `${height}px` });
    }, size);
    const frames = [];
    const count = Math.round(cycleSeconds * 1000 / delay);
    for (let start = 0; start < count; start += 12) {
      const images = await page.evaluate(({ start, size, delay }) =>
        Array.from({ length: size }, (_, index) => window.captureLandscape((start + index) * delay / 1000)),
      { start, size: Math.min(12, count - start), delay });
      for (const image of images) frames.push(await sharp(Buffer.from(image, "base64")).removeAlpha().raw().toBuffer());
    }
    return frames;
  } finally {
    await browser.close();
  }
}

async function cardFrames(page, size) {
  const render = await prepareShareCard(page, size);
  const frames = [];
  const count = 40;
  for (let index = 0; index < count; index++) {
    frames.push(await render(.16 + index / count).removeAlpha().raw().toBuffer());
  }
  return frames;
}

if (stillOnly) {
  await welcomeFrames();
} else {
  const pages = sharePreviewCards
    .filter(page => shareAnimationUrl(page) && (!slug || page.slug === slug) && (!cardsOnly || page.slug !== "welcome"))
    .sort((a, b) => Number(b.slug === "welcome") - Number(a.slug === "welcome"));
  if (!pages.length) throw Error("Unknown animated share-card slug.");
  for (const page of pages) {
    const size = shareAnimationUrl(page);
    const { width, height } = size;
    const welcome = page.slug === "welcome";
    const delay = welcome ? 140 : 90;
    const frames = await (welcome ? welcomeFrames(size, delay) : cardFrames(page, size));
    const gif = await sharp(Buffer.concat(frames), {
      raw: { width, height: height * frames.length, pageHeight: height, channels: 3 },
    }).gif({
      loop: 0, delay: frames.map(() => delay), effort: welcome ? 7 : 4, dither: welcome ? .18 : 0,
      colours: 256, interFrameMaxError: welcome ? 12 : 3, interPaletteMaxError: 12,
    }).toBuffer();
    const name = `${page.slug}-motion.gif`;
    await writeFile(new URL(name, assets), gif);
    console.log(`${name} ${(gif.length / 1024).toFixed(0)} KB`);
  }
}
