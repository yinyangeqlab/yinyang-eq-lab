// Build all editions from the clean art and transparent flight capture.
// Prerequisites: Python/NumPy, ImageMagick, FFmpeg, OpenCV 4/5 development headers,
// pkg-config, a C++17 compiler, Chromium/Playwright, and the three native portrait/tablet plates.
// WALLPAPER_ARTWORK_DIR defaults to artifacts/wallpaper-artwork. Run from the repository root.
import {execFile} from "node:child_process";
import {createHash} from "node:crypto";
import {existsSync} from "node:fs";
import {link, mkdir, readFile, rename, stat, unlink, writeFile} from "node:fs/promises";
import {basename, join, resolve} from "node:path";
import {promisify} from "node:util";
import sharp from "sharp";

import {wallpaperEditions, wallpaperFilename, wallpaperFormats, wallpaperLayouts, wallpaperManifest, wallpaperScenes,} from "../../site/lib/welcome-wallpapers.ts";

import {ffmpeg, renderBackground, renderForeground} from "./render-layers.mjs";
import {packageOfflineWallpapers} from "./package-offline.mjs";
import {packageLayoutLoops} from "./package-loop.mjs";
import {addStillUsageNotice} from "./usage-notice.mjs";

const run = promisify(execFile);
const library = resolve("public/wallpapers");
const layoutOption = process.argv.find(arg => arg === "--add-layouts" || arg.startsWith("--add-layouts="));
const requestedLayouts = layoutOption?.includes("=") ? layoutOption.split("=")[1].split(",") : undefined;
if (requestedLayouts?.some(id => !wallpaperLayouts.some(layout => layout.id === id))) {
  throw Error("Unknown wallpaper layout. Available layouts: " + wallpaperLayouts.map(layout => layout.id).join(", "));
}
const layouts = requestedLayouts ? wallpaperLayouts.filter(layout => requestedLayouts.includes(layout.id))
  : layoutOption ? wallpaperLayouts.slice(1) : wallpaperLayouts;
const manifestPath = join(library, wallpaperManifest);
const existing = layoutOption && existsSync(manifestPath) ? JSON.parse(await readFile(manifestPath, "utf8")) : {};
const nativeArt = resolve(process.env.WALLPAPER_ARTWORK_DIR || "artifacts/wallpaper-artwork");
const usage = await readFile(join(library, "usage.txt"), "utf8");
const inputs = [
  "public/brand-landscape.webp", "public/welcome-headphone-carpet.webp", "public/welcome-iem-carpet.webp",
  "site/components/first-listen/landscape-panorama.webp", "site/lib/landscape-ridgeline.json",
  "site/lib/welcome-landscape.ts", "site/lib/welcome-flight-path.ts", "site/lib/welcome-wallpapers.ts",
  "site/components/welcome-landscape.tsx", "site/components/welcome-flight-model.tsx", "site/app/welcome.css",
  "scripts/generate-welcome-wallpapers.mjs", "scripts/wallpapers/scene.tsx",
  ...["render-editions.mjs", "render-layers.mjs", "landscape_plates.py", "sky-atlas.py", "animate-aurora.cpp",
     "water-motion.py", "usage-notice.mjs"].map(name => join("scripts/wallpapers", name)),
  ...["panorama", "phone", "tablet-portrait", "tablet-landscape"].map(
    name => join("scripts/wallpapers/artwork/ridgelines", name + ".png")),
  ...["phone","tablet-portrait","tablet-landscape"].map(name => join(nativeArt, "landscape-" + name + ".png")),
];
const fingerprint = createHash("sha256").update(usage);
for (const file of inputs) fingerprint.update(await readFile(file));
const scratch = resolve("artifacts/wallpaper-variants", fingerprint.digest("hex").slice(0, 20));
await mkdir(scratch, {recursive: true});
const flight = join(scratch, "flights.mov");
const atlas = join(scratch, "aurora.mkv");
const browser = process.argv.filter(arg => arg.startsWith("--browser-module="));
if (!existsSync(flight)) {
  const frames = join(scratch, "flight-frames");
  await run(process.execPath, ["scripts/generate-welcome-wallpapers.mjs", "--flight-frames=" + frames, ...browser]);
  const temporary = join(scratch, "flights.partial.mov");
  await ffmpeg(["-threads","3","-framerate","24","-i",join(frames,"flights-%04d.png"),
    "-frames:v","576","-c:v","qtrle","-pix_fmt","argb",temporary]);
  const {stdout} = await run("ffprobe", ["-v","error","-show_entries","stream=nb_frames","-of","csv=p=0",temporary]);
  if (Number(stdout.trim()) !== 576) throw Error("Incomplete flying artwork");
  await rename(temporary, flight);
}
if (!existsSync(atlas)) await run("python3", ["scripts/wallpapers/sky-atlas.py", scratch]);

async function background(layout, artwork) {
  const folder = join(scratch, layout.id, artwork);
  const {width, height} = layout.sizes[0];
  await mkdir(folder, {recursive:true});
  if (!existsSync(join(folder,"background.mp4"))) {
    await run("python3",["scripts/wallpapers/landscape_plates.py",layout.id,artwork,
      String(width),String(height),nativeArt,folder]);
    await renderBackground(folder,width,height,atlas);
  }
  return folder;
}
function h264(kbps) {
  return [
    "-c:v", "libx264", "-threads", "4", "-preset", "veryfast", "-crf", "19", "-maxrate", kbps + "k",
    "-bufsize", kbps + "k", "-pix_fmt", "yuv420p", "-movflags", "+faststart"
  ];
}
const codec = {
  mp4: "h264",
  webm: "vp9",
  png: "png",
  jpg: "mjpeg"
};
async function verify(file, size, ext, seconds) {
  const {stdout} =
      await run("ffprobe", ["-v", "error", "-show_streams", "-show_format", "-of", "json", file]);
  const {streams, format} = JSON.parse(stdout), v = streams[0];
  if (streams.length !== 1 || v.codec_name !== codec[ext] || v.width !== size.width ||
      v.height !== size.height)
    throw Error("Wrong format or dimensions: " + file);
  if (ext === "webm" || ext === "mp4") {
    if (Math.abs(Number(format.duration) - seconds) > .05 || v.avg_frame_rate !== "24/1")
      throw Error("Incorrect loop timing: " + file);
  }
  const bytes = (await stat(file)).size;
  if (bytes <= 0 || bytes >= 25 * 1024 * 1024)
    throw Error("Wallpaper exceeds the release asset size limit: " + file);
  return bytes;
}
async function render(scene, layout, edition, plate) {
  const id = scene.id + edition.suffix, folder = join(scratch, layout.id, id);
  await mkdir(folder, {recursive: true});
  const done = join(folder, "verified.json");
  try {
    const saved = JSON.parse(await readFile(done, "utf8"));
    if ((await Promise.all(Object.entries(saved).map(
             async ([name, bytes]) => (await stat(join(folder, name))).size === bytes)))
            .every(Boolean))
      return saved;
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
  const output = (size, ext) => join(folder, wallpaperFilename(id, size.id, ext));
  const full = layout.sizes[0], seconds = scene.id === "flying-gear" ? 24 : 12;
  const records = {};
  for (const ext of ["png", "mp4"]) {
    await renderForeground({folder: plate, flight, layout: layout.id, artwork: edition.artwork,
      symbol: edition.symbol, flying: scene.id === "flying-gear", width: full.width, height: full.height,
      ext, output: output(full, ext)});
  }
  for (const size of layout.sizes) {
    if (size !== full) {
      await sharp(output(full, "png"))
          .resize(size.width, size.height, {fit: "cover"})
          .png()
          .toFile(output(size, "png"));
      await ffmpeg([
        "-threads", "3", "-i", output(full, "mp4"), "-vf",
        `scale=${size.width}:${size.height}:force_original_aspect_ratio=increase,crop=${size.width}:${
            size.height},setsar=1`,
        "-an", ...h264(size.label === "720p" ? 1400 : 2700), output(size, "mp4")
      ]);
    }
    await sharp(output(size, "png")).jpeg({quality: 92}).toFile(output(size, "jpg"));
    for (const ext of ["png", "jpg"]) {
      const path = output(size, ext);
      await writeFile(path, addStillUsageNotice(await readFile(path), ext, usage));
    }
    await ffmpeg([
      "-threads",
      "3",
      "-i",
      output(size, "mp4"),
      "-an",
      "-c:v",
      "libvpx-vp9",
      "-deadline",
      "realtime",
      "-cpu-used",
      "8",
      "-row-mt",
      "1",
      "-threads",
      "4",
      "-tile-columns",
      "2",
      "-b:v",
      size.label === "4K"       ? "3800k" :
          size.label === "720p" ? "1000k" :
                                  "1600k",
      "-crf",
      "29",
      "-g",
      "120",
      output(size, "webm")
    ]);
    for (const {extension} of wallpaperFormats)
      records[basename(output(size, extension))] =
          await verify(output(size, extension), size, extension, seconds);
  }
  await writeFile(done, JSON.stringify(records));
  console.log("Verified", layout.id, id, Object.keys(records).length, "downloads");
  return records;
}
const records = {};
for (const layout of layouts) {
  for (const artwork of ["original", "panorama"]) {
    const plate = await background(layout, artwork);
    const editions = wallpaperEditions.filter(edition => edition.artwork === artwork);
    for (const scene of wallpaperScenes) {
      await Promise.all(editions.map(async edition => {
        const files = await render(scene, layout, edition, plate);
        for (const [name, bytes] of Object.entries(files))
          records[name] = {bytes, path: join(scratch, layout.id, scene.id + edition.suffix, name)};
      }));
    }
  }
}
const desktopPoster = wallpaperFilename("landscape","1080p","jpg");
const offline = await packageOfflineWallpapers(resolve("."), scratch, records[desktopPoster]?.path);
for (const [name, bytes] of Object.entries(offline)) records[name] = {bytes,path: join(scratch,name)};
for (const [name, {path}] of Object.entries(records)) {
  const temporary = join(library, "." + name + ".prepared-" + process.pid);
  await link(path, temporary);
  await rename(temporary, join(library, name));
  // rename can be a no-op when both names already refer to the same inode.
  await unlink(temporary).catch(error => {
    if (error.code !== "ENOENT") throw error;
  });
}
const sizes = {
  ...existing,
  ...Object.fromEntries(Object.entries(records).map(([name, entry]) => [name, entry.bytes]))
};
await packageLayoutLoops(library, sizes, layouts);
console.log(
    "Installed", Object.keys(records).length, "verified images and videos with matching offline packages.");
